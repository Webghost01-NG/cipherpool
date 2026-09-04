import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "../src/App.js";
import { Header } from "../src/components/layout/Header.js";
import { Footer } from "../src/components/layout/Footer.js";
import { Card, Badge, Button, StatBox } from "../src/components/common/UIPrimitives.js";

describe("Frontend Foundation & Design System Tests", () => {
  test("theme.css defines required WCAG-accessible CSS variables and reduced motion query", () => {
    const cssPath = path.join(process.cwd(), "frontend/src/styles/theme.css");
    const content = fs.readFileSync(cssPath, "utf-8");

    assert.ok(content.includes("--bg-primary: #ffffff"), "White page background defined");
    assert.ok(content.includes("--bg-card: #ffffff"), "White card surface defined");
    assert.ok(content.includes("--accent-blue: #3157f6"), "Primary blue interaction accent defined");
    assert.ok(content.includes("--accent-emerald: #087f5b"), "Accessible success accent defined");
    assert.ok(content.includes("prefers-reduced-motion: reduce"), "Accessibility reduced-motion query present");
    assert.ok(content.includes(":focus-visible"), "Visible focus ring defined");
  });

  test("document declares repository-owned SVG and ICO favicons", () => {
    const html = fs.readFileSync(path.join(process.cwd(), "frontend/index.html"), "utf-8");
    const publicDirectory = path.join(process.cwd(), "frontend/public");

    assert.match(html, /href="\/favicon\.svg" type="image\/svg\+xml"/);
    assert.match(html, /href="\/favicon\.ico" sizes="any"/);
    assert.equal(fs.existsSync(path.join(publicDirectory, "favicon.svg")), true);
    assert.equal(fs.existsSync(path.join(publicDirectory, "favicon.ico")), true);
    assert.equal(fs.existsSync(path.join(publicDirectory, "veylott-mark.svg")), true);
  });

  test("App presents live state and primary savings actions in an app-first layout", () => {
    const appPath = path.join(process.cwd(), "frontend/src/App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");

    assert.ok(content.includes('className="console-intro"'), "Compact console introduction is present");
    assert.ok(content.includes('className="protocol-frame"'), "Live protocol overview is present");
    assert.ok(content.includes('className="operations-grid"'), "Primary actions share the operations grid");
    assert.ok(content.indexOf("<BalanceRevealCard") < content.indexOf("<DepositCard"), "Private balance appears before funding");
    assert.ok(content.indexOf("<DepositCard") < content.indexOf("<WithdrawalCard"), "Funding appears before withdrawal");
  });

  test("Layout components export properly as valid React elements", () => {
    assert.equal(typeof App, "function");
    assert.equal(typeof Header, "function");
    assert.equal(typeof Footer, "function");
    assert.equal(typeof Card, "function");
    assert.equal(typeof Badge, "function");
    assert.equal(typeof Button, "function");
    assert.equal(typeof StatBox, "function");
  });

  test("Loading buttons retain one accessible label while showing a decorative spinner", () => {
    const markup = renderToStaticMarkup(
      React.createElement(Button, { isLoading: true }, "Deposit privately")
    );

    assert.match(markup, /disabled=""/);
    assert.match(markup, /aria-busy="true"/);
    assert.match(markup, /aria-hidden="true"/);
    assert.match(markup, /<span class="sr-only">Deposit privately<\/span>/);
    assert.equal((markup.match(/Deposit privately/g) ?? []).length, 1);
  });

  test("Pool metrics distinguish loading, loaded-zero, and stale failure states", () => {
    const loadingMarkup = renderToStaticMarkup(
      React.createElement(StatBox, {
        label: "Prize reserve",
        value: "0 USDC",
        subtext: "Sponsor-funded on Sepolia",
        status: "loading",
      })
    );
    const loadedZeroMarkup = renderToStaticMarkup(
      React.createElement(StatBox, {
        label: "Prize reserve",
        value: "0 USDC",
        subtext: "Sponsor-funded on Sepolia",
        status: "fresh",
      })
    );
    const pendingMarkup = renderToStaticMarkup(
      React.createElement(StatBox, {
        label: "Eligible weight",
        value: "0 USDC",
        subtext: "New pool; appears after the first finalized draw",
        status: "pending",
      })
    );
    const staleMarkup = renderToStaticMarkup(
      React.createElement(StatBox, {
        label: "Prize reserve",
        value: "25 USDC",
        subtext: "Sponsor-funded on Sepolia",
        status: "stale",
      })
    );

    assert.doesNotMatch(loadingMarkup, /aria-label=/);
    assert.match(loadingMarkup, /aria-busy="true"/);
    assert.match(loadingMarkup, /<span class="sr-only">Prize reserve loading<\/span>/);
    assert.doesNotMatch(loadingMarkup, />0 USDC</);
    assert.match(loadedZeroMarkup, />0 USDC<\/strong>/);
    assert.match(pendingMarkup, />Awaiting round<\/span>/);
    assert.doesNotMatch(pendingMarkup, />0 USDC<\/strong>/);
    assert.match(staleMarkup, />Stale<\/span>/);
    assert.match(staleMarkup, />25 USDC<\/strong>/);
    assert.match(staleMarkup, /Last confirmed value/);
  });

  test("Header leaves wallet identity rendering to the wallet control", () => {
    const headerPath = path.join(process.cwd(), "frontend/src/components/layout/Header.tsx");
    const content = fs.readFileSync(headerPath, "utf-8");
    const element = React.createElement(Header);

    assert.ok(element);
    assert.match(content, /Veylott/);
    assert.match(content, /\/veylott-mark\.svg/);
    assert.doesNotMatch(content, /Fingerprint/);
    assert.ok(content.includes("<WalletButton />"), "Wallet control is present");
    assert.ok(!content.includes("contractAddress"), "Contract address is not rendered as wallet identity");
    assert.ok(!content.includes("contract-chip"), "Misleading contract chip is absent");
  });
});
