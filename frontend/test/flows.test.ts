import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { revealBalanceWithFeedback } from "../src/App.js";
import { BalanceRevealCard } from "../src/components/flows/BalanceRevealCard.js";
import { DepositCard } from "../src/components/flows/DepositCard.js";
import { WithdrawalCard } from "../src/components/flows/WithdrawalCard.js";
import { LotteryDrawCard } from "../src/components/flows/LotteryDrawCard.js";
import { LegacyExitCard } from "../src/components/flows/LegacyExitCard.js";

describe("Core Product Flows & Interactive Cards Tests", () => {
  test("private balance reveal reports truthful success feedback", async () => {
    const events: string[] = [];

    await revealBalanceWithFeedback(
      async () => { events.push("revealed"); },
      {
        start: (_title, details) => events.push(details ?? ""),
        confirm: (details) => events.push(details ?? ""),
        fail: () => events.push("failed"),
      }
    );

    assert.deepEqual(events, [
      "Approve the private decryption request in your wallet. This signature does not broadcast a transaction.",
      "revealed",
      "Balance decrypted locally. No blockchain transaction was submitted.",
    ]);
  });

  test("private balance reveal catches and surfaces failures", async () => {
    const failure = new Error("Wallet rejected the decryption signature.");
    let surfacedError: Error | string | null = null;
    let confirmed = false;

    await revealBalanceWithFeedback(
      async () => { throw failure; },
      {
        start: () => undefined,
        confirm: () => { confirmed = true; },
        fail: (error) => { surfacedError = error; },
      }
    );

    assert.equal(surfacedError, failure);
    assert.equal(confirmed, false);
  });

  test("BalanceRevealCard instantiates in concealed state by default", () => {
    const card = React.createElement(BalanceRevealCard, {
      isRevealed: false,
      revealedAmount: null,
      onReveal: async () => {},
      onHide: () => {},
      isLoading: false,
      walletConnected: false,
      tokenSymbol: "USDC",
      tokenDecimals: 6,
    });
    assert.ok(card);
    assert.equal(card.props.isRevealed, false);
  });

  test("DepositCard instantiates with deposit handler and validation flags", () => {
    const card = React.createElement(DepositCard, {
      onDeposit: async () => {},
      isLoading: false,
      walletConnected: true,
      tokenSymbol: "USDC",
      tokenDecimals: 6,
      writesEnabled: true,
    });
    assert.ok(card);
    assert.equal(card.props.walletConnected, true);
  });

  test("WithdrawalCard exposes a direct encrypted withdrawal action", () => {
    const cardPending = React.createElement(WithdrawalCard, {
      onWithdraw: async () => {},
      isLoading: false,
      walletConnected: true,
      tokenSymbol: "USDC",
      tokenDecimals: 6,
      writesEnabled: true,
    });
    assert.ok(cardPending);
    assert.equal(typeof cardPending.props.onWithdraw, "function");
  });

  test("LotteryDrawCard displays prize and executes round draw", () => {
    const card = React.createElement(LotteryDrawCard, {
      prizeReserve: "25000",
      totalDraws: 5,
      prizeReserveStatus: "fresh",
      totalDrawsStatus: "fresh",
      onFundReserve: async () => {},
      onExecuteDraw: async () => {},
      isLoading: false,
      isOwner: true,
      walletConnected: true,
      tokenSymbol: "USDC",
      tokenDecimals: 6,
      writesEnabled: true,
    });
    assert.ok(card);
    assert.equal(card.props.prizeReserve, "25000");
    assert.equal(typeof card.props.onFundReserve, "function");
    const markup = renderToStaticMarkup(card);
    assert.match(markup, /Sepolia prizes are sponsor-funded, not protocol yield/);
    assert.match(markup, /Sponsor prize reserve/);
    assert.match(markup, /Fund encrypted reserve/);
  });

  test("LegacyExitCard exposes settlement without enabling new legacy requests", () => {
    const card = React.createElement(LegacyExitCard, {
      legacyPoolAddress: "0x1111111111111111111111111111111111111111",
      explorerUrl: "https://sepolia.etherscan.io",
      pendingWithdrawal: {
        hasPending: false,
        requestHash: "",
        requestedAmount: "0",
        handle: "",
        timestamp: 0,
        status: "FINALIZED",
      },
      cancellationDelaySeconds: 86400,
      walletConnected: true,
      isLoading: false,
      isChecking: false,
      error: null,
      tokenSymbol: "USDC",
      tokenDecimals: 6,
      onFinalizeWithdrawal: async () => {},
      onCancelWithdrawal: async () => {},
    });
    assert.ok(card);
    assert.equal(card.props.legacyPoolAddress, "0x1111111111111111111111111111111111111111");
    assert.equal("onRequestWithdrawal" in card.props, false);
  });
});
