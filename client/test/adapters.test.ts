import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { InputEncryptionAdapter } from "../src/adapters/InputEncryption.js";

describe("Client-side encryption adapter", () => {
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
});
