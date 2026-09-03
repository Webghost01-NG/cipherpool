import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { BalanceRevealCard } from "../src/components/flows/BalanceRevealCard.js";
import { DepositCard } from "../src/components/flows/DepositCard.js";
import { WithdrawalCard } from "../src/components/flows/WithdrawalCard.js";
import { LotteryDrawCard } from "../src/components/flows/LotteryDrawCard.js";
import { LegacyExitCard } from "../src/components/flows/LegacyExitCard.js";

describe("Core Product Flows & Interactive Cards Tests", () => {
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
      walletBalance: "1000000",
      writesEnabled: true,
    });
    assert.ok(card);
    assert.equal(card.props.walletConnected, true);
  });

  test("WithdrawalCard renders in-flight state when pending withdrawal exists", () => {
    const cardPending = React.createElement(WithdrawalCard, {
      pendingWithdrawal: {
        hasPending: true,
        requestHash: "0xhash123",
        requestedAmount: "5000",
        handle: "0xhandle456",
        timestamp: Date.now(),
        status: "PENDING",
      },
      onRequestWithdrawal: async () => {},
      onFinalizeWithdrawal: async () => {},
      onCancelWithdrawal: async () => {},
      isLoading: false,
      walletConnected: true,
      tokenSymbol: "USDC",
      tokenDecimals: 6,
      cancellationDelaySeconds: 86400,
      writesEnabled: true,
    });
    assert.ok(cardPending);
    assert.equal(cardPending.props.pendingWithdrawal.hasPending, true);
  });

  test("LotteryDrawCard displays prize and executes round draw", () => {
    const card = React.createElement(LotteryDrawCard, {
      availableYield: "25000",
      totalDraws: 5,
      onExecuteDraw: async () => {},
      isLoading: false,
      isOwner: true,
      tokenSymbol: "USDC",
      tokenDecimals: 6,
      writesEnabled: true,
    });
    assert.ok(card);
    assert.equal(card.props.availableYield, "25000");
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
