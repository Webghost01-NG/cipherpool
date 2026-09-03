import { test, describe } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { InputEncryptionAdapter } from "../src/adapters/InputEncryption.js";
import { KmsRelayerAdapter } from "../src/adapters/KmsRelayerAdapter.js";

describe("Client-Side Encryption & Relayer Adapters", () => {
  const poolAddress = "0x1111111111111111111111111111111111111111";
  const userAddress = "0x2222222222222222222222222222222222222222";

  test("InputEncryptionAdapter validates addresses and bounds", async () => {
    assert.throws(() => new InputEncryptionAdapter("invalid", userAddress), /Pool contract address/);
    assert.throws(() => new InputEncryptionAdapter(poolAddress, "invalid"), /wallet address/);

    const instanceFactory = async () => ({
      createEncryptedInput: () => ({
        add64: () => ({
          encrypt: async () => ({
            handles: [new Uint8Array(32).fill(7)],
            inputProof: new Uint8Array([1, 2, 3]),
          }),
        }),
      }),
    });
    const adapter = new InputEncryptionAdapter(poolAddress, userAddress, instanceFactory as never);

    await assert.rejects(async () => {
      await adapter.encryptUint64(0n);
    }, /Amount must be strictly greater than zero/);

    await assert.rejects(async () => {
      await adapter.encryptUint64(2n ** 64n);
    }, /uint64 protocol limit/);

    const payload = await adapter.encryptUint64(500n);
    assert.ok(payload.handle.startsWith("0x") && payload.handle.length === 66);
    assert.ok(payload.inputProof.startsWith("0x"));
  });

  test("KmsRelayerAdapter communicates with backend API and polls status", async () => {
    let pollCount = 0;

    // Start a lightweight mock HTTP server simulating the backend API
    const server = http.createServer((req, res) => {
      if (req.url === `/api/v1/users/${userAddress}/withdrawal`) {
        pollCount++;
        res.writeHead(200, { "Content-Type": "application/json" });
        if (pollCount < 2) {
          res.end(
            JSON.stringify({
              user: userAddress,
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
              user: userAddress,
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
        res.end(JSON.stringify({
          status: "proof_ready",
          requestHash: "0xhash",
          cleartextAmount: "500",
          decryptionProof: `0x${"ab".repeat(32)}`,
        }));
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

    const proof = await relayerAdapter.requestWithdrawalProof("0xhash");
    assert.equal(proof.status, "proof_ready");
    assert.equal(proof.cleartextAmount, "500");

    const settled = await relayerAdapter.pollUntilSettled(userAddress);
    assert.equal(settled.withdrawal?.status, "FINALIZED");

    server.close();
  });
});
