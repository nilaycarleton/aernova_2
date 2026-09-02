import assert from "node:assert/strict";
import { test } from "node:test";
import { formatReadoutValue, isReadoutEmpty } from "../lib/numeric-readout.ts";

test("null and undefined render as a muted em dash, not zero or blank", () => {
  assert.equal(formatReadoutValue(null), "—");
  assert.equal(formatReadoutValue(undefined), "—");
  assert.equal(isReadoutEmpty(null), true);
  assert.equal(isReadoutEmpty(undefined), true);
});

test("an empty string is treated the same as missing", () => {
  assert.equal(formatReadoutValue(""), "—");
  assert.equal(formatReadoutValue("   "), "—");
  assert.equal(isReadoutEmpty(""), true);
});

test("a caller-formatted string passes through verbatim", () => {
  assert.equal(formatReadoutValue("$18,775.00"), "$18,775.00");
  assert.equal(formatReadoutValue("6/12"), "6/12");
  assert.equal(formatReadoutValue("−$1,250.00"), "−$1,250.00", "negative values are the caller's own formatting");
});

test("a plain number gets thousands grouping, nothing else", () => {
  assert.equal(formatReadoutValue(37), "37");
  assert.equal(formatReadoutValue(999999), "999,999");
  assert.equal(formatReadoutValue(0), "0", "zero is a real value, not empty");
  assert.equal(isReadoutEmpty(0), false);
});

test("non-finite numbers (NaN, Infinity) render as empty rather than a broken string", () => {
  assert.equal(formatReadoutValue(Number.NaN), "—");
  assert.equal(formatReadoutValue(Number.POSITIVE_INFINITY), "—");
  assert.equal(isReadoutEmpty(Number.NaN), true);
});
