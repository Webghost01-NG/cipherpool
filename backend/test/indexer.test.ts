import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Interface, ethers } from "ethers";
import { BlockchainIndexer } from "../src/indexer/indexer.js";
import { IndexerStore } from "../src/indexer/store.js";

const POOL_EVENTS_ABI = [
  "event Deposited(address indexed user, uint256 indexed nonce, bytes32 indexed encryptedAmountHandle)",
  "event Withdrawn(address indexed user, uint256 indexed nonce, bytes32 indexed encryptedAmountHandle)",
  "event PrizeReserveFunded(address indexed source, bytes32 indexed encryptedAmountHandle)",
  "event ParticipantActivationRequested(address indexed user, uint256 indexed nonce, bytes32 indexed requestHash, bytes32 eligibilityHandle)",
  "event ParticipantActivationFinalized(address indexed user, bytes32 indexed requestHash, bool eligible, uint256 participantCount)",
  "event DrawSkipped(bytes32 indexed requestHash, uint64 totalWeight, uint64 prizeReserve, uint64 requiredPrizeAmount, uint256 timestamp)",
  "event DrawExecuted(uint256 indexed drawId, bytes32 indexed requestHash, uint64 prizeAmount, uint64 totalWeight, uint64 remainingPrizeReserve, uint256 timestamp, uint256 participantCount)",
];

describe("Confidential pool indexer", () => {
  const iface = new Interface(POOL_EVENTS_ABI);
  const alice = "0x1111111111111111111111111111111111111111";

  function process(indexer: BlockchainIndexer, eventName: string, args: unknown[], txHash: string) {
    const log = iface.encodeEventLog(iface.getEvent(eventName)!, args);
    indexer.processLog({
      topics: log.topics,
      data: log.data,
      blockNumber: 100,
      blockTimestamp: 1_700_000_100,
      transactionHash: txHash,
    });
    return log;
  }

  test("indexes deposit events without storing their plaintext value", () => {
    const store = new IndexerStore();
    const indexer = new BlockchainIndexer(store);
    const handle = ethers.id("private-deposit");

    process(indexer, "Deposited", [alice, 0n, handle], "0xdeposit");

    assert.equal(store.getUserDepositEventCount(alice), 1n);
    assert.equal(store.getTotalDepositEvents(), 1n);
    assert.equal(store.getTotalAccountedBalance(), 0n);
  });

  test("indexes confidential withdrawals idempotently", () => {
    const store = new IndexerStore();
    const indexer = new BlockchainIndexer(store);
    const args = [alice, 1n, ethers.id("private-withdrawal")];

    process(indexer, "Withdrawn", args, "0xwithdraw");
    process(indexer, "Withdrawn", args, "0xwithdraw");

    assert.equal(store.getConfidentialWithdrawalCount(), 1n);
  });

  test("indexes confidential reserve funding idempotently", () => {
    const store = new IndexerStore();
    const indexer = new BlockchainIndexer(store);
    const args = [alice, ethers.id("private-reserve")];

    process(indexer, "PrizeReserveFunded", args, "0xreserve");
    process(indexer, "PrizeReserveFunded", args, "0xreserve");

    assert.equal(store.getPrizeReserveFundingCount(), 1n);
  });

  test("parses activation events without inventing a participant balance", () => {
    const store = new IndexerStore();
    const indexer = new BlockchainIndexer(store);
    const requestHash = ethers.id("participant-activation");

    process(indexer, "ParticipantActivationRequested", [alice, 0n, requestHash, ethers.id("eligibility")], "0xrequest");
    process(indexer, "ParticipantActivationFinalized", [alice, requestHash, true, 1], "0xfinalize");

    assert.equal(store.getTotalDepositEvents(), 0n);
    assert.equal(store.getTotalAccountedBalance(), 0n);
    assert.equal(store.getDrawCount(), 0);
  });

  test("indexes the verified aggregate snapshot emitted by a draw", () => {
    const store = new IndexerStore();
    const indexer = new BlockchainIndexer(store);
    const requestHash = ethers.id("draw-request");
    const args = [1n, requestHash, 5_000n, 50_000n, 10_000n, 1_700_000_100, 10];

    process(indexer, "DrawExecuted", args, "0xdraw");
    process(indexer, "DrawExecuted", args, "0xdraw");

    assert.equal(store.getDrawCount(), 1);
    assert.equal(store.getLatestDraw()?.requestHash, requestHash);
    assert.equal(store.getLatestDraw()?.remainingPrizeReserve, 10_000n);
    assert.equal(store.getTotalAccountedBalance(), 55_000n);
  });

  test("accepts a skipped draw without recording a confirmed round", () => {
    const store = new IndexerStore();
    const indexer = new BlockchainIndexer(store);
    const requestHash = ethers.id("skipped-draw");

    process(indexer, "DrawSkipped", [requestHash, 50_000n, 100n, 5_000n, 1_700_000_100], "0xskip");

    assert.equal(store.getDrawCount(), 0);
    assert.equal(store.getLatestDraw(), undefined);
  });
});
