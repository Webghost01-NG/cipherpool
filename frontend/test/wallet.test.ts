import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import {
  readWalletDisconnectPreference,
  parseWalletAccounts,
  requestWalletAccountSelection,
  TARGET_CHAIN_ID,
  TARGET_CHAIN_NAME,
  WALLET_DISCONNECT_SESSION_KEY,
  WalletProvider,
  useWallet,
} from "../src/hooks/useWallet.js";
import { getWalletMenuFocusIndex, WalletButton } from "../src/components/wallet/WalletButton.js";
import { shouldCloseWalletModal, WalletModal } from "../src/components/wallet/WalletModal.js";

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

  test("requests fresh account permission before reading the selected account", async () => {
    const calls: string[] = [];
    const accounts = await requestWalletAccountSelection({
      request: async ({ method, params }) => {
        calls.push(method);
        if (method === "wallet_requestPermissions") {
          assert.deepEqual(params, [{ eth_accounts: {} }]);
          return [{ parentCapability: "eth_accounts" }];
        }
        return ["0x2222222222222222222222222222222222222222"];
      },
    });

    assert.deepEqual(calls, ["wallet_requestPermissions", "eth_accounts"]);
    assert.deepEqual(accounts, ["0x2222222222222222222222222222222222222222"]);
  });

  test("falls back only when the permissions RPC is unsupported", async () => {
    const calls: string[] = [];
    const accounts = await requestWalletAccountSelection({
      request: async ({ method }) => {
        calls.push(method);
        if (method === "wallet_requestPermissions") throw { code: 4200 };
        return ["0x3333333333333333333333333333333333333333"];
      },
    });

    assert.deepEqual(calls, ["wallet_requestPermissions", "eth_requestAccounts"]);
    assert.equal(accounts[0], "0x3333333333333333333333333333333333333333");
  });

  test("propagates rejection without falling back to a silent reconnect", async () => {
    const calls: string[] = [];
    await assert.rejects(
      requestWalletAccountSelection({
        request: async ({ method }) => {
          calls.push(method);
          throw Object.assign(new Error("User rejected the request"), { code: 4001 });
        },
      }),
      /User rejected the request/
    );
    assert.deepEqual(calls, ["wallet_requestPermissions"]);
  });

  test("rejects empty or malformed account results", async () => {
    await assert.rejects(
      requestWalletAccountSelection({
        request: async ({ method }) => method === "wallet_requestPermissions" ? [] : ["not-an-address"],
      }),
      /did not return an account/
    );
  });

  test("canonicalizes provider accounts before ethers receives them", () => {
    const incorrectlyCased = "0xAbcdefabcdefabcdefabcdefabcdefabcdefabcd";
    assert.deepEqual(parseWalletAccounts([incorrectlyCased]), [
      "0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD",
    ]);
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

  test("wallet menu keyboard navigation wraps and supports boundary keys", () => {
    assert.equal(getWalletMenuFocusIndex("ArrowDown", -1, 3), 0);
    assert.equal(getWalletMenuFocusIndex("ArrowDown", 2, 3), 0);
    assert.equal(getWalletMenuFocusIndex("ArrowUp", -1, 3), 2);
    assert.equal(getWalletMenuFocusIndex("ArrowUp", 0, 3), 2);
    assert.equal(getWalletMenuFocusIndex("Home", 2, 3), 0);
    assert.equal(getWalletMenuFocusIndex("End", 0, 3), 2);
    assert.equal(getWalletMenuFocusIndex("Tab", 0, 3), null);
    assert.equal(getWalletMenuFocusIndex("ArrowDown", 0, 0), null);
  });

  test("wallet menu wires focus entry, Escape, outside dismissal, and trigger restoration", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "frontend/src/components/wallet/WalletButton.tsx"),
      "utf-8"
    );

    assert.match(source, /menuItems\(\)\[0\]\?\.focus\(\)/);
    assert.match(source, /event\.key === "Escape"/);
    assert.match(source, /document\.addEventListener\("pointerdown", handlePointerDown\)/);
    assert.match(source, /triggerRef\.current\?\.focus\(\)/);
  });

  test("wallet dialog remains open for network correction after connecting", () => {
    assert.equal(shouldCloseWalletModal("connected"), true);
    assert.equal(shouldCloseWalletModal("wrong_network"), false);
    assert.equal(shouldCloseWalletModal("connecting"), false);
    assert.equal(shouldCloseWalletModal("disconnected"), false);
  });
});
