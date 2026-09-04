import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { formatTokenAmount } from "../src/utils/format.js";
import { parseTokenAmount } from "../src/utils/tokenAmount.js";

describe("Token amount utilities", () => {
  test("parses decimal input without loading the web3 runtime", () => {
    assert.equal(parseTokenAmount("1.25", 6), 1_250_000n);
    assert.equal(parseTokenAmount(".5", 6), 500_000n);
    assert.equal(parseTokenAmount("2", 0), 2n);
  });

  test("rejects malformed input and excess precision", () => {
    assert.throws(() => parseTokenAmount("1e3", 6), /valid decimal/);
    assert.throws(() => parseTokenAmount("1.0000001", 6), /at most 6/);
    assert.throws(() => parseTokenAmount("1", -1), /decimals/);
  });

  test("formats base units with grouping and bounded precision", () => {
    assert.equal(formatTokenAmount("1234567890", 6), "1,234.56");
    assert.equal(formatTokenAmount(500_000n, 6), "0.5");
    assert.equal(formatTokenAmount(-1_250_000n, 6), "-1.25");
  });
});
