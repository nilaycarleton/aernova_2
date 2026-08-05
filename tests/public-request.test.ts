import assert from "node:assert/strict";
import { test } from "node:test";
import { isResubmit, normalizedRequestEmail, RESUBMIT_WINDOW_MS } from "../lib/public-request.ts";

const NOW = new Date("2026-08-04T12:00:00Z");
const MS = 1000;

test("email normalizes to lowercase and trimmed", () => {
  assert.equal(normalizedRequestEmail("  Dave@Acme.com "), "dave@acme.com");
  assert.equal(normalizedRequestEmail("DAVE@ACME.COM"), "dave@acme.com");
});

test("a request seconds ago from the same matched client is a resubmit", () => {
  const justNow = new Date(NOW.getTime() - 10 * MS);
  assert.equal(isResubmit(justNow, NOW), true);
});

test("exactly at the window boundary is not a resubmit", () => {
  const atBoundary = new Date(NOW.getTime() - RESUBMIT_WINDOW_MS);
  assert.equal(isResubmit(atBoundary, NOW), false);
});

test("a request from well outside the window is a new ask, not a resubmit", () => {
  const longAgo = new Date(NOW.getTime() - RESUBMIT_WINDOW_MS - 60 * MS);
  assert.equal(isResubmit(longAgo, NOW), false);
});
