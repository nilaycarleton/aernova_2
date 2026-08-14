import assert from "node:assert/strict";
import { test } from "node:test";
import { characterCounterState, characterCounterText } from "../lib/char-counter.ts";

test("below the minimum counts up toward it", () => {
  assert.equal(characterCounterText(0, 20, 500), "20 more characters required");
  assert.equal(characterCounterText(19, 20, 500), "1 more character required");
  assert.equal(characterCounterState(0, 20, 500), "under");
});

test("at or above the minimum counts down toward the ceiling", () => {
  assert.equal(characterCounterText(20, 20, 500), "480 characters remaining");
  assert.equal(characterCounterText(499, 20, 500), "1 character remaining");
  assert.equal(characterCounterState(20, 20, 500), "in-range");
});

test("past the ceiling is a distinct over-limit state", () => {
  assert.equal(characterCounterState(501, 20, 500), "over");
  assert.equal(characterCounterText(501, 20, 500), "-1 characters remaining");
});

test("matches the validated OWNER_OVERRIDE numbers from lib/invoice/addon-override.ts", () => {
  // Same 20/500 bounds, same copy shape as the field this doctrine was generalized from.
  assert.equal(characterCounterText(10, 20, 500), "10 more characters required");
});
