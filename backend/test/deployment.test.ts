import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validatePoolDeployment } from "../src/config/deployment.js";

const expected = {
  chainId: 11155111,
  poolAddress: "0x1111111111111111111111111111111111111111",
  custodyAssetAddress: "0x2222222222222222222222222222222222222222",
  poolRuntimeCodeHash: "0x" + "ab".repeat(32),
};

describe("Backend deployment verification", () => {
  test("accepts matching reviewed deployment evidence", () => {
    assert.deepEqual(validatePoolDeployment(expected, {
      chainId: expected.chainId,
      poolRuntimeCodeHash: expected.poolRuntimeCodeHash,
      custodyAssetAddress: expected.custodyAssetAddress,
      supportsCorrectedAccounting: true,
    }), []);
  });

  test("rejects chain, bytecode, custody, and accounting mismatches", () => {
    const errors = validatePoolDeployment(expected, {
      chainId: 1,
      poolRuntimeCodeHash: "0x" + "cd".repeat(32),
      custodyAssetAddress: "0x3333333333333333333333333333333333333333",
      supportsCorrectedAccounting: false,
    });
    assert.equal(errors.length, 4);
    assert.ok(errors.some((error) => error.includes("chain ID")));
    assert.ok(errors.some((error) => error.includes("bytecode")));
    assert.ok(errors.some((error) => error.includes("custody")));
    assert.ok(errors.some((error) => error.includes("aggregate accounting")));
  });
});
