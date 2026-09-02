import { test, describe } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { Interface, ethers } from "ethers";
import { createApp } from "../src/app.js";
import { BlockchainIndexer } from "../src/indexer/indexer.js";
import { IndexerStore } from "../src/indexer/store.js";
import { KMSRelayerService } from "../src/relayer/relayer.js";
import { MockKMSClient } from "../src/relayer/kms.js";

const POOL_EVENTS_ABI = [
  "event Deposited(address indexed user, uint256 indexed nonce, uint64 plainAmount, bytes32 indexed inputHandle)",
  "event WithdrawalRequested(address indexed user, uint256 indexed nonce, bytes32 indexed requestHash, uint64 requestedAmount, bytes32 handle)",
  "event WithdrawalFinalized(address indexed user, bytes32 indexed requestHash, uint64 cleartextAmount)",
  "event WithdrawalCancelled(address indexed user, bytes32 indexed requestHash)",
  "event DrawExecuted(uint256 indexed drawId, uint64 prizeAmount, uint256 timestamp, uint256 participantCount)",
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
      100_000n,
      ethers.zeroPadValue("0xabcd", 32),
    ]);

    const logPayload = {
      topics: log.topics,
      data: log.data,
      blockNumber: 500,
      transactionHash: "0xunique-tx-1",
    };

    // First ingestion
    indexer.processLog(logPayload);
    assert.equal(store.getUserDeposit(alice), 100_000n);
    assert.equal(store.getTotalDeposits(), 100_000n);

    // Simulated crash & replay of the exact same event
    indexer.processLog(logPayload);
    assert.equal(store.getUserDeposit(alice), 100_000n);
    assert.equal(store.getTotalDeposits(), 100_000n);
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
        transactionHash: "0xcorrupt-1",
      });
    });

    // Empty topics
    assert.doesNotThrow(() => {
      indexer.processLog({
        topics: [],
        data: "0x",
        blockNumber: 502,
        transactionHash: "0xcorrupt-2",
      });
    });

    // Truncated data
    assert.doesNotThrow(() => {
      indexer.processLog({
        topics: [ethers.id("Deposited(address,uint256,uint64,bytes32)")],
        data: "0x12",
        blockNumber: 503,
        transactionHash: "0xcorrupt-3",
      });
    });

    // State remains uncorrupted
    assert.equal(store.getTotalDeposits(), 0n);
  });

  test("High Concurrency: 20 simultaneous relayer dispatches guarantee single execution", async () => {
    const store = new IndexerStore();
    const rHash = ethers.id("concurrent-request-hash");

    store.addWithdrawalRequest({
      user: alice,
      nonce: 0n,
      requestHash: rHash,
      requestedAmount: 50_000n,
      handle: ethers.id("concurrent-handle"),
      blockNumber: 600,
      transactionHash: "0xtx",
      timestamp: Date.now(),
      status: "PENDING",
    });

    let executionCount = 0;
    const slowKmsClient = {
      async fetchDecryptionProof() {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return { cleartext: 50_000n, proof: "0xvalidproof" };
      },
    };

    const submitter = {
      async finalizeWithdrawal() {
        executionCount++;
        return "0xsubmittx";
      },
    };

    const relayer = new KMSRelayerService(store, slowKmsClient, submitter);

    // Fire 20 concurrent process requests
    const promises = Array.from({ length: 20 }, () => relayer.processRequest(rHash));
    const results = await Promise.all(promises);

    const successful = results.filter((r) => r === true).length;
    const suppressed = results.filter((r) => r === false).length;

    assert.equal(successful, 1, "Exactly one execution should succeed");
    assert.equal(suppressed, 19, "All 19 concurrent duplicate calls must be suppressed");
    assert.equal(executionCount, 1, "Submitter should be invoked exactly once");
  });

  test("KMS Gateway Outage: relayer gracefully fails and recovers when KMS returns online", async () => {
    const store = new IndexerStore();
    const rHash = ethers.id("outage-hash");

    store.addWithdrawalRequest({
      user: alice,
      nonce: 1n,
      requestHash: rHash,
      requestedAmount: 10_000n,
      handle: ethers.id("outage-handle"),
      blockNumber: 601,
      transactionHash: "0xtx",
      timestamp: Date.now(),
      status: "PENDING",
    });

    const mockKms = new MockKMSClient(10_000n, 10); // Offline for 10 attempts
    const submitter = {
      async finalizeWithdrawal() {
        return "0xtx";
      },
    };

    const relayer = new KMSRelayerService(store, mockKms, submitter, {
      maxRetries: 2,
      baseBackoffMs: 5,
    });

    // Step 1: Outage fails cleanly without unhandled rejection
    const failResult = await relayer.processRequest(rHash);
    assert.equal(failResult, false);

    // Step 2: KMS recovers (offline attempts reset)
    mockKms.failAttempts = 0;

    // Step 3: Subsequent dispatch succeeds immediately
    const recoverResult = await relayer.processRequest(rHash);
    assert.equal(recoverResult, true);
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
