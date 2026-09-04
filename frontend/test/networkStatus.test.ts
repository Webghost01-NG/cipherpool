import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  canReadSepoliaContracts,
  canUseWalletTransactionRoute,
  getNetworkStatus,
} from "../src/utils/networkStatus.js";

describe("Sepolia route guards", () => {
  test("allows public reads without a wallet when redundant RPCs are configured", () => {
    assert.equal(canReadSepoliaContracts(3), true);
    assert.equal(canReadSepoliaContracts(2), true);
    assert.equal(canReadSepoliaContracts(1), false);
    assert.equal(canReadSepoliaContracts(0), false);
  });

  test("requires a connected account and provider only for the wallet transaction route", () => {
    assert.equal(canUseWalletTransactionRoute("connected", true, true), true);
    assert.equal(canUseWalletTransactionRoute("disconnected", true, true), false);
    assert.equal(canUseWalletTransactionRoute("wrong_network", true, true), false);
    assert.equal(canUseWalletTransactionRoute("connected", false, true), false);
    assert.equal(canUseWalletTransactionRoute("connected", true, false), false);
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
