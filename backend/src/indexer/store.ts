import {
  DepositedEvent,
  WithdrawalRequestedEvent,
  WithdrawalFinalizedEvent,
  WithdrawalCancelledEvent,
  DrawExecutedEvent,
} from "./types.js";

export class IndexerStore {
  public lastIndexedBlock: number = 0;
  private deposits: Map<string, bigint> = new Map();
  private pendingWithdrawalsByUser: Map<string, WithdrawalRequestedEvent> = new Map();
  private pendingWithdrawalsByHash: Map<string, WithdrawalRequestedEvent> = new Map();
  private finalizedWithdrawals: Map<string, WithdrawalFinalizedEvent> = new Map();
  private cancelledWithdrawals: Set<string> = new Set();
  private draws: DrawExecutedEvent[] = [];
  private seenTxHashes: Set<string> = new Set();

  public addDeposit(event: DepositedEvent) {
    const key = `${event.transactionHash}-${event.nonce}`;
    if (this.seenTxHashes.has(key)) return;
    this.seenTxHashes.add(key);

    const current = this.deposits.get(event.user.toLowerCase()) || 0n;
    this.deposits.set(event.user.toLowerCase(), current + event.plainAmount);
  }

  public addWithdrawalRequest(event: WithdrawalRequestedEvent) {
    if (this.pendingWithdrawalsByHash.has(event.requestHash)) return;

    this.pendingWithdrawalsByHash.set(event.requestHash, event);
    this.pendingWithdrawalsByUser.set(event.user.toLowerCase(), event);
  }

  public finalizeWithdrawal(event: WithdrawalFinalizedEvent) {
    const pending = this.pendingWithdrawalsByHash.get(event.requestHash);
    if (pending) {
      pending.status = "FINALIZED";
      this.pendingWithdrawalsByUser.delete(event.user.toLowerCase());
    }
    this.finalizedWithdrawals.set(event.requestHash, event);
  }

  public cancelWithdrawal(event: WithdrawalCancelledEvent) {
    const pending = this.pendingWithdrawalsByHash.get(event.requestHash);
    if (pending) {
      pending.status = "CANCELLED";
      this.pendingWithdrawalsByUser.delete(event.user.toLowerCase());
    }
    this.cancelledWithdrawals.add(event.requestHash);
  }

  public addDraw(event: DrawExecutedEvent) {
    this.draws.push(event);
  }

  public getPendingWithdrawalByUser(user: string): WithdrawalRequestedEvent | undefined {
    return this.pendingWithdrawalsByUser.get(user.toLowerCase());
  }

  public getPendingWithdrawalByHash(hash: string): WithdrawalRequestedEvent | undefined {
    return this.pendingWithdrawalsByHash.get(hash);
  }

  public getAllPendingWithdrawals(): WithdrawalRequestedEvent[] {
    return Array.from(this.pendingWithdrawalsByUser.values()).filter(
      (w) => w.status === "PENDING"
    );
  }

  public getUserDeposit(user: string): bigint {
    return this.deposits.get(user.toLowerCase()) || 0n;
  }

  public getTotalDeposits(): bigint {
    let total = 0n;
    for (const val of this.deposits.values()) {
      total += val;
    }
    return total;
  }

  public getDrawCount(): number {
    return this.draws.length;
  }

  public getLatestDraw(): DrawExecutedEvent | undefined {
    return this.draws.length > 0 ? this.draws[this.draws.length - 1] : undefined;
  }
}
