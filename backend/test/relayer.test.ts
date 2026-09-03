import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { IndexerStore } from "../src/indexer/store.js";
import { KMSRelayerService } from "../src/relayer/relayer.js";
import { TestKMSClient } from "./helpers/test-kms.js";

describe("KMS Relayer Service & Retry Logic Tests", () => {
  const dummyRequest = {
    user: "0x1111111111111111111111111111111111111111",
    nonce: 0n,
    requestHash: "0xaaaabbbbccccddddeeeeffff0000111122223333444455556666777788889999",
    requestedAmount: 1000n,
    handle: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    blockNumber: 50,
    transactionHash: "0xtx01",
    timestamp: Date.now(),
    status: "PENDING" as const,
  };

  test("should successfully process a pending withdrawal request", async () => {
    const store = new IndexerStore();
    store.addWithdrawalRequest(dummyRequest);

    const kmsClient = new TestKMSClient(1000n);
    const relayer = new KMSRelayerService(store, kmsClient);
    const result = await relayer.processRequest(dummyRequest.requestHash);

    assert.equal(result?.cleartext, 1000n);
    assert.ok(result?.proof);
  });

  test("should suppress duplicate execution when request is already in-flight", async () => {
    const store = new IndexerStore();
    store.addWithdrawalRequest(dummyRequest);

    let resolveKms: () => void;
    const slowKmsClient = {
      async fetchDecryptionProof() {
        await new Promise<void>((r) => {
          resolveKms = r;
        });
        return { cleartext: 1000n, proof: "0xproof" };
      },
    };

    const relayer = new KMSRelayerService(store, slowKmsClient);

    const promise1 = relayer.processRequest(dummyRequest.requestHash);
    assert.equal(relayer.isInFlight(dummyRequest.requestHash), true);

    // Second call while in-flight should immediately return false (suppressed)
    const duplicateSuccess = await relayer.processRequest(dummyRequest.requestHash);
    assert.equal(duplicateSuccess, null);

    // Complete the first call
    resolveKms!();
    const firstSuccess = await promise1;
    assert.equal(firstSuccess?.cleartext, 1000n);
    assert.equal(relayer.isInFlight(dummyRequest.requestHash), false);
  });

  test("should retry with exponential backoff and succeed on transient failures", async () => {
    const store = new IndexerStore();
    store.addWithdrawalRequest(dummyRequest);

    // Fails 2 times, succeeds on 3rd attempt
    const retryKmsClient = new TestKMSClient(1000n, 2);

    const relayer = new KMSRelayerService(store, retryKmsClient, {
      maxRetries: 4,
      baseBackoffMs: 10,
    });

    const success = await relayer.processRequest(dummyRequest.requestHash);
    assert.equal(success?.cleartext, 1000n);
  });

  test("should handle terminal failure when retries are exhausted", async () => {
    const store = new IndexerStore();
    store.addWithdrawalRequest(dummyRequest);

    // Fails 5 times, but maxRetries is 3
    const persistentFailKmsClient = new TestKMSClient(1000n, 5);

    const relayer = new KMSRelayerService(store, persistentFailKmsClient, {
      maxRetries: 3,
      baseBackoffMs: 5,
    });

    const success = await relayer.processRequest(dummyRequest.requestHash);
    assert.equal(success, null);
    assert.equal(relayer.isInFlight(dummyRequest.requestHash), false);
  });
});
