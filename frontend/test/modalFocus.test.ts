import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getWrappedFocusIndex, useModalFocus } from "../src/hooks/useModalFocus.js";

describe("Modal keyboard accessibility", () => {
  test("wraps forward and reverse focus at dialog boundaries", () => {
    assert.equal(getWrappedFocusIndex(2, 3, false), 0);
    assert.equal(getWrappedFocusIndex(0, 3, true), 2);
    assert.equal(getWrappedFocusIndex(1, 3, false), null);
    assert.equal(getWrappedFocusIndex(1, 3, true), null);
  });

  test("moves focus into the dialog when focus starts outside it", () => {
    assert.equal(getWrappedFocusIndex(-1, 3, false), 0);
    assert.equal(getWrappedFocusIndex(-1, 3, true), 2);
    assert.equal(getWrappedFocusIndex(-1, 0, false), null);
  });

  test("exports shared focus management and keeps pending transactions non-dismissible", () => {
    assert.equal(typeof useModalFocus, "function");

    const txModalSource = fs.readFileSync(
      path.join(process.cwd(), "frontend/src/components/common/TxStatusModal.tsx"),
      "utf-8"
    );
    assert.ok(txModalSource.includes("canDismiss: !isPending"));
    assert.ok(txModalSource.includes('aria-describedby="tx-modal-description"'));
  });
});
