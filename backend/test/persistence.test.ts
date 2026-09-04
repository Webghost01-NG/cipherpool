import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ethers } from "ethers";
import {
  DatabasePool,
  PostgresIndexerPersistence,
} from "../src/indexer/persistence.js";
import { IndexerStore, IndexerStoreSnapshot } from "../src/indexer/store.js";

class MemoryDatabasePool implements DatabasePool {
  public checkpoint: { namespace: string; nextBlockNumber: string; state: unknown } | null = null;
  public ended = false;
  public failWrites = false;

  public async query(text: string, values: unknown[] = []) {
    if (text.includes("SELECT next_block_number")) {
      if (!this.checkpoint || this.checkpoint.namespace !== values[0]) return { rows: [] };
      return {
        rows: [{
          next_block_number: this.checkpoint.nextBlockNumber,
          state: this.checkpoint.state,
        }],
      };
    }

    if (text.includes("INSERT INTO")) {
      if (this.failWrites) throw new Error("database unavailable");
      const nextBlockNumber = String(values[1]);
      if (!this.checkpoint || BigInt(nextBlockNumber) >= BigInt(this.checkpoint.nextBlockNumber)) {
        this.checkpoint = {
          namespace: String(values[0]),
          nextBlockNumber,
          state: JSON.parse(String(values[2])),
        };
      }
    }
    return { rows: [] };
  }

  public async end() {
    this.ended = true;
  }
}

function populatedStore() {
  const store = new IndexerStore();
  const alice = "0x1111111111111111111111111111111111111111";
  const bob = "0x2222222222222222222222222222222222222222";

  store.addDeposit({
    user: alice,
    nonce: 0n,
    encryptedAmountHandle: ethers.id("alice-deposit"),
    blockNumber: 100,
    transactionHash: "0xdeposit-alice",
  });
  store.addDeposit({
    user: bob,
    nonce: 0n,
    encryptedAmountHandle: ethers.id("bob-deposit"),
    blockNumber: 101,
    transactionHash: "0xdeposit-bob",
  });
  store.addConfidentialWithdrawal({
    user: alice,
    nonce: 1n,
    encryptedAmountHandle: ethers.id("alice-withdrawal"),
    blockNumber: 102,
    transactionHash: "0xwithdraw-alice",
  });
  store.addPrizeReserveFunding({
    source: bob,
    encryptedAmountHandle: ethers.id("reserve-funding"),
    blockNumber: 103,
    transactionHash: "0xreserve",
  });
  store.addDraw({
    drawId: 1n,
    requestHash: ethers.id("draw-request"),
    prizeAmount: 1_000n,
    timestamp: 1_700_000_106,
    participantCount: 2,
    blockNumber: 106,
    transactionHash: "0xdraw",
  });

  return { store, alice, bob };
}

describe("Indexer checkpoint persistence", () => {
  test("restores all indexed state without losing idempotency", () => {
    const { store, alice, bob } = populatedStore();
    const restored = IndexerStore.fromSnapshot(store.toSnapshot());

    assert.equal(restored.getUserDepositEventCount(alice), 1n);
    assert.equal(restored.getUserDepositEventCount(bob), 1n);
    assert.equal(restored.getTotalDepositEvents(), 2n);
    assert.equal(restored.getConfidentialWithdrawalCount(), 1n);
    assert.equal(restored.getPrizeReserveFundingCount(), 1n);
    assert.equal(restored.getDrawCount(), 1);
    assert.equal(restored.getLatestDraw()?.prizeAmount, 1_000n);
    assert.equal("totalWeight" in restored.getLatestDraw()!, false);
    assert.equal("remainingPrizeReserve" in restored.getLatestDraw()!, false);

    restored.addDeposit({
      user: alice,
      nonce: 0n,
      encryptedAmountHandle: ethers.id("alice-deposit"),
      blockNumber: 100,
      transactionHash: "0xdeposit-alice",
    });
    assert.equal(restored.getUserDepositEventCount(alice), 1n);
  });

  test("rejects an unsupported or malformed snapshot", () => {
    const valid = new IndexerStore().toSnapshot();
    assert.throws(() => IndexerStore.fromSnapshot({ ...valid, version: 2 }));
    assert.throws(() => IndexerStore.fromSnapshot({ ...valid, unknownAggregate: "1" }));
  });

  test("initializes, saves, reloads, and closes a checkpoint", async () => {
    const pool = new MemoryDatabasePool();
    const persistence = new PostgresIndexerPersistence(
      "postgresql://test:test@localhost:5432/test",
      "11155111:0xpool",
      pool
    );
    const snapshot = new IndexerStore().toSnapshot();

    await persistence.initialize();
    assert.equal(await persistence.load(), null);
    await persistence.save(123, snapshot);
    assert.deepEqual(await persistence.load(), { nextBlockNumber: 123, snapshot });
    await persistence.save(122, snapshot);
    assert.equal((await persistence.load())?.nextBlockNumber, 123);
    await persistence.close();
    assert.equal(pool.ended, true);
  });

  test("rejects corrupt persisted state and propagates failed writes", async () => {
    const pool = new MemoryDatabasePool();
    const persistence = new PostgresIndexerPersistence(
      "postgresql://test:test@localhost:5432/test",
      "11155111:0xpool",
      pool
    );
    pool.checkpoint = {
      namespace: "11155111:0xpool",
      nextBlockNumber: "123",
      state: { version: 1 },
    };
    await assert.rejects(persistence.load());

    pool.failWrites = true;
    await assert.rejects(
      persistence.save(124, new IndexerStore().toSnapshot()),
      /database unavailable/
    );
  });

  test("validates checkpoint block numbers before writing", async () => {
    const pool = new MemoryDatabasePool();
    const persistence = new PostgresIndexerPersistence(
      "postgresql://test:test@localhost:5432/test",
      "11155111:0xpool",
      pool
    );
    const snapshot: IndexerStoreSnapshot = new IndexerStore().toSnapshot();

    await assert.rejects(persistence.save(-1, snapshot), /non-negative safe integer/);
    await assert.rejects(
      persistence.save(Number.MAX_SAFE_INTEGER + 1, snapshot),
      /non-negative safe integer/
    );
  });
});
