import { z } from "zod";
import {
  DepositedEvent,
  DrawExecutedEvent,
  PrizeReserveFundedEvent,
  WithdrawnEvent,
} from "./types.js";

const unsignedIntegerSchema = z.string().regex(/^(0|[1-9][0-9]*)$/);

export const indexerStoreSnapshotSchema = z.object({
  version: z.literal(3),
  depositEventCounts: z.array(z.tuple([z.string().min(1), unsignedIntegerSchema])),
  confidentialWithdrawalCount: unsignedIntegerSchema,
  prizeReserveFundingCount: unsignedIntegerSchema,
  draws: z.array(z.object({
    drawId: unsignedIntegerSchema,
    requestHash: z.string().min(1),
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
  public lastIndexedBlock = 0;
  private depositEventCounts = new Map<string, bigint>();
  private confidentialWithdrawalCount = 0n;
  private prizeReserveFundingCount = 0n;
  private draws: DrawExecutedEvent[] = [];
  private seenEventKeys = new Set<string>();

  public static fromSnapshot(value: unknown): IndexerStore {
    const snapshot = parseIndexerStoreSnapshot(value);
    const store = new IndexerStore();
    store.depositEventCounts = new Map(
      snapshot.depositEventCounts.map(([user, count]) => [user, BigInt(count)])
    );
    store.confidentialWithdrawalCount = BigInt(snapshot.confidentialWithdrawalCount);
    store.prizeReserveFundingCount = BigInt(snapshot.prizeReserveFundingCount);
    store.draws = snapshot.draws.map((draw) => ({
      ...draw,
      drawId: BigInt(draw.drawId),
      prizeAmount: BigInt(draw.prizeAmount),
    }));
    store.seenEventKeys = new Set(snapshot.seenEventKeys);
    return store;
  }

  public toSnapshot(): IndexerStoreSnapshot {
    return {
      version: 3,
      depositEventCounts: Array.from(
        this.depositEventCounts,
        ([user, count]) => [user, count.toString()]
      ),
      confidentialWithdrawalCount: this.confidentialWithdrawalCount.toString(),
      prizeReserveFundingCount: this.prizeReserveFundingCount.toString(),
      draws: this.draws.map((draw) => ({
        ...draw,
        drawId: draw.drawId.toString(),
        prizeAmount: draw.prizeAmount.toString(),
      })),
      seenEventKeys: Array.from(this.seenEventKeys),
    };
  }

  public addDeposit(event: DepositedEvent) {
    const key = `${event.transactionHash}-deposit-${event.nonce}`;
    if (this.seenEventKeys.has(key)) return;
    this.seenEventKeys.add(key);

    const user = event.user.toLowerCase();
    this.depositEventCounts.set(user, (this.depositEventCounts.get(user) ?? 0n) + 1n);
  }

  public addConfidentialWithdrawal(event: WithdrawnEvent) {
    const key = `${event.transactionHash}-withdraw-${event.nonce}`;
    if (this.seenEventKeys.has(key)) return;
    this.seenEventKeys.add(key);
    this.confidentialWithdrawalCount += 1n;
  }

  public addPrizeReserveFunding(event: PrizeReserveFundedEvent) {
    const key = `${event.transactionHash}-reserve`;
    if (this.seenEventKeys.has(key)) return;
    this.seenEventKeys.add(key);
    this.prizeReserveFundingCount += 1n;
  }

  public addDraw(event: DrawExecutedEvent) {
    const key = `${event.transactionHash}-draw-${event.drawId}`;
    if (this.seenEventKeys.has(key)) return;
    this.seenEventKeys.add(key);
    this.draws.push(event);
  }

  public getUserDepositEventCount(user: string): bigint {
    return this.depositEventCounts.get(user.toLowerCase()) ?? 0n;
  }

  public getTotalDepositEvents(): bigint {
    let total = 0n;
    for (const count of this.depositEventCounts.values()) total += count;
    return total;
  }

  public getConfidentialWithdrawalCount(): bigint {
    return this.confidentialWithdrawalCount;
  }

  public getPrizeReserveFundingCount(): bigint {
    return this.prizeReserveFundingCount;
  }

  public getDrawCount(): number {
    return this.draws.length;
  }

  public getLatestDraw(): DrawExecutedEvent | undefined {
    return this.draws.at(-1);
  }
}
