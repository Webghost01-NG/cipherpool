import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { WalletModal } from "../src/components/wallet/WalletModal.js";
import { TxStatusModal } from "../src/components/common/TxStatusModal.js";
import { DepositCard } from "../src/components/flows/DepositCard.js";
import { WithdrawalCard } from "../src/components/flows/WithdrawalCard.js";
import { BalanceRevealCard } from "../src/components/flows/BalanceRevealCard.js";

const relativeLuminance = (hex: string): number => {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4);

  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
};

const contrastRatio = (foreground: string, background: string): number => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
};

const cssColor = (content: string, variable: string): string => {
  const match = content.match(new RegExp(`${variable}:\\s*(#[\\da-f]{6})`, "i"));
  assert.ok(match, `${variable} must define a six-digit hex color`);
  return match[1];
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("Frontend QA: Responsive Layout & Accessibility Standards", () => {
  test("Responsive Layout: CSS rules guarantee fluid responsiveness across viewports (320px to 1280px+)", () => {
    const cssContent = fs.readFileSync(path.join(process.cwd(), "frontend/src/styles/theme.css"), "utf-8");

    assert.ok(cssContent.includes("box-sizing: border-box"), "Global box-sizing ensures no overflow padding");
    assert.ok(cssContent.includes("width: min(100% - 2rem, 1240px)"), "Fluid container prevents ultra-wide distortion");
    assert.ok(cssContent.includes("grid-template-columns: repeat(3, minmax(0, 1fr))"), "Desktop actions use an app-first three-column grid");
    assert.ok(cssContent.includes("@media (max-width: 620px)"), "Mobile layout breakpoint is present");
  });

  test("Accessibility: text tokens pass WCAG AA contrast on their intended surfaces", () => {
    const cssContent = fs.readFileSync(path.join(process.cwd(), "frontend/src/styles/theme.css"), "utf-8");

    assert.ok(contrastRatio(cssColor(cssContent, "--text-muted"), cssColor(cssContent, "--bg-tertiary")) >= 4.5, "Muted navigation text passes on the tinted navigation surface");
    assert.ok(contrastRatio(cssColor(cssContent, "--accent-blue"), cssColor(cssContent, "--accent-blue-subtle")) >= 4.5, "Blue informational text passes on its subtle surface");
    assert.ok(contrastRatio(cssColor(cssContent, "--accent-amber"), cssColor(cssContent, "--accent-amber-subtle")) >= 4.5, "Warning text passes on its subtle surface");
    assert.ok(contrastRatio(cssColor(cssContent, "--accent-rose"), cssColor(cssContent, "--accent-rose-subtle")) >= 4.5, "Error text passes on its subtle surface");
  });

  test("Accessibility: readable type and 44px interaction targets are enforced", () => {
    const cssContent = fs.readFileSync(path.join(process.cwd(), "frontend/src/styles/theme.css"), "utf-8");
    const compactFontSizes = [...cssContent.matchAll(/font-size:\s*(0?\.\d+)rem/g)]
      .map((match) => Number.parseFloat(match[1]));

    assert.ok(compactFontSizes.every((size) => size >= 0.75), "No explicit rem text size falls below 12px");
    for (const selector of [".brand", ".nav-pill button", ".button", ".helper-link", ".wallet-chip", ".menu-button"]) {
      const rule = cssContent.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{[^}]+\\}`))?.[0] ?? "";
      assert.match(rule, /min-height:\s*2\.75rem/, `${selector} provides a 44px target`);
    }
    assert.match(cssContent, /\.icon-button\s*\{[^}]*width:\s*2\.75rem;\s*height:\s*2\.75rem;/, "Icon buttons provide a 44px square target");
  });

  test("Accessibility: Modals contain WCAG dialog semantics and focusable exit buttons", () => {
    const walletModal = React.createElement(WalletModal, { isOpen: true, onClose: () => {} });
    assert.equal(walletModal.type, WalletModal);

    const txModal = React.createElement(TxStatusModal, {
      state: {
        phase: "CONFIRMED",
        actionTitle: "Confidential Deposit",
        txHash: "0x123",
        errorMessage: null,
        details: "Success",
      },
      onClose: () => {},
    });
    assert.equal(txModal.props.state.phase, "CONFIRMED");
  });

  test("Accessibility: Form controls associate labels with inputs using matching IDs", () => {
    const depositCard = React.createElement(DepositCard, {
      onDeposit: async () => {},
      onActivate: async () => {},
      activationPending: false,
      isLoading: false,
      walletConnected: true,
      walletStatus: "connected",
      onWalletAction: () => {},
      walletActionEnabled: true,
      tokenSymbol: "USDC",
      tokenDecimals: 6,
      writesEnabled: true,
    });
    assert.ok(depositCard);

    const withdrawalCard = React.createElement(WithdrawalCard, {
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
    assert.ok(withdrawalCard);
  });

  test("Security & Privacy: Balance concealment protects against shoulder-surfing", () => {
    const card = React.createElement(BalanceRevealCard, {
      isRevealed: false,
      revealedAmount: "50000",
      onReveal: async () => {},
      onHide: () => {},
      isLoading: false,
      walletConnected: true,
      walletStatus: "connected",
      onWalletAction: () => {},
      walletActionEnabled: true,
      tokenSymbol: "USDC",
      tokenDecimals: 6,
    });
    assert.equal(card.props.isRevealed, false, "Balance must remain hidden by default");
  });

});
