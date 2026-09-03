import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Interface, ethers } from "ethers";
import { BlockchainIndexer } from "../src/indexer/indexer.js";
import { IndexerStore } from "../src/indexer/store.js";

const POOL_EVENTS_ABI = [
  "event Deposited(address indexed user, uint256 indexed nonce, uint64 plainAmount, bytes32 indexed inputHandle)",
  "event WithdrawalRequested(address indexed user, uint256 indexed nonce, bytes32 indexed requestHash, uint64 requestedAmount, bytes32 handle)",
  "event WithdrawalFinalized(address indexed user, bytes32 indexed requestHash, uint64 cleartextAmount)",
  "event WithdrawalCancelled(address indexed user, bytes32 indexed requestHash)",
  "event DrawExecuted(uint256 indexed drawId, uint64 prizeAmount, uint256 timestamp, uint256 participantCount)",
];

describe("Blockchain Indexer & State Store Tests", () => {
  const iface = new Interface(POOL_EVENTS_ABI);
  const alice = "0x1111111111111111111111111111111111111111";

  test("should correctly index Deposited event and track balances", () => {
    const store = new IndexerStore();
    const indexer = new BlockchainIndexer(store);

    const log = iface.encodeEventLog(iface.getEvent("Deposited")!, [
      alice,
      0n,
      50_000n,
      ethers.zeroPadValue("0x1234", 32),
    ]);

    indexer.processLog({
      topics: log.topics,
      data: log.data,
      blockNumber: 100,
      transactionHash: "0xaaa",
    });

    assert.equal(store.getUserDeposit(alice), 50_000n);
    assert.equal(store.getTotalDeposits(), 50_000n);
    assert.equal(store.getTotalAccountedBalance(), 50_000n);
  });

  test("should index WithdrawalRequested, update state, and trigger callback", () => {
    const store = new IndexerStore();
    const indexer = new BlockchainIndexer(store);

    let callbackFired = false;
    indexer.setOnWithdrawalRequested((hash) => {
      callbackFired = true;
      assert.ok(hash.length > 0);
    });

    const rHash = ethers.id("request-1");
    const rHandle = ethers.id("handle-1");

    const log = iface.encodeEventLog(iface.getEvent("WithdrawalRequested")!, [
      alice,
      0n,
      rHash,
      25_000n,
      rHandle,
    ]);

    indexer.processLog({
      topics: log.topics,
      data: log.data,
      blockNumber: 101,
      transactionHash: "0xbbb",
    });

    assert.ok(callbackFired);
    const pending = store.getPendingWithdrawalByUser(alice);
    assert.ok(pending);
    assert.equal(pending.status, "PENDING");
    assert.equal(pending.requestedAmount, 25_000n);
  });

  test("should handle WithdrawalFinalized and transition state to FINALIZED", () => {
    const store = new IndexerStore();
    const indexer = new BlockchainIndexer(store);

    store.addDeposit({
      user: alice,
      nonce: 0n,
      plainAmount: 20_000n,
      inputHandle: ethers.id("initial-balance"),
      blockNumber: 101,
      transactionHash: "0xdeposit",
    });

    const rHash = ethers.id("request-finalize");
    const rHandle = ethers.id("handle-finalize");

    const reqLog = iface.encodeEventLog(iface.getEvent("WithdrawalRequested")!, [
      alice,
      1n,
      rHash,
      10_000n,
      rHandle,
    ]);
    indexer.processLog({
      topics: reqLog.topics,
      data: reqLog.data,
      blockNumber: 102,
      transactionHash: "0xccc",
    });

    assert.ok(store.getPendingWithdrawalByUser(alice));

    const finalLog = iface.encodeEventLog(iface.getEvent("WithdrawalFinalized")!, [
      alice,
      rHash,
      10_000n,
    ]);
    indexer.processLog({
      topics: finalLog.topics,
      data: finalLog.data,
      blockNumber: 103,
      transactionHash: "0xddd",
    });

    assert.equal(store.getPendingWithdrawalByUser(alice), undefined);
    const recorded = store.getPendingWithdrawalByHash(rHash);
    assert.equal(recorded?.status, "FINALIZED");
    assert.equal(store.getUserDeposit(alice), 10_000n);
    assert.equal(store.getTotalAccountedBalance(), 10_000n);

    indexer.processLog({
      topics: finalLog.topics,
      data: finalLog.data,
      blockNumber: 103,
      transactionHash: "0xddd",
    });
    assert.equal(store.getUserDeposit(alice), 10_000n);
    assert.equal(store.getTotalAccountedBalance(), 10_000n);
  });

  test("should handle WithdrawalCancelled and transition state to CANCELLED", () => {
    const store = new IndexerStore();
    const indexer = new BlockchainIndexer(store);

    const rHash = ethers.id("request-cancel");
    const rHandle = ethers.id("handle-cancel");

    const reqLog = iface.encodeEventLog(iface.getEvent("WithdrawalRequested")!, [
      alice,
      2n,
      rHash,
      5_000n,
      rHandle,
    ]);
    indexer.processLog({
      topics: reqLog.topics,
      data: reqLog.data,
      blockNumber: 104,
      transactionHash: "0xeee",
    });

    const cancelLog = iface.encodeEventLog(iface.getEvent("WithdrawalCancelled")!, [
      alice,
      rHash,
    ]);
    indexer.processLog({
      topics: cancelLog.topics,
      data: cancelLog.data,
      blockNumber: 105,
      transactionHash: "0xfff",
    });

    assert.equal(store.getPendingWithdrawalByUser(alice), undefined);
    const recorded = store.getPendingWithdrawalByHash(rHash);
    assert.equal(recorded?.status, "CANCELLED");
  });

  test("should index DrawExecuted event", () => {
    const store = new IndexerStore();
    const indexer = new BlockchainIndexer(store);

    const log = iface.encodeEventLog(iface.getEvent("DrawExecuted")!, [
      1n,
      5_000n,
      1700000000,
      10,
    ]);
    indexer.processLog({
      topics: log.topics,
      data: log.data,
      blockNumber: 106,
      transactionHash: "0x111",
    });

    assert.equal(store.getDrawCount(), 1);
    const latest = store.getLatestDraw();
    assert.equal(latest?.drawId, 1n);
    assert.equal(latest?.prizeAmount, 5_000n);
    assert.equal(store.getTotalAccountedBalance(), 5_000n);

    indexer.processLog({
      topics: log.topics,
      data: log.data,
      blockNumber: 106,
      transactionHash: "0x111",
    });
    assert.equal(store.getDrawCount(), 1);
    assert.equal(store.getTotalAccountedBalance(), 5_000n);
  });
});
