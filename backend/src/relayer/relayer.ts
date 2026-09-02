import { IndexerStore } from "../indexer/store.js";
import { IKMSClient, DecryptionResult } from "./kms.js";
import { Logger } from "../utils/logger.js";

export interface IContractSubmitter {
  finalizeWithdrawal(cleartext: bigint, proof: string): Promise<string>;
}

export class KMSRelayerService {
  private store: IndexerStore;
  private kmsClient: IKMSClient;
  private submitter: IContractSubmitter;
  private logger: Logger;
  private inFlight: Set<string> = new Set();
  public maxRetries: number;
  public baseBackoffMs: number;

  constructor(
    store: IndexerStore,
    kmsClient: IKMSClient,
    submitter: IContractSubmitter,
    options: { maxRetries?: number; baseBackoffMs?: number } = {}
  ) {
    this.store = store;
    this.kmsClient = kmsClient;
    this.submitter = submitter;
    this.logger = new Logger("KMSRelayerService");
    this.maxRetries = options.maxRetries ?? 3;
    this.baseBackoffMs = options.baseBackoffMs ?? 50;
  }

  public isInFlight(requestHash: string): boolean {
    return this.inFlight.has(requestHash);
  }

  public async processRequest(requestHash: string): Promise<boolean> {
    const req = this.store.getPendingWithdrawalByHash(requestHash);
    if (!req || req.status !== "PENDING") {
      this.logger.debug("Request not found or not pending", { requestHash });
      return false;
    }

    // Idempotency check: prevent duplicate concurrent processing
    if (this.inFlight.has(requestHash)) {
      this.logger.warn("Request is already in flight. Suppressing duplicate execution.", { requestHash });
      return false;
    }

    this.inFlight.add(requestHash);
    this.logger.info("Initiating automated KMS relayer settlement", {
      requestHash,
      user: req.user,
      amount: req.requestedAmount.toString(),
    });

    try {
      let result: DecryptionResult | undefined;
      let attempt = 0;

      while (attempt < this.maxRetries) {
        attempt++;
        try {
          result = await this.kmsClient.fetchDecryptionProof(req.handle);
          break;
        } catch (err: unknown) {
          this.logger.warn(`KMS retrieval failed on attempt ${attempt}/${this.maxRetries}`, {
            error: err instanceof Error ? err.message : String(err),
          });
          if (attempt >= this.maxRetries) {
            throw err;
          }
          const backoff = this.baseBackoffMs * 2 ** (attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }

      if (!result) {
        throw new Error("Failed to retrieve valid decryption proof from KMS");
      }

      // Submit on-chain finalization transaction
      const txHash = await this.submitter.finalizeWithdrawal(result.cleartext, result.proof);
      this.logger.info("Successfully broadcast finalizeWithdrawal transaction", {
        requestHash,
        txHash,
        cleartext: result.cleartext.toString(),
      });

      return true;
    } catch (err: unknown) {
      this.logger.error("Terminal failure processing withdrawal request", {
        requestHash,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    } finally {
      this.inFlight.delete(requestHash);
    }
  }

  public async processAllPending(): Promise<number> {
    const pending = this.store.getAllPendingWithdrawals();
    let processed = 0;

    for (const req of pending) {
      const success = await this.processRequest(req.requestHash);
      if (success) processed++;
    }

    return processed;
  }
}
