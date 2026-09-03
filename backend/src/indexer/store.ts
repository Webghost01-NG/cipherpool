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
  private totalAccountedBalance: bigint = 0n;
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
    this.totalAccountedBalance += event.plainAmount;
  }

  public addWithdrawalRequest(event: WithdrawalRequestedEvent) {
    if (this.pendingWithdrawalsByHash.has(event.requestHash)) return;

    this.pendingWithdrawalsByHash.set(event.requestHash, event);
    this.pendingWithdrawalsByUser.set(event.user.toLowerCase(), event);
  }

  public finalizeWithdrawal(event: WithdrawalFinalizedEvent) {
    if (this.finalizedWithdrawals.has(event.requestHash)) return;

    const pending = this.pendingWithdrawalsByHash.get(event.requestHash);
    if (pending) {
      pending.status = "FINALIZED";
      this.pendingWithdrawalsByUser.delete(event.user.toLowerCase());
    }
    if (event.cleartextAmount > 0n) {
      const userKey = event.user.toLowerCase();
      const currentDeposit = this.deposits.get(userKey) ?? 0n;
      this.deposits.set(
        userKey,
        event.cleartextAmount >= currentDeposit ? 0n : currentDeposit - event.cleartextAmount
      );
      this.totalAccountedBalance =
        event.cleartextAmount >= this.totalAccountedBalance
          ? 0n
          : this.totalAccountedBalance - event.cleartextAmount;
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
    const key = `${event.transactionHash}-draw-${event.drawId}`;
    if (this.seenTxHashes.has(key)) return;
    this.seenTxHashes.add(key);

    this.draws.push(event);
    this.totalAccountedBalance += event.prizeAmount;
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

  public getTotalAccountedBalance(): bigint {
    return this.totalAccountedBalance;
  }

  public getDrawCount(): number {
    return this.draws.length;
  }

  public getLatestDraw(): DrawExecutedEvent | undefined {
    return this.draws.length > 0 ? this.draws[this.draws.length - 1] : undefined;
  }
}
