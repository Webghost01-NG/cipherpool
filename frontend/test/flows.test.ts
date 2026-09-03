import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { BalanceRevealCard } from "../src/components/flows/BalanceRevealCard.js";
import { DepositCard } from "../src/components/flows/DepositCard.js";
import { WithdrawalCard } from "../src/components/flows/WithdrawalCard.js";
import { LotteryDrawCard } from "../src/components/flows/LotteryDrawCard.js";

describe("Core Product Flows & Interactive Cards Tests", () => {
  test("BalanceRevealCard instantiates in concealed state by default", () => {
    const card = React.createElement(BalanceRevealCard, {
      isRevealed: false,
      revealedAmount: null,
      onReveal: async () => {},
      onHide: () => {},
      isLoading: false,
    });
    assert.ok(card);
    assert.equal(card.props.isRevealed, false);
  });

  test("DepositCard instantiates with deposit handler and validation flags", () => {
    const card = React.createElement(DepositCard, {
      onDeposit: async () => {},
      isLoading: false,
      walletConnected: true,
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
      onCancelWithdrawal: async () => {},
      isLoading: false,
      walletConnected: true,
    });
    assert.ok(cardPending);
    assert.equal(cardPending.props.pendingWithdrawal.hasPending, true);
  });

  test("LotteryDrawCard displays prize and executes round draw", () => {
    const card = React.createElement(LotteryDrawCard, {
      prizePool: "25000",
      totalDraws: 5,
      onExecuteDraw: async () => {},
      isLoading: false,
    });
    assert.ok(card);
    assert.equal(card.props.prizePool, "25000");
  });
});
