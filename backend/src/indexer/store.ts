import {
  DepositedEvent,
  WithdrawalRequestedEvent,
  WithdrawalFinalizedEvent,
  WithdrawalCancelledEvent,
  DrawExecutedEvent,
} from "./types.js";
import { z } from "zod";

const unsignedIntegerSchema = z.string().regex(/^(0|[1-9][0-9]*)$/);
const indexedEventSchema = z.object({
  user: z.string().min(1),
  blockNumber: z.number().int().nonnegative(),
  transactionHash: z.string().min(1),
}).strict();

export const indexerStoreSnapshotSchema = z.object({
  version: z.literal(1),
  deposits: z.array(z.tuple([z.string().min(1), unsignedIntegerSchema])),
  totalAccountedBalance: unsignedIntegerSchema,
  withdrawals: z.array(indexedEventSchema.extend({
    nonce: unsignedIntegerSchema,
    requestHash: z.string().min(1),
    requestedAmount: unsignedIntegerSchema,
    handle: z.string().min(1),
    timestamp: z.number().int().positive(),
    status: z.enum(["PENDING", "FINALIZED", "CANCELLED"]),
  }).strict()),
  finalizedWithdrawals: z.array(indexedEventSchema.extend({
    requestHash: z.string().min(1),
    cleartextAmount: unsignedIntegerSchema,
  }).strict()),
  cancelledWithdrawalHashes: z.array(z.string().min(1)),
  draws: z.array(z.object({
    drawId: unsignedIntegerSchema,
    prizeAmount: unsignedIntegerSchema,
    timestamp: z.number().int().positive(),
    participantCount: z.number().int().nonnegative(),
    blockNumber: z.number().int().nonnegative(),
    transactionHash: z.string().min(1),
  }).strict()),
  seenEventKeys: z.array(z.string().min(1)),
}).strict();

export type IndexerStoreSnapshot = z.infer<typeof indexerStoreSnapshotSchema>;

export function parseIndexerStoreSnapshot(value: unknown): IndexerStoreSnapshot {
  return indexerStoreSnapshotSchema.parse(value);
}

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

  public static fromSnapshot(value: unknown): IndexerStore {
    const snapshot = parseIndexerStoreSnapshot(value);
    const store = new IndexerStore();

    store.deposits = new Map(snapshot.deposits.map(([user, amount]) => [user, BigInt(amount)]));
    store.totalAccountedBalance = BigInt(snapshot.totalAccountedBalance);
    for (const serialized of snapshot.withdrawals) {
      const withdrawal: WithdrawalRequestedEvent = {
        ...serialized,
        nonce: BigInt(serialized.nonce),
        requestedAmount: BigInt(serialized.requestedAmount),
      };
      store.pendingWithdrawalsByHash.set(withdrawal.requestHash, withdrawal);
      if (withdrawal.status === "PENDING") {
        store.pendingWithdrawalsByUser.set(withdrawal.user.toLowerCase(), withdrawal);
      }
    }
    for (const serialized of snapshot.finalizedWithdrawals) {
      store.finalizedWithdrawals.set(serialized.requestHash, {
        ...serialized,
        cleartextAmount: BigInt(serialized.cleartextAmount),
      });
    }
    store.cancelledWithdrawals = new Set(snapshot.cancelledWithdrawalHashes);
    store.draws = snapshot.draws.map((draw) => ({
      ...draw,
      drawId: BigInt(draw.drawId),
      prizeAmount: BigInt(draw.prizeAmount),
    }));
    store.seenTxHashes = new Set(snapshot.seenEventKeys);
    return store;
  }

  public toSnapshot(): IndexerStoreSnapshot {
    return {
      version: 1,
      deposits: Array.from(this.deposits, ([user, amount]) => [user, amount.toString()]),
      totalAccountedBalance: this.totalAccountedBalance.toString(),
      withdrawals: Array.from(this.pendingWithdrawalsByHash.values(), (withdrawal) => ({
        ...withdrawal,
        nonce: withdrawal.nonce.toString(),
        requestedAmount: withdrawal.requestedAmount.toString(),
      })),
      finalizedWithdrawals: Array.from(this.finalizedWithdrawals.values(), (withdrawal) => ({
        ...withdrawal,
        cleartextAmount: withdrawal.cleartextAmount.toString(),
      })),
      cancelledWithdrawalHashes: Array.from(this.cancelledWithdrawals),
      draws: this.draws.map((draw) => ({
        ...draw,
        drawId: draw.drawId.toString(),
        prizeAmount: draw.prizeAmount.toString(),
      })),
      seenEventKeys: Array.from(this.seenTxHashes),
    };
  }

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
