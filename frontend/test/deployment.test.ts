import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateDeploymentEvidence } from "../src/contracts/deployment.js";

const expected = {
  chainId: 11155111,
  poolAddress: "0x1111111111111111111111111111111111111111",
  poolRuntimeCodeHash: "0x" + "ab".repeat(32),
  custodyAssetAddress: "0x2222222222222222222222222222222222222222",
  tokenSymbol: "USDC",
  tokenDecimals: 6,
};

describe("Frontend deployment verification", () => {
  test("accepts the reviewed chain, bytecode, custody, and token metadata", () => {
    assert.deepEqual(validateDeploymentEvidence(expected, {
      ...expected,
      supportsCorrectedAccounting: true,
    }), []);
  });

  test("rejects a legacy or substituted deployment", () => {
    const errors = validateDeploymentEvidence(expected, {
      chainId: 1,
      poolAddress: "0x3333333333333333333333333333333333333333",
      poolRuntimeCodeHash: "0x" + "cd".repeat(32),
      custodyAssetAddress: "0x4444444444444444444444444444444444444444",
      tokenSymbol: "FAKE",
      tokenDecimals: 18,
      supportsCorrectedAccounting: false,
    });
    assert.equal(errors.length, 7);
  });
});
