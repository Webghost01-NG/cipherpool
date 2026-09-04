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
  const finalizedHash = ethers.id("finalized");
  const cancelledHash = ethers.id("cancelled");

  store.addDeposit({
    user: alice,
    nonce: 0n,
    plainAmount: 50_000n,
    inputHandle: ethers.id("alice-deposit"),
    blockNumber: 100,
    transactionHash: "0xdeposit-alice",
  });
  store.addDeposit({
    user: bob,
    nonce: 0n,
    plainAmount: 25_000n,
    inputHandle: ethers.id("bob-deposit"),
    blockNumber: 101,
    transactionHash: "0xdeposit-bob",
  });
  store.addWithdrawalRequest({
    user: alice,
    nonce: 1n,
    requestHash: finalizedHash,
    requestedAmount: 10_000n,
    handle: ethers.id("finalized-handle"),
    blockNumber: 102,
    transactionHash: "0xrequest-finalized",
    timestamp: 1_700_000_102,
    status: "PENDING",
  });
  store.finalizeWithdrawal({
    user: alice,
    requestHash: finalizedHash,
    cleartextAmount: 10_000n,
    blockNumber: 103,
    transactionHash: "0xfinalized",
  });
  store.addWithdrawalRequest({
    user: bob,
    nonce: 1n,
    requestHash: cancelledHash,
    requestedAmount: 5_000n,
    handle: ethers.id("cancelled-handle"),
    blockNumber: 104,
    transactionHash: "0xrequest-cancelled",
    timestamp: 1_700_000_104,
    status: "PENDING",
  });
  store.cancelWithdrawal({
    user: bob,
    requestHash: cancelledHash,
    blockNumber: 105,
    transactionHash: "0xcancelled",
  });
  store.addDraw({
    drawId: 1n,
    prizeAmount: 1_000n,
    timestamp: 1_700_000_106,
    participantCount: 2,
    blockNumber: 106,
    transactionHash: "0xdraw",
  });

  return { store, alice, bob, finalizedHash, cancelledHash };
}

describe("Indexer checkpoint persistence", () => {
  test("restores all indexed state without losing idempotency", () => {
    const { store, alice, bob, finalizedHash, cancelledHash } = populatedStore();
    const restored = IndexerStore.fromSnapshot(store.toSnapshot());

    assert.equal(restored.getUserDeposit(alice), 40_000n);
    assert.equal(restored.getUserDeposit(bob), 25_000n);
    assert.equal(restored.getTotalAccountedBalance(), 66_000n);
    assert.equal(restored.getPendingWithdrawalByHash(finalizedHash)?.status, "FINALIZED");
    assert.equal(restored.getPendingWithdrawalByHash(cancelledHash)?.status, "CANCELLED");
    assert.equal(restored.getAllPendingWithdrawals().length, 0);
    assert.equal(restored.getDrawCount(), 1);
    assert.equal(restored.getLatestDraw()?.prizeAmount, 1_000n);

    restored.finalizeWithdrawal({
      user: alice,
      requestHash: finalizedHash,
      cleartextAmount: 10_000n,
      blockNumber: 103,
      transactionHash: "0xfinalized",
    });
    assert.equal(restored.getUserDeposit(alice), 40_000n);
  });

  test("rejects an unsupported or malformed snapshot", () => {
    const valid = new IndexerStore().toSnapshot();
    assert.throws(() => IndexerStore.fromSnapshot({ ...valid, version: 2 }));
    assert.throws(() => IndexerStore.fromSnapshot({ ...valid, totalAccountedBalance: "-1" }));
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
