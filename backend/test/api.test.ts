import { test, describe } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { IndexerStore } from "../src/indexer/store.js";
import { KMSRelayerService } from "../src/relayer/relayer.js";
import { MockKMSClient } from "../src/relayer/kms.js";

describe("Typed REST API Integration Tests", () => {
  const alice = "0x1111111111111111111111111111111111111111";
  const dummyRequestHash = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  test("GET /api/v1/pool/state should return pool statistics", async () => {
    const store = new IndexerStore();
    store.addDeposit({
      user: alice,
      nonce: 0n,
      plainAmount: 100_000n,
      inputHandle: "0xhandle",
      blockNumber: 10,
      transactionHash: "0xtx",
    });

    const app = createApp(store);
    const res = await request(app).get("/api/v1/pool/state");

    assert.equal(res.status, 200);
    assert.equal(res.body.totalDeposits, "100000");
    assert.equal(res.body.totalDraws, 0);
  });

  test("GET /api/v1/users/:address/deposit should return user deposit", async () => {
    const store = new IndexerStore();
    store.addDeposit({
      user: alice,
      nonce: 0n,
      plainAmount: 50_000n,
      inputHandle: "0xhandle",
      blockNumber: 10,
      transactionHash: "0xtx",
    });

    const app = createApp(store);
    const res = await request(app).get(`/api/v1/users/${alice}/deposit`);

    assert.equal(res.status, 200);
    assert.equal(res.body.user, alice);
    assert.equal(res.body.plainDepositAmount, "50000");
  });

  test("GET /api/v1/users/:address/deposit should reject malformed address", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/users/not-an-address/deposit");

    assert.equal(res.status, 400);
    assert.equal(res.body.error, "ValidationError");
  });

  test("GET /api/v1/users/:address/withdrawal should report pending withdrawal status", async () => {
    const store = new IndexerStore();
    store.addWithdrawalRequest({
      user: alice,
      nonce: 0n,
      requestHash: dummyRequestHash,
      requestedAmount: 20_000n,
      handle: "0xhandle",
      blockNumber: 12,
      transactionHash: "0xtx",
      timestamp: Date.now(),
      status: "PENDING",
    });

    const app = createApp(store);
    const res = await request(app).get(`/api/v1/users/${alice}/withdrawal`);

    assert.equal(res.status, 200);
    assert.equal(res.body.hasPendingWithdrawal, true);
    assert.equal(res.body.withdrawal.requestedAmount, "20000");
    assert.equal(res.body.withdrawal.status, "PENDING");
  });

  test("POST /api/v1/relayer/process should trigger relayer and return success", async () => {
    const store = new IndexerStore();
    store.addWithdrawalRequest({
      user: alice,
      nonce: 0n,
      requestHash: dummyRequestHash,
      requestedAmount: 5_000n,
      handle: "0xhandle",
      blockNumber: 15,
      transactionHash: "0xtx",
      timestamp: Date.now(),
      status: "PENDING",
    });

    const kmsClient = new MockKMSClient(5_000n, 0);
    const submitter = {
      async finalizeWithdrawal() {
        return "0xconfirmedtx";
      },
    };
    const relayer = new KMSRelayerService(store, kmsClient, submitter);

    const app = createApp(store, relayer);
    const res = await request(app)
      .post("/api/v1/relayer/process")
      .send({ requestHash: dummyRequestHash });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, "success");
    assert.equal(res.body.requestHash, dummyRequestHash);
  });

  test("POST /api/v1/relayer/process should reject malformed requestHash", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/v1/relayer/process")
      .send({ requestHash: "invalid" });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, "ValidationError");
  });
});
