import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { IndexerStore } from "../src/indexer/store.js";

describe("Typed REST API integration", () => {
  const alice = "0x1111111111111111111111111111111111111111";

  test("GET /api/v1/pool/state returns event counts without private amounts", async () => {
    const store = new IndexerStore();
    store.addDeposit({
      user: alice,
      nonce: 0n,
      encryptedAmountHandle: "0xhandle",
      blockNumber: 10,
      transactionHash: "0xtx",
    });

    const res = await request(createApp(store)).get("/api/v1/pool/state");

    assert.equal(res.status, 200);
    assert.equal(res.body.depositEvents, "1");
    assert.equal(res.body.confidentialWithdrawalEvents, "0");
    assert.equal(res.body.prizeReserveFundingEvents, "0");
    assert.equal(res.body.prizeReserveFundingModel, "sponsor-funded-testnet");
    assert.equal(res.body.lastVerifiedTotalEligibleBalance, "0");
    assert.equal(res.body.totalDraws, 0);
    assert.equal("totalDeposits" in res.body, false);
  });

  test("GET /api/v1/users/:address/deposit refuses to expose a private balance", async () => {
    const res = await request(createApp()).get(`/api/v1/users/${alice}/deposit`);

    assert.equal(res.status, 410);
    assert.equal(res.body.error, "PrivateMetric");
  });

  test("GET /api/v1/users/:address/deposit rejects malformed addresses", async () => {
    const res = await request(createApp()).get("/api/v1/users/not-an-address/deposit");

    assert.equal(res.status, 400);
    assert.equal(res.body.error, "ValidationError");
  });

  test("the retired plaintext withdrawal relayer is not exposed", async () => {
    const res = await request(createApp())
      .post("/api/v1/relayer/process")
      .send({ requestHash: `0x${"a".repeat(64)}` });

    assert.equal(res.status, 404);
    assert.equal(res.body.error, "NotFound");
  });
});
