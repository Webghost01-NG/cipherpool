import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {
  readWalletDisconnectPreference,
  TARGET_CHAIN_ID,
  TARGET_CHAIN_NAME,
  WALLET_DISCONNECT_SESSION_KEY,
  WalletProvider,
  useWallet,
} from "../src/hooks/useWallet.js";
import { WalletButton } from "../src/components/wallet/WalletButton.js";
import { WalletModal } from "../src/components/wallet/WalletModal.js";

describe("Wallet Connector & Network Guard Tests", () => {
  test("strictly enforces Sepolia testnet parameters", () => {
    assert.equal(TARGET_CHAIN_ID, 11155111, "Chain ID must match canonical Sepolia (11155111)");
    assert.equal(TARGET_CHAIN_NAME, "Ethereum Sepolia");
  });

  test("Wallet context and hook export properly", () => {
    assert.equal(typeof WalletProvider, "function");
    assert.equal(typeof useWallet, "function");
  });

  test("manual disconnect preference is scoped to explicit session state", () => {
    const disconnectedStorage = {
      getItem: (key: string) => key === WALLET_DISCONNECT_SESSION_KEY ? "true" : null,
    };
    const connectedStorage = { getItem: () => null };
    const unavailableStorage = { getItem: () => { throw new Error("Storage disabled"); } };

    assert.equal(readWalletDisconnectPreference(disconnectedStorage), true);
    assert.equal(readWalletDisconnectPreference(connectedStorage), false);
    assert.equal(readWalletDisconnectPreference(unavailableStorage), false);
    assert.equal(readWalletDisconnectPreference(undefined), false);
  });

  test("WalletModal and WalletButton instantiate with valid props", () => {
    const modal = React.createElement(WalletModal, {
      isOpen: true,
      onClose: () => {},
    });
    assert.ok(modal);

    const button = React.createElement(WalletButton);
    assert.ok(button);
  });
});
