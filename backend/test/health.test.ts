import { test, describe } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";

describe("Backend Core & Health Tests", () => {
  const app = createApp();

  test("GET /health should return 200 and healthy status", async () => {
    const res = await request(app).get("/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "healthy");
    assert.equal(res.body.service, "cipherpool-backend");
    assert.equal(typeof res.body.uptimeSeconds, "number");
  });

  test("GET /health/ready should return 200 with runtime diagnostics", async () => {
    const res = await request(app).get("/health/ready");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ready");
    assert.ok(res.body.checks.memoryRssMb > 0);
  });

  test("GET /non-existent-route should return 404", async () => {
    const res = await request(app).get("/non-existent-route");
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "NotFound");
  });

  test("loadConfig should parse valid environment settings", () => {
    const customConfig = loadConfig({
      PORT: "4000",
      NODE_ENV: "test",
      RPC_URL: "http://localhost:8545",
    });
    assert.equal(customConfig.PORT, 4000);
    assert.equal(customConfig.NODE_ENV, "test");
  });

  test("loadConfig should throw on invalid address", () => {
    assert.throws(() => {
      loadConfig({ POOL_CONTRACT_ADDRESS: "invalid-hex" });
    }, /Invalid application environment configuration/);
  });
});
