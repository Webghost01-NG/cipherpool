import { ethers } from "ethers";
import { createApp } from "./app.js";
import { verifyPoolDeployment } from "./config/deployment.js";
import { loadConfig } from "./config/env.js";
import { BlockchainIndexer } from "./indexer/indexer.js";
import { PostgresIndexerPersistence } from "./indexer/persistence.js";
import { IndexerStore } from "./indexer/store.js";
import { defaultLogger } from "./utils/logger.js";

const POOL_ABI = [
  "event Deposited(address indexed user, uint256 indexed nonce, bytes32 indexed encryptedAmountHandle)",
  "event Withdrawn(address indexed user, uint256 indexed nonce, bytes32 indexed encryptedAmountHandle)",
  "event PrizeReserveFunded(address indexed source, bytes32 indexed encryptedAmountHandle)",
  "event DrawExecuted(uint256 indexed drawId, bytes32 indexed requestHash, uint64 prizeAmount, uint64 totalWeight, uint64 remainingPrizeReserve, uint256 timestamp, uint256 participantCount)",
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

  const persistence = new PostgresIndexerPersistence(
    config.DATABASE_URL,
    `${config.CHAIN_ID}:${config.POOL_CONTRACT_ADDRESS.toLowerCase()}`
  );
  await persistence.initialize();
  const checkpoint = await persistence.load();
  const store = checkpoint ? IndexerStore.fromSnapshot(checkpoint.snapshot) : new IndexerStore();
  const indexer = new BlockchainIndexer(store);
  const readContract = new ethers.Contract(config.POOL_CONTRACT_ADDRESS, POOL_ABI, provider);
  let lastPolledBlock = checkpoint
    ? Math.max(config.INDEXER_START_BLOCK, checkpoint.nextBlockNumber)
    : config.INDEXER_START_BLOCK;
  defaultLogger.info(checkpoint ? "Restored durable indexer checkpoint" : "No durable checkpoint found; replaying from deployment block", {
    nextBlockNumber: lastPolledBlock,
  });

  const runPoll = async () => {
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
      const nextBlockNumber = queryToBlock + 1;
      await persistence.save(nextBlockNumber, store.toSnapshot());
      lastPolledBlock = nextBlockNumber;
    } catch (error) {
      defaultLogger.debug("Polling logs error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  let activePoll: Promise<void> | null = null;
  const pollLogs = () => {
    if (!activePoll) {
      activePoll = runPoll().finally(() => {
        activePoll = null;
      });
    }
    return activePoll;
  };

  await pollLogs();
  const pollInterval = setInterval(pollLogs, config.POLL_INTERVAL_MS);

  const app = createApp(store);
  const server = app.listen(config.PORT, () => {
    defaultLogger.info("CipherPool Backend Service started successfully", {
      port: config.PORT,
      nodeEnv: config.NODE_ENV,
      chainId: config.CHAIN_ID,
      poolAddress: config.POOL_CONTRACT_ADDRESS,
      confidentialCustodyIndexer: true,
    });
  });

  const gracefulShutdown = (signal: string) => {
    defaultLogger.info(`Received ${signal}. Gracefully shutting down HTTP server...`);
    clearInterval(pollInterval);
    server.close(async () => {
      try {
        await activePoll;
        await persistence.close();
        defaultLogger.info("HTTP server and database pool closed. Exiting process.");
        process.exit(0);
      } catch (error) {
        defaultLogger.error("Failed to close database pool cleanly", {
          error: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
      }
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
