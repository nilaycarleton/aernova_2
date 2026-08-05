import assert from "node:assert/strict";
import { test } from "node:test";
import {
  REQUEST_FILTERS,
  REQUEST_STATUS_META,
  isOpenRequest,
  isOverdue,
  matchesRequestFilter,
} from "../lib/request-status.ts";
import { sinceLabel } from "../lib/relative-time.ts";

const NOW = new Date("2026-07-27T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

test("only the two unanswered states count as open", () => {
  assert.equal(isOpenRequest("NEW"), true);
  assert.equal(isOpenRequest("ASSESSING"), true);
  assert.equal(isOpenRequest("CONVERTED"), false);
  assert.equal(isOpenRequest("CLOSED"), false);
});

test("the default filter is what is still somebody's problem", () => {
  assert.equal(REQUEST_FILTERS[0].value, "OPEN");
  assert.equal(matchesRequestFilter("NEW", "OPEN"), true);
  assert.equal(matchesRequestFilter("CONVERTED", "OPEN"), false);
  assert.equal(matchesRequestFilter("CONVERTED", "CONVERTED"), true);
});

test("a request is not late until it has waited three days", () => {
  assert.equal(isOverdue("NEW", daysAgo(1), NOW), false);
  assert.equal(isOverdue("NEW", daysAgo(3), NOW), false, "exactly three days is still fine");
  assert.equal(isOverdue("NEW", daysAgo(4), NOW), true);
});

test("finished requests are never late, however long they took", () => {
  // A job that took a fortnight to win is not an unanswered request, and amber
  // is reserved for something actually wrong.
  assert.equal(isOverdue("CONVERTED", daysAgo(60), NOW), false);
  assert.equal(isOverdue("CLOSED", daysAgo(60), NOW), false);
});

test("no status label is a database enum", () => {
  for (const [value, meta] of Object.entries(REQUEST_STATUS_META)) {
    assert.notEqual(meta.label, value);
    assert.ok(!meta.label.includes("_"), `${value} label reads as an enum`);
  }
});

test("waiting time reads in the coarsest unit that is still true", () => {
  assert.equal(sinceLabel(NOW, NOW), "Today");
  assert.match(sinceLabel(daysAgo(2), NOW), /2 days ago/);
  assert.match(sinceLabel(daysAgo(45), NOW), /month/);
  assert.match(sinceLabel(daysAgo(400), NOW), /year/);
});
