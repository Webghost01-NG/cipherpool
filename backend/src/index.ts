import { ethers } from "ethers";
import { createApp } from "./app.js";
import { verifyPoolDeployment } from "./config/deployment.js";
import { loadConfig } from "./config/env.js";
import { BlockchainIndexer } from "./indexer/indexer.js";
import { IndexerStore } from "./indexer/store.js";
import { KMSClient } from "./relayer/kms.js";
import { KMSRelayerService } from "./relayer/relayer.js";
import { defaultLogger } from "./utils/logger.js";

const POOL_ABI = [
  "event Deposited(address indexed user, uint256 indexed nonce, uint64 plainAmount, bytes32 indexed inputHandle)",
  "event WithdrawalRequested(address indexed user, uint256 indexed nonce, bytes32 indexed requestHash, uint64 requestedAmount, bytes32 handle)",
  "event WithdrawalFinalized(address indexed user, bytes32 indexed requestHash, uint64 cleartextAmount)",
  "event WithdrawalCancelled(address indexed user, bytes32 indexed requestHash)",
  "event DrawExecuted(uint256 indexed drawId, uint64 prizeAmount, uint256 timestamp, uint256 participantCount)",
];

async function main() {
  const config = loadConfig();
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  const evidence = await verifyPoolDeployment(provider, {
    chainId: config.CHAIN_ID,
    poolAddress: config.POOL_CONTRACT_ADDRESS,
    custodyAssetAddress: config.CUSTODY_ASSET_ADDRESS,
    poolRuntimeCodeHash: config.POOL_RUNTIME_CODE_HASH,
  });
  defaultLogger.info("Verified active pool deployment", {
    chainId: evidence.chainId,
    poolAddress: config.POOL_CONTRACT_ADDRESS,
    custodyAssetAddress: evidence.custodyAssetAddress,
    poolRuntimeCodeHash: evidence.poolRuntimeCodeHash,
  });

  const store = new IndexerStore();
  const indexer = new BlockchainIndexer(store);
  const kmsClient = new KMSClient(config.RPC_URL, config.RELAYER_URL);
  const relayer = new KMSRelayerService(store, kmsClient, {
    maxRetries: config.MAX_RETRIES,
    baseBackoffMs: 1000,
  });
  const readContract = new ethers.Contract(config.POOL_CONTRACT_ADDRESS, POOL_ABI, provider);
  let lastPolledBlock = config.INDEXER_START_BLOCK;

  const pollLogs = async () => {
    try {
      const currentBlock = await provider.getBlockNumber();
      if (currentBlock < lastPolledBlock) return;
      const queryToBlock = Math.min(
        currentBlock,
        lastPolledBlock + config.INDEXER_BLOCK_BATCH_SIZE - 1
      );
      const events = await readContract.queryFilter("*", lastPolledBlock, queryToBlock);
      const blockTimestamps = new Map<number, number>();
      for (const event of events) {
        if ("topics" in event && "data" in event) {
          let blockTimestamp = blockTimestamps.get(event.blockNumber);
          if (blockTimestamp === undefined) {
            const block = await provider.getBlock(event.blockNumber);
            if (!block) {
              throw new Error(`Unable to load block ${event.blockNumber} for indexed event`);
            }
            blockTimestamp = block.timestamp;
            blockTimestamps.set(event.blockNumber, blockTimestamp);
          }
          indexer.processLog({
            topics: event.topics,
            data: event.data,
            blockNumber: event.blockNumber,
            blockTimestamp,
            transactionHash: event.transactionHash,
          });
        }
      }
      lastPolledBlock = queryToBlock + 1;
    } catch (error) {
      defaultLogger.debug("Polling logs error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  await pollLogs();
  const pollInterval = setInterval(pollLogs, config.POLL_INTERVAL_MS);

  const app = createApp(store, relayer);
  const server = app.listen(config.PORT, () => {
    defaultLogger.info("CipherPool Backend Service started successfully", {
      port: config.PORT,
      nodeEnv: config.NODE_ENV,
      chainId: config.CHAIN_ID,
      poolAddress: config.POOL_CONTRACT_ADDRESS,
      withdrawalProofService: true,
    });
  });

  const gracefulShutdown = (signal: string) => {
    defaultLogger.info(`Received ${signal}. Gracefully shutting down HTTP server...`);
    clearInterval(pollInterval);
    server.close(() => {
      defaultLogger.info("HTTP server closed. Exiting process.");
      process.exit(0);
    });
  };
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  defaultLogger.error("Backend startup aborted: active deployment verification failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
