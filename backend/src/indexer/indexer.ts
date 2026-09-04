import { Interface, Log } from "ethers";
import { IndexerStore } from "./store.js";
import { Logger } from "../utils/logger.js";

const POOL_EVENTS_ABI = [
  "event Deposited(address indexed user, uint256 indexed nonce, bytes32 indexed encryptedAmountHandle)",
  "event Withdrawn(address indexed user, uint256 indexed nonce, bytes32 indexed encryptedAmountHandle)",
  "event PrizeReserveFunded(address indexed source, bytes32 indexed encryptedAmountHandle)",
  "event DrawSkipped(bytes32 indexed requestHash, uint64 totalWeight, uint64 prizeReserve, uint64 requiredPrizeAmount, uint256 timestamp)",
  "event DrawExecuted(uint256 indexed drawId, bytes32 indexed requestHash, uint64 prizeAmount, uint64 totalWeight, uint64 remainingPrizeReserve, uint256 timestamp, uint256 participantCount)",
];

export class BlockchainIndexer {
  private iface: Interface;
  public store: IndexerStore;
  private logger: Logger;

  constructor(store: IndexerStore = new IndexerStore()) {
    this.iface = new Interface(POOL_EVENTS_ABI);
    this.store = store;
    this.logger = new Logger("BlockchainIndexer");
  }

  public processLog(log: {
    topics: readonly string[];
    data: string;
    blockNumber: number;
    blockTimestamp: number;
    transactionHash: string;
  }) {
    try {
      const parsed = this.iface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });

      if (!parsed) return;

      switch (parsed.name) {
        case "Deposited": {
          this.store.addDeposit({
            user: parsed.args.user,
            nonce: BigInt(parsed.args.nonce),
            encryptedAmountHandle: parsed.args.encryptedAmountHandle,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          });
          this.logger.info("Indexed confidential deposit", { user: parsed.args.user });
          break;
        }
        case "Withdrawn": {
          this.store.addConfidentialWithdrawal({
            user: parsed.args.user,
            nonce: BigInt(parsed.args.nonce),
            encryptedAmountHandle: parsed.args.encryptedAmountHandle,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          });
          this.logger.info("Indexed confidential withdrawal", { user: parsed.args.user });
          break;
        }
        case "PrizeReserveFunded": {
          this.store.addPrizeReserveFunding({
            source: parsed.args.source,
            encryptedAmountHandle: parsed.args.encryptedAmountHandle,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          });
          this.logger.info("Indexed confidential prize reserve funding", { source: parsed.args.source });
          break;
        }
        case "DrawExecuted": {
          this.store.addDraw({
            drawId: BigInt(parsed.args.drawId),
            requestHash: parsed.args.requestHash,
            prizeAmount: BigInt(parsed.args.prizeAmount),
            totalWeight: BigInt(parsed.args.totalWeight),
            remainingPrizeReserve: BigInt(parsed.args.remainingPrizeReserve),
            timestamp: Number(parsed.args.timestamp),
            participantCount: Number(parsed.args.participantCount),
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          });
          this.logger.info("Indexed DrawExecuted event", { drawId: parsed.args.drawId.toString() });
          break;
        }
        case "DrawSkipped": {
          this.logger.info("Indexed DrawSkipped event", { requestHash: parsed.args.requestHash });
          break;
        }
      }
    } catch (err: unknown) {
      this.logger.warn("Failed to parse log entry", { error: err instanceof Error ? err.message : String(err) });
    }
  }
}
