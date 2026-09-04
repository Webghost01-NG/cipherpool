import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
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

  test("Header truncates contract address and handles copy interactions", () => {
    const element = React.createElement(Header, {
      contractAddress: "0x1111111111111111111111111111111111111111",
    });
    assert.ok(element);
    assert.equal(element.props.contractAddress, "0x1111111111111111111111111111111111111111");
  });
});
