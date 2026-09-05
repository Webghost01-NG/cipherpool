import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getPoolAbi, POOL_ABI, POOL_ABI_READINESS_V2, POOL_ABI_SNAPSHOT_V3 } from "../src/contracts/abi.js";
import { allowsWithdrawalDuringSettlement, getRuntimeCapabilities, resolveRuntimeProfile } from "../src/contracts/runtimeProfiles.js";
import { describeRpcFailure, withTimeout } from "../src/utils/rpcDiagnostics.js";

const aggregateHash = `0x${"11".repeat(32)}`;
const readinessHash = `0x${"22".repeat(32)}`;
const profiles = [
  { codeHash: aggregateHash, version: "aggregate-v1" as const },
  { codeHash: readinessHash, version: "readiness-v2" as const },
];

describe("Resilient Sepolia reads", () => {
  test("snapshot exits are unavailable for old or unverified runtimes", () => {
    assert.equal(allowsWithdrawalDuringSettlement(null), false);
    assert.equal(allowsWithdrawalDuringSettlement("aggregate-v1"), false);
    assert.equal(allowsWithdrawalDuringSettlement("readiness-v2"), false);
    assert.equal(allowsWithdrawalDuringSettlement("snapshot-v3"), true);
    assert.equal(getPoolAbi("snapshot-v3"), POOL_ABI_SNAPSHOT_V3);
    assert.equal(POOL_ABI_READINESS_V2.some((entry) => entry.includes("withdrawalSnapshotsEnabled")), false);
    assert.equal(POOL_ABI_SNAPSHOT_V3.some((entry) => entry.includes("withdrawalSnapshotsEnabled")), true);
    assert.equal(getRuntimeCapabilities("snapshot-v3").exposesAggregateSnapshot, false);
  });
  test("selects current and successor ABI profiles by observed runtime hash", () => {
    assert.equal(resolveRuntimeProfile(aggregateHash.toUpperCase().replace("0X", "0x"), profiles)?.version, "aggregate-v1");
    assert.equal(resolveRuntimeProfile(readinessHash, profiles)?.version, "readiness-v2");
    assert.equal(resolveRuntimeProfile(`0x${"33".repeat(32)}`, profiles), null);
    assert.equal(getPoolAbi("aggregate-v1"), POOL_ABI);
    assert.equal(getPoolAbi("readiness-v2"), POOL_ABI_READINESS_V2);
  });

  test("keeps aggregate disclosure disabled in the successor profile", () => {
    assert.deepEqual(getRuntimeCapabilities("aggregate-v1"), {
      exposesAggregateSnapshot: true,
      usesEncryptedReadiness: false,
    });
    assert.deepEqual(getRuntimeCapabilities("readiness-v2"), {
      exposesAggregateSnapshot: false,
      usesEncryptedReadiness: true,
    });
  });

  test("turns raw provider failures into route-specific recovery guidance", () => {
    const walletMessage = describeRpcFailure({ code: "CALL_EXCEPTION", message: "missing revert data", transaction: { data: "sensitive" } }, "wallet");
    assert.match(walletMessage, /wallet's Sepolia RPC/);
    assert.match(walletMessage, /Switch/);
    assert.doesNotMatch(walletMessage, /sensitive|transaction/i);

    const appMessage = describeRpcFailure({ info: { error: { code: 429, message: "rate limit" } } }, "application");
    assert.match(appMessage, /Veylott's Sepolia read providers/);
    assert.match(appMessage, /rate-limited/);
  });

  test("bounds an unresponsive provider check", async () => {
    await assert.rejects(withTimeout(new Promise<never>(() => undefined), 5), /timed out/);
  });
});
