import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { defaultLogger } from "./utils/logger.js";
import { IndexerStore } from "./indexer/store.js";
import { BlockchainIndexer } from "./indexer/indexer.js";
import { KMSClient } from "./relayer/kms.js";
import { KMSRelayerService, IContractSubmitter } from "./relayer/relayer.js";
import { ethers } from "ethers";

const store = new IndexerStore();
const indexer = new BlockchainIndexer(store);
const kmsClient = new KMSClient(config.KMS_GATEWAY_URL);

// Contract ABI for finalization
const POOL_ABI = [
  "function finalizeWithdrawal(uint64 cleartextAmount, bytes calldata decryptionProof) external",
  "event Deposited(address indexed user, uint256 indexed nonce, uint64 plainAmount, bytes32 indexed inputHandle)",
  "event WithdrawalRequested(address indexed user, uint256 indexed nonce, bytes32 indexed requestHash, uint64 requestedAmount, bytes32 handle)",
  "event WithdrawalFinalized(address indexed user, bytes32 indexed requestHash, uint64 cleartextAmount)",
  "event WithdrawalCancelled(address indexed user, bytes32 indexed requestHash)",
  "event DrawExecuted(uint256 indexed drawId, uint64 prizeAmount, uint256 timestamp, uint256 participantCount)",
];

// Initialize Contract Submitter
let provider: ethers.JsonRpcProvider | null = null;
let relayerWallet: ethers.Wallet | null = null;
let poolContract: ethers.Contract | null = null;

try {
  provider = new ethers.JsonRpcProvider(config.RPC_URL);
  if (config.RELAYER_PRIVATE_KEY) {
    relayerWallet = new ethers.Wallet(config.RELAYER_PRIVATE_KEY, provider);
    poolContract = new ethers.Contract(config.POOL_CONTRACT_ADDRESS, POOL_ABI, relayerWallet);
  }
} catch (err: unknown) {
  defaultLogger.warn("Failed to initialize blockchain provider or relayer wallet", {
    error: err instanceof Error ? err.message : String(err),
  });
}

const submitter: IContractSubmitter = {
  async finalizeWithdrawal(cleartext: bigint, proof: string): Promise<string> {
    if (!poolContract || !relayerWallet) {
      throw new Error("Relayer wallet or contract not initialized");
    }
    const tx = await poolContract.finalizeWithdrawal(cleartext, proof);
    const receipt = await tx.wait();
    return receipt.hash;
  },
};

const relayer = new KMSRelayerService(store, kmsClient, submitter, {
  maxRetries: config.MAX_RETRIES,
  baseBackoffMs: 1000,
});

// Automatically trigger relayer when withdrawal is requested
indexer.setOnWithdrawalRequested((hash) => {
  relayer.processRequest(hash).catch((err) => {
    defaultLogger.error("Error auto-processing withdrawal request", { hash, error: String(err) });
  });
});

// Setup event listener if provider is reachable
let pollInterval: NodeJS.Timeout | null = null;
if (provider && ethers.isAddress(config.POOL_CONTRACT_ADDRESS) && config.POOL_CONTRACT_ADDRESS !== ethers.ZeroAddress) {
  const readContract = new ethers.Contract(config.POOL_CONTRACT_ADDRESS, POOL_ABI, provider);
  let lastPolledBlock = 0;

  const pollLogs = async () => {
    try {
      if (!provider) return;
      const currentBlock = await provider.getBlockNumber();
      if (lastPolledBlock === 0) {
        lastPolledBlock = Math.max(0, currentBlock - 5);
      }
      if (currentBlock >= lastPolledBlock) {
        // Enforce max 5 blocks per query to respect RPC free-tier limits
        const queryToBlock = Math.min(currentBlock, lastPolledBlock + 5);
        const events = await readContract.queryFilter("*", lastPolledBlock, queryToBlock);
        for (const ev of events) {
          if ("topics" in ev && "data" in ev) {
            indexer.processLog({
              topics: ev.topics,
              data: ev.data,
              blockNumber: ev.blockNumber,
              transactionHash: ev.transactionHash,
            });
          }
        }
        lastPolledBlock = queryToBlock + 1;
      }
    } catch (err: unknown) {
      defaultLogger.debug("Polling logs error (RPC or contract may be offline)", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  pollInterval = setInterval(pollLogs, config.POLL_INTERVAL_MS);
  pollLogs().catch(() => {});
}

const app = createApp(store, relayer);

const server = app.listen(config.PORT, () => {
  defaultLogger.info(`CipherPool Backend Service started successfully`, {
    port: config.PORT,
    nodeEnv: config.NODE_ENV,
    chainId: config.CHAIN_ID,
    poolAddress: config.POOL_CONTRACT_ADDRESS,
    hasRelayerWallet: !!relayerWallet,
  });
});

function gracefulShutdown(signal: string) {
  defaultLogger.info(`Received ${signal}. Gracefully shutting down HTTP server...`);
  if (pollInterval) clearInterval(pollInterval);
  server.close(() => {
    defaultLogger.info("HTTP server closed. Exiting process.");
    process.exit(0);
  });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
