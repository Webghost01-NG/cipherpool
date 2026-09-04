import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getPoolStatus } from "../src/utils/poolStatus.js";

describe("Pool health presentation", () => {
  test("reports a verified unpaused deployment as active", () => {
    assert.deepEqual(getPoolStatus("verified", false), {
      label: "Pool active",
      isHealthy: true,
    });
  });

  test("keeps paused and failed deployments visibly non-healthy", () => {
    assert.deepEqual(getPoolStatus("verified", true), {
      label: "Pool paused",
      isHealthy: false,
    });
    assert.deepEqual(getPoolStatus("failed", false), {
      label: "Pool unavailable",
      isHealthy: false,
    });
  });

  test("uses a checking state until deployment verification completes", () => {
    assert.deepEqual(getPoolStatus("pending", false), {
      label: "Pool checking",
      isHealthy: false,
    });
  });
});
