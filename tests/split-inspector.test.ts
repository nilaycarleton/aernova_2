import assert from "node:assert/strict";
import { test } from "node:test";
import { isSplitViewport, SPLIT_INSPECTOR_BREAKPOINT_PX } from "../lib/split-inspector.ts";

test("the split breakpoint sits above the shell's own 1024px sidebar breakpoint", () => {
  assert.ok(
    SPLIT_INSPECTOR_BREAKPOINT_PX > 1024,
    "splitting at the same width the sidebar expands at would leave the main pane too narrow",
  );
});

test("viewport just below the breakpoint stays single-pane (sheet)", () => {
  assert.equal(isSplitViewport(SPLIT_INSPECTOR_BREAKPOINT_PX - 1), false);
});

test("viewport at or above the breakpoint is a true split", () => {
  assert.equal(isSplitViewport(SPLIT_INSPECTOR_BREAKPOINT_PX), true);
  assert.equal(isSplitViewport(1728), true);
});

test("phone and tablet widths are always single-pane", () => {
  assert.equal(isSplitViewport(390), false);
  assert.equal(isSplitViewport(768), false);
  assert.equal(isSplitViewport(1024), false);
});
