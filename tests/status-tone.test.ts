import assert from "node:assert/strict";
import { test } from "node:test";
import { statusBadgeVariant, statusDotVariant } from "../lib/status-tone.ts";

test("every tone maps to a valid StatusDot variant", () => {
  assert.equal(statusDotVariant("neutral"), "neutral");
  assert.equal(statusDotVariant("info"), "accent", "StatusDot has no info variant of its own");
  assert.equal(statusDotVariant("success"), "success");
  assert.equal(statusDotVariant("caution"), "warning");
  assert.equal(statusDotVariant("danger"), "error");
});

test("every tone maps to a valid Badge variant", () => {
  assert.equal(statusBadgeVariant("neutral"), "neutral");
  assert.equal(statusBadgeVariant("info"), "info", "Badge names info directly, unlike StatusDot");
  assert.equal(statusBadgeVariant("success"), "success");
  assert.equal(statusBadgeVariant("caution"), "warning");
  assert.equal(statusBadgeVariant("danger"), "error");
});
