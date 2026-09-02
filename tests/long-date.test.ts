import assert from "node:assert/strict";
import { test } from "node:test";
import { longDate } from "../lib/long-date.ts";

test("a confirmed date reads as a long English date, never numeric", () => {
  assert.equal(longDate(new Date(2026, 7, 9)), "August 9, 2026");
});

test("no time of day and no relative wording appear anywhere in the output", () => {
  const label = longDate(new Date(2026, 7, 9, 14, 32));
  assert.ok(!label!.includes(":"), "no time of day");
  assert.ok(!/ago|today|yesterday/i.test(label!), "no relative phrasing");
  assert.ok(!/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(label!), "no numeric date");
});

test("a string date parses the same as a Date object", () => {
  assert.equal(longDate("2026-08-09T00:00:00.000Z"), longDate(new Date("2026-08-09T00:00:00.000Z")));
});

test("null or missing input is null, not a formatting error", () => {
  assert.equal(longDate(null), null);
  assert.equal(longDate(undefined), null);
  assert.equal(longDate(""), null);
});

test("an unparseable date is null, not 'Invalid Date' on a document a homeowner reads", () => {
  assert.equal(longDate("not a date"), null);
});

test("a bare yyyy-mm-dd date-input value reads as the day it names, not shifted by local timezone", () => {
  assert.equal(longDate("2026-08-12"), "August 12, 2026");
});
