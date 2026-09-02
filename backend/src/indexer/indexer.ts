import { Interface, Log } from "ethers";
import { IndexerStore } from "./store.js";
import { Logger } from "../utils/logger.js";

const POOL_EVENTS_ABI = [
  "event Deposited(address indexed user, uint256 indexed nonce, uint64 plainAmount, bytes32 indexed inputHandle)",
  "event WithdrawalRequested(address indexed user, uint256 indexed nonce, bytes32 indexed requestHash, uint64 requestedAmount, bytes32 handle)",
  "event WithdrawalFinalized(address indexed user, bytes32 indexed requestHash, uint64 cleartextAmount)",
  "event WithdrawalCancelled(address indexed user, bytes32 indexed requestHash)",
  "event DrawExecuted(uint256 indexed drawId, uint64 prizeAmount, uint256 timestamp, uint256 participantCount)",
];

export class BlockchainIndexer {
  private iface: Interface;
  public store: IndexerStore;
  private logger: Logger;
  private onWithdrawalRequestedCallback?: (hash: string) => void;

  constructor(store: IndexerStore = new IndexerStore()) {
    this.iface = new Interface(POOL_EVENTS_ABI);
    this.store = store;
    this.logger = new Logger("BlockchainIndexer");
  }

  public setOnWithdrawalRequested(cb: (hash: string) => void) {
    this.onWithdrawalRequestedCallback = cb;
  }

  public processLog(log: {
    topics: readonly string[];
    data: string;
    blockNumber: number;
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
            plainAmount: BigInt(parsed.args.plainAmount),
            inputHandle: parsed.args.inputHandle,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          });
          this.logger.info("Indexed Deposited event", { user: parsed.args.user, amount: parsed.args.plainAmount.toString() });
          break;
        }
        case "WithdrawalRequested": {
          const req = {
            user: parsed.args.user,
            nonce: BigInt(parsed.args.nonce),
            requestHash: parsed.args.requestHash,
            requestedAmount: BigInt(parsed.args.requestedAmount),
            handle: parsed.args.handle,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            timestamp: Math.floor(Date.now() / 1000),
            status: "PENDING" as const,
          };
          this.store.addWithdrawalRequest(req);
          this.logger.info("Indexed WithdrawalRequested event", { user: req.user, hash: req.requestHash });
          if (this.onWithdrawalRequestedCallback) {
            this.onWithdrawalRequestedCallback(req.requestHash);
          }
          break;
        }
        case "WithdrawalFinalized": {
          this.store.finalizeWithdrawal({
            user: parsed.args.user,
            requestHash: parsed.args.requestHash,
            cleartextAmount: BigInt(parsed.args.cleartextAmount),
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          });
          this.logger.info("Indexed WithdrawalFinalized event", { user: parsed.args.user, hash: parsed.args.requestHash });
          break;
        }
        case "WithdrawalCancelled": {
          this.store.cancelWithdrawal({
            user: parsed.args.user,
            requestHash: parsed.args.requestHash,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          });
          this.logger.info("Indexed WithdrawalCancelled event", { user: parsed.args.user, hash: parsed.args.requestHash });
          break;
        }
        case "DrawExecuted": {
          this.store.addDraw({
            drawId: BigInt(parsed.args.drawId),
            prizeAmount: BigInt(parsed.args.prizeAmount),
            timestamp: Number(parsed.args.timestamp),
            participantCount: Number(parsed.args.participantCount),
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          });
          this.logger.info("Indexed DrawExecuted event", { drawId: parsed.args.drawId.toString() });
          break;
        }
      }
    } catch (err: unknown) {
      this.logger.warn("Failed to parse log entry", { error: err instanceof Error ? err.message : String(err) });
    }
  }
}
