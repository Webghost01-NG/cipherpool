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

  test("Header leaves wallet identity rendering to the wallet control", () => {
    const headerPath = path.join(process.cwd(), "frontend/src/components/layout/Header.tsx");
    const content = fs.readFileSync(headerPath, "utf-8");
    const element = React.createElement(Header);

    assert.ok(element);
    assert.ok(content.includes("<WalletButton />"), "Wallet control is present");
    assert.ok(!content.includes("contractAddress"), "Contract address is not rendered as wallet identity");
    assert.ok(!content.includes("contract-chip"), "Misleading contract chip is absent");
  });
});
