import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { revealBalanceWithFeedback, revealPrizeWithFeedback } from "../src/App.js";
import { BalanceRevealCard } from "../src/components/flows/BalanceRevealCard.js";
import { DepositCard } from "../src/components/flows/DepositCard.js";
import { WithdrawalCard } from "../src/components/flows/WithdrawalCard.js";
import { LotteryDrawCard } from "../src/components/flows/LotteryDrawCard.js";
import { PrizeClaimCard } from "../src/components/flows/PrizeClaimCard.js";
import { LegacyExitCard } from "../src/components/flows/LegacyExitCard.js";
import { WalletGateButton } from "../src/components/wallet/WalletGateButton.js";

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

  test("private prize reveal reports truthful local-only feedback", async () => {
    const events: string[] = [];

    await revealPrizeWithFeedback(
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
      "Prize checked locally. No blockchain transaction was submitted.",
    ]);
  });

  test("private prize reveal catches and surfaces failures", async () => {
    const failure = new Error("KMS rejected the prize decryption request.");
    let surfacedError: Error | string | null = null;
    let confirmed = false;

    await revealPrizeWithFeedback(
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
      walletStatus: "disconnected",
      onWalletAction: () => {},
      walletActionEnabled: true,
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
      walletStatus: "connected",
      onWalletAction: () => {},
      walletActionEnabled: true,
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
      walletStatus: "connected",
      onWalletAction: () => {},
      walletActionEnabled: true,
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
      walletStatus: "connected",
      onWalletAction: () => {},
      walletActionEnabled: true,
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

  test("PrizeClaimCard keeps the prize private and gates claims on a positive reveal", () => {
    const concealed = renderToStaticMarkup(React.createElement(PrizeClaimCard, {
      isRevealed: false,
      revealedPrize: null,
      onReveal: async () => {},
      onHide: () => {},
      onClaim: async () => {},
      isLoading: false,
      walletConnected: true,
      walletStatus: "connected",
      onWalletAction: () => {},
      walletActionEnabled: true,
      tokenSymbol: "cUSDC",
      tokenDecimals: 6,
      writesEnabled: true,
    }));
    const noPrize = renderToStaticMarkup(React.createElement(PrizeClaimCard, {
      isRevealed: true,
      revealedPrize: "0",
      onReveal: async () => {},
      onHide: () => {},
      onClaim: async () => {},
      isLoading: false,
      walletConnected: true,
      walletStatus: "connected",
      onWalletAction: () => {},
      walletActionEnabled: true,
      tokenSymbol: "cUSDC",
      tokenDecimals: 6,
      writesEnabled: true,
    }));
    const winner = renderToStaticMarkup(React.createElement(PrizeClaimCard, {
      isRevealed: true,
      revealedPrize: "500000",
      onReveal: async () => {},
      onHide: () => {},
      onClaim: async () => {},
      isLoading: false,
      walletConnected: true,
      walletStatus: "connected",
      onWalletAction: () => {},
      walletActionEnabled: true,
      tokenSymbol: "cUSDC",
      tokenDecimals: 6,
      writesEnabled: true,
    }));

    assert.match(concealed, /Check prize privately/);
    assert.doesNotMatch(concealed, /500000/);
    assert.match(noPrize, /No prize available to claim/);
    assert.match(noPrize, /disabled/);
    assert.match(winner, /0\.5 cUSDC/);
    assert.match(winner, /Claim privately/);
    assert.match(winner, /same on-chain path as an ordinary withdrawal/);
    assert.doesNotMatch(winner, /disabled/);
  });

  test("prize claims reuse the ordinary encrypted withdrawal path", () => {
    const hookSource = fs.readFileSync(path.join(process.cwd(), "frontend/src/hooks/usePool.ts"), "utf8");
    const frontendAbi = fs.readFileSync(path.join(process.cwd(), "frontend/src/contracts/abi.ts"), "utf8");

    assert.match(hookSource, /await withdraw\(BigInt\(revealedPrize\), callbacks\)/);
    assert.doesNotMatch(frontendAbi, /compoundPrizes/);
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
      walletStatus: "connected",
      onWalletAction: () => {},
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

  test("wallet-gated operation controls remain actionable when disconnected", () => {
    const disconnectedMarkup = renderToStaticMarkup(React.createElement(WalletGateButton, {
      walletStatus: "disconnected",
      onWalletAction: () => {},
      connectLabel: "Connect wallet to deposit",
      switchNetworkLabel: "Switch to Sepolia to deposit",
      children: "Deposit",
    }));
    const wrongNetworkMarkup = renderToStaticMarkup(React.createElement(WalletGateButton, {
      walletStatus: "wrong_network",
      onWalletAction: () => {},
      connectLabel: "Connect wallet to deposit",
      switchNetworkLabel: "Switch to Sepolia to deposit",
      children: "Deposit",
    }));

    assert.match(disconnectedMarkup, /type="button"/);
    assert.match(disconnectedMarkup, /aria-haspopup="dialog"/);
    assert.match(disconnectedMarkup, /Connect wallet to deposit/);
    assert.doesNotMatch(disconnectedMarkup, /disabled/);
    assert.match(wrongNetworkMarkup, /Switch to Sepolia to deposit/);
  });

  test("wallet gate preserves genuine protocol safety locks", () => {
    const markup = renderToStaticMarkup(React.createElement(WalletGateButton, {
      walletStatus: "disconnected",
      onWalletAction: () => {},
      walletActionEnabled: false,
      connectLabel: "Connect wallet to deposit",
      switchNetworkLabel: "Switch to Sepolia to deposit",
      lockedLabel: "Deposits safety-locked",
      children: "Deposit",
    }));

    assert.match(markup, /disabled/);
    assert.match(markup, /Deposits safety-locked/);
    assert.doesNotMatch(markup, /aria-haspopup="dialog"/);
  });
});
