import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveDraw, drawAmountCents } from "../lib/invoice/draw.ts";
import { percentToMicros } from "../lib/money.ts";

const QUOTE_TOTAL = 1_000_000; // $10,000

test("a percentage is a share of the quote's total, not of what's left", () => {
  const cents = drawAmountCents({ kind: "PERCENT", micros: percentToMicros(50) }, QUOTE_TOTAL);
  assert.equal(cents, 500_000);
});

test("a flat amount passes through untouched", () => {
  const cents = drawAmountCents({ kind: "AMOUNT", cents: 250_000 }, QUOTE_TOTAL);
  assert.equal(cents, 250_000);
});

test("the first 50% draw is fine against the full remaining balance", () => {
  const result = resolveDraw(
    { kind: "PERCENT", micros: percentToMicros(50) },
    QUOTE_TOTAL,
    QUOTE_TOTAL
  );
  assert.deepEqual(result, { ok: true, amountCents: 500_000 });
});

test("two correct 50% draws add up to the whole quote, not more", () => {
  const first = resolveDraw(
    { kind: "PERCENT", micros: percentToMicros(50) },
    QUOTE_TOTAL,
    QUOTE_TOTAL
  );
  assert.ok(first.ok);
  const remainingAfterFirst = QUOTE_TOTAL - first.amountCents;
  const second = resolveDraw(
    { kind: "PERCENT", micros: percentToMicros(50) },
    QUOTE_TOTAL,
    remainingAfterFirst
  );
  assert.deepEqual(second, { ok: true, amountCents: 500_000 });
});

test("a third 50% draw is refused — the quote is already fully invoiced", () => {
  const result = resolveDraw({ kind: "PERCENT", micros: percentToMicros(50) }, QUOTE_TOTAL, 0);
  assert.equal(result.ok, false);
  assert.ok(!result.ok && /already been fully invoiced/.test(result.error));
});

test("a flat draw larger than what's left is refused, not clamped", () => {
  const result = resolveDraw({ kind: "AMOUNT", cents: 600_000 }, QUOTE_TOTAL, 500_000);
  assert.equal(result.ok, false);
  assert.ok(!result.ok && /still left to invoice/.test(result.error));
});

test("zero and negative draws are refused", () => {
  const zero = resolveDraw({ kind: "AMOUNT", cents: 0 }, QUOTE_TOTAL, QUOTE_TOTAL);
  assert.equal(zero.ok, false);
  const negative = resolveDraw({ kind: "AMOUNT", cents: -500 }, QUOTE_TOTAL, QUOTE_TOTAL);
  assert.equal(negative.ok, false);
});

test("no amount at all is refused with a plain ask", () => {
  const result = resolveDraw(null, QUOTE_TOTAL, QUOTE_TOTAL);
  assert.equal(result.ok, false);
  assert.ok(!result.ok && /amount greater than zero/.test(result.error));
});
