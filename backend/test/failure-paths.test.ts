import { test, describe } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { Interface, ethers } from "ethers";
import { createApp } from "../src/app.js";
import { BlockchainIndexer } from "../src/indexer/indexer.js";
import { IndexerStore } from "../src/indexer/store.js";

const POOL_EVENTS_ABI = [
  "event Deposited(address indexed user, uint256 indexed nonce, bytes32 indexed encryptedAmountHandle)",
];

describe("Backend Failure Paths, Retries & State Recovery Tests", () => {
  const iface = new Interface(POOL_EVENTS_ABI);
  const alice = "0x1111111111111111111111111111111111111111";

  test("Indexer Recovery: re-syncing duplicate blocks does not double-count deposits", () => {
    const store = new IndexerStore();
    const indexer = new BlockchainIndexer(store);

    const log = iface.encodeEventLog(iface.getEvent("Deposited")!, [
      alice,
      0n,
      ethers.zeroPadValue("0xabcd", 32),
    ]);

    const logPayload = {
      topics: log.topics,
      data: log.data,
      blockNumber: 500,
      blockTimestamp: 1_700_000_500,
      transactionHash: "0xunique-tx-1",
    };

    // First ingestion
    indexer.processLog(logPayload);
    assert.equal(store.getUserDepositEventCount(alice), 1n);
    assert.equal(store.getTotalDepositEvents(), 1n);

    // Simulated crash & replay of the exact same event
    indexer.processLog(logPayload);
    assert.equal(store.getUserDepositEventCount(alice), 1n);
    assert.equal(store.getTotalDepositEvents(), 1n);
  });

  test("Malformed Log Resilience: unparseable or corrupted logs do not crash indexer", () => {
    const store = new IndexerStore();
    const indexer = new BlockchainIndexer(store);

    // Corrupted topic
    assert.doesNotThrow(() => {
      indexer.processLog({
        topics: ["0xinvalidtopic"],
        data: "0xdeadbeef",
        blockNumber: 501,
        blockTimestamp: 1_700_000_501,
        transactionHash: "0xcorrupt-1",
      });
    });

    // Empty topics
    assert.doesNotThrow(() => {
      indexer.processLog({
        topics: [],
        data: "0x",
        blockNumber: 502,
        blockTimestamp: 1_700_000_502,
        transactionHash: "0xcorrupt-2",
      });
    });

    // Truncated data
    assert.doesNotThrow(() => {
      indexer.processLog({
        topics: [ethers.id("Deposited(address,uint256,bytes32)")],
        data: "0x12",
        blockNumber: 503,
        blockTimestamp: 1_700_000_503,
        transactionHash: "0xcorrupt-3",
      });
    });

    // State remains uncorrupted
    assert.equal(store.getTotalDepositEvents(), 0n);
  });

  test("API Exception Isolation: unhandled exceptions in routes return 500 without crashing app", async () => {
    const app = createApp();

    const res = await request(app).get("/api/v1/debug/error");
    assert.equal(res.status, 500);
    assert.equal(res.body.error, "InternalServerError");

    // Verify subsequent requests still work normally (server did not crash)
    const healthRes = await request(app).get("/health");
    assert.equal(healthRes.status, 200);
    assert.equal(healthRes.body.status, "healthy");
  });
});
