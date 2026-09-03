import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { defaultLogger } from "./utils/logger.js";
import { IndexerStore } from "./indexer/store.js";
import { BlockchainIndexer } from "./indexer/indexer.js";
import { KMSClient } from "./relayer/kms.js";
import { KMSRelayerService } from "./relayer/relayer.js";
import { ethers } from "ethers";

const config = loadConfig();
const store = new IndexerStore();
const indexer = new BlockchainIndexer(store);
const kmsClient = new KMSClient(config.RPC_URL, config.RELAYER_URL);

// Contract events consumed by the indexer
const POOL_ABI = [
  "event Deposited(address indexed user, uint256 indexed nonce, uint64 plainAmount, bytes32 indexed inputHandle)",
  "event WithdrawalRequested(address indexed user, uint256 indexed nonce, bytes32 indexed requestHash, uint64 requestedAmount, bytes32 handle)",
  "event WithdrawalFinalized(address indexed user, bytes32 indexed requestHash, uint64 cleartextAmount)",
  "event WithdrawalCancelled(address indexed user, bytes32 indexed requestHash)",
  "event DrawExecuted(uint256 indexed drawId, uint64 prizeAmount, uint256 timestamp, uint256 participantCount)",
];

// Initialize the read-only Sepolia provider
let provider: ethers.JsonRpcProvider | null = null;

try {
  provider = new ethers.JsonRpcProvider(config.RPC_URL);
} catch (err: unknown) {
  defaultLogger.warn("Failed to initialize blockchain provider", {
    error: err instanceof Error ? err.message : String(err),
  });
}

const relayer = new KMSRelayerService(store, kmsClient, {
  maxRetries: config.MAX_RETRIES,
  baseBackoffMs: 1000,
});

// Setup event listener if provider is reachable
let pollInterval: NodeJS.Timeout | null = null;
if (provider && ethers.isAddress(config.POOL_CONTRACT_ADDRESS) && config.POOL_CONTRACT_ADDRESS !== ethers.ZeroAddress) {
  const readContract = new ethers.Contract(config.POOL_CONTRACT_ADDRESS, POOL_ABI, provider);
  let lastPolledBlock = config.INDEXER_START_BLOCK;

  const pollLogs = async () => {
    try {
      if (!provider) return;
      const currentBlock = await provider.getBlockNumber();
      if (currentBlock >= lastPolledBlock) {
        const queryToBlock = Math.min(
          currentBlock,
          lastPolledBlock + config.INDEXER_BLOCK_BATCH_SIZE - 1
        );
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
    withdrawalProofService: true,
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
