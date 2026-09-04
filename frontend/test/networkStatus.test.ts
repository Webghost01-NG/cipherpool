import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  canReadSepoliaContracts,
  getNetworkStatus,
} from "../src/utils/networkStatus.js";

describe("Wallet network read guard", () => {
  test("allows contract reads only after a Sepolia connection is established", () => {
    assert.equal(canReadSepoliaContracts("connected", true), true);
    assert.equal(canReadSepoliaContracts("disconnected", true), false);
    assert.equal(canReadSepoliaContracts("connecting", true), false);
    assert.equal(canReadSepoliaContracts("wrong_network", true), false);
    assert.equal(canReadSepoliaContracts("connected", false), false);
  });

  test("presents the wallet network truthfully", () => {
    assert.deepEqual(getNetworkStatus("connected"), {
      label: "Wallet Sepolia",
      isHealthy: true,
    });
    assert.deepEqual(getNetworkStatus("wrong_network"), {
      label: "Wallet wrong network",
      isHealthy: false,
    });
    assert.deepEqual(getNetworkStatus("disconnected"), {
      label: "Wallet disconnected",
      isHealthy: false,
    });
  });
});
