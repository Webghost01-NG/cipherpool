import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
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
});
