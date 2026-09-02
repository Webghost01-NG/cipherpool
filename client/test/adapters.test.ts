import { test, describe } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { InputEncryptionAdapter } from "../src/adapters/InputEncryption.js";
import { KmsRelayerAdapter } from "../src/adapters/KmsRelayerAdapter.js";

describe("Client-Side Encryption & Relayer Adapters", () => {
  const dummyPool = "0x1111111111111111111111111111111111111111";
  const dummyUser = "0x2222222222222222222222222222222222222222";

  test("InputEncryptionAdapter validates addresses and bounds", async () => {
    assert.throws(() => new InputEncryptionAdapter("invalid", dummyUser), /Invalid contract address/);
    assert.throws(() => new InputEncryptionAdapter(dummyPool, "invalid"), /Invalid user address/);

    const adapter = new InputEncryptionAdapter(dummyPool, dummyUser);

    await assert.rejects(async () => {
      await adapter.encryptUint64(0n);
    }, /Amount must be strictly greater than zero/);

    await assert.rejects(async () => {
      await adapter.encryptUint64(2n ** 64n);
    }, /Amount exceeds 64-bit unsigned integer maximum/);

    const payload = await adapter.encryptUint64(500n);
    assert.ok(payload.handle.startsWith("0x") && payload.handle.length === 66);
    assert.ok(payload.inputProof.startsWith("0x"));
  });

  test("KmsRelayerAdapter communicates with backend API and polls status", async () => {
    let pollCount = 0;

    // Start a lightweight mock HTTP server simulating the backend API
    const server = http.createServer((req, res) => {
      if (req.url === `/api/v1/users/${dummyUser}/withdrawal`) {
        pollCount++;
        res.writeHead(200, { "Content-Type": "application/json" });
        if (pollCount < 2) {
          res.end(
            JSON.stringify({
              user: dummyUser,
              hasPendingWithdrawal: true,
              withdrawal: {
                requestHash: "0xhash",
                requestedAmount: "500",
                handle: "0xhandle",
                nonce: "0",
                timestamp: Date.now(),
                status: "PENDING",
              },
            })
          );
        } else {
          res.end(
            JSON.stringify({
              user: dummyUser,
              hasPendingWithdrawal: true,
              withdrawal: {
                requestHash: "0xhash",
                requestedAmount: "500",
                handle: "0xhandle",
                nonce: "0",
                timestamp: Date.now(),
                status: "FINALIZED",
              },
            })
          );
        }
      } else if (req.url === "/api/v1/relayer/process") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "success", requestHash: "0xhash" }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const relayerAdapter = new KmsRelayerAdapter({
      backendApiUrl: `http://127.0.0.1:${port}`,
      pollIntervalMs: 10,
      maxPollAttempts: 5,
    });

    const triggerRes = await relayerAdapter.triggerRelayerSettlement("0xhash");
    assert.equal(triggerRes.status, "success");

    const settled = await relayerAdapter.pollUntilSettled(dummyUser);
    assert.equal(settled.withdrawal?.status, "FINALIZED");

    server.close();
  });
});
