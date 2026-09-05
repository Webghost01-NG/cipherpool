import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  assertExpectedParticipants,
  buildConfirmationPhrase,
  parseLifecycleAction,
  parseLifecycleAmount,
  readClearBoolean,
  readClearValue,
} from "../../scripts/live-prize-lifecycle.js";

describe("Live Sepolia lifecycle safeguards", () => {
  const pool = "0x1111111111111111111111111111111111111111";
  const wallet = "0x2222222222222222222222222222222222222222";

  test("defaults to read-only preflight and rejects unknown actions", () => {
    assert.equal(parseLifecycleAction(undefined), "preflight");
    assert.equal(parseLifecycleAction("activate"), "activate");
    assert.equal(parseLifecycleAction("deactivate"), "deactivate");
    assert.throws(() => parseLifecycleAction("full-send"), /must be one of/);
  });

  test("accepts only positive uint64 token amounts", () => {
    assert.equal(parseLifecycleAmount("1.5", 6), 1_500_000n);
    assert.throws(() => parseLifecycleAmount("0", 6), /positive uint64/);
    assert.throws(() => parseLifecycleAmount(undefined, 6), /is required/);
    assert.throws(() => parseLifecycleAmount((2n ** 64n).toString(), 0), /positive uint64/);
  });

  test("requires the complete expected participant set", () => {
    const observed = [wallet, pool];
    assert.doesNotThrow(() => assertExpectedParticipants(observed, `${pool},${wallet}`));
    assert.throws(() => assertExpectedParticipants(observed, wallet), /Participant set mismatch/);
    assert.doesNotThrow(() => assertExpectedParticipants([], "none"));
    assert.throws(() => assertExpectedParticipants([wallet], "none"), /Participant set mismatch/);
  });

  test("binds write confirmation to action, amount, draw, pool, and wallet", () => {
    assert.equal(
      buildConfirmationPhrase("deposit", "8", 0n, pool, wallet),
      `deposit:8:draw-0:${pool}:${wallet}`
    );
    assert.equal(
      buildConfirmationPhrase("activate", "auto", 0n, pool, wallet),
      `activate:auto:draw-0:${pool}:${wallet}`
    );
  });

  test("matches KMS clear values case-insensitively and rejects missing handles", () => {
    const handle = `0x${"ab".repeat(32)}`;
    assert.equal(readClearValue({ [handle.toUpperCase()]: 42n }, handle), 42n);
    assert.throws(() => readClearValue({}, handle), /did not return a value/);
    assert.equal(readClearBoolean({ [handle.toUpperCase()]: true }, handle), true);
    assert.equal(readClearBoolean({ [handle]: 0n }, handle), false);
    assert.throws(() => readClearBoolean({}, handle), /did not return a boolean/);
  });
});
