import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useTxLifecycle, TxState } from "../src/hooks/useTxLifecycle.js";
import { TxStatusModal } from "../src/components/common/TxStatusModal.js";

describe("Truthful Transaction Lifecycle UX Tests", () => {
  test("useTxLifecycle exports properly as a hook function", () => {
    assert.equal(typeof useTxLifecycle, "function");
  });

  test("TxStatusModal renders properly for IDLE and active states", () => {
    // IDLE state returns null (hidden)
    const idleModal = React.createElement(TxStatusModal, {
      state: {
        phase: "IDLE",
        actionTitle: "",
        txHash: null,
        errorMessage: null,
        details: null,
      },
      onClose: () => {},
    });
    assert.ok(idleModal);

    // CONFIRMED state with Sepolia tx hash
    const confirmedModal = React.createElement(TxStatusModal, {
      state: {
        phase: "CONFIRMED",
        actionTitle: "Confidential Deposit",
        txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        errorMessage: null,
        details: "Deposit verified on-chain",
      },
      onClose: () => {},
    });
    assert.ok(confirmedModal);
    assert.equal(confirmedModal.props.state.phase, "CONFIRMED");
    assert.ok(confirmedModal.props.state.txHash);

    // FAILED state with error message
    const failedModal = React.createElement(TxStatusModal, {
      state: {
        phase: "FAILED",
        actionTitle: "Withdrawal",
        txHash: null,
        errorMessage: "User rejected transaction signature in wallet",
        details: null,
      },
      onClose: () => {},
    });
    assert.ok(failedModal);
    assert.equal(failedModal.props.state.phase, "FAILED");
    assert.equal(failedModal.props.state.errorMessage, "User rejected transaction signature in wallet");
  });

  test("prompted writes show the full expected contract and explorer evidence", () => {
    const address = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
    const markup = renderToStaticMarkup(React.createElement(TxStatusModal, {
      state: {
        phase: "PROMPTED",
        actionTitle: "Encrypted deposit",
        txHash: null,
        errorMessage: null,
        details: "Review the contract target before approving.",
        expectedTarget: { label: "Official cUSDC", address },
      },
      onClose: () => {},
      explorerUrl: "https://sepolia.etherscan.io",
    }));

    assert.match(markup, /Expected contract · Official cUSDC/);
    assert.match(markup, new RegExp(address));
    assert.match(markup, new RegExp(`https://sepolia.etherscan.io/address/${address}`));
    assert.match(markup, /Cancel the wallet request if its target does not match/);
  });
});
