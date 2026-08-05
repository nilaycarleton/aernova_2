import test from "node:test";
import assert from "node:assert/strict";
import {
  toCents,
  toDollars,
  lineAmountCents,
  percentOfCents,
  formatMoney,
  parseMoneyToCents,
} from "../lib/money.ts";

test("toCents rounds to the nearest cent", () => {
  assert.equal(toCents(0), 0);
  assert.equal(toCents(8950), 895000);
  assert.equal(toCents(10277.35), 1027735);
  assert.equal(toCents(0.005), 1);
});

test("toCents cleans up float noise from computed totals", () => {
  // Straight from report-generator: a markup/tax chain lands on values like this.
  assert.equal(toCents(3664.1000000000004), 366410);
  assert.equal(toCents(0.1 + 0.2), 30);
});

test("the two entry points disagree on half-cents, and that is the point", () => {
  // Once 1.005 is a double it is 1.00499999999999989 — the half-cent is already
  // gone, and no rounding rule recovers it. toCents is honest about that.
  assert.equal(toCents(1.005), 100);
  // Reading the digits off the string never loses it. Anything a person types
  // or is charged goes through this path.
  assert.deepEqual(parseMoneyToCents("1.005"), { cents: 101 });
});

test("round-trips through dollars", () => {
  assert.equal(toDollars(toCents(1234.56)), 1234.56);
  assert.equal(toDollars(1027735), 10277.35);
});

test("line amounts land on whole cents for fractional quantities", () => {
  // 230.5 ft of drip edge at $3.50/ft.
  assert.equal(lineAmountCents(350, 230.5), 80675);
  assert.equal(Number.isInteger(lineAmountCents(425, 33.67)), true);
});

test("line amounts sum to the subtotal with no per-line drift", () => {
  // Three lines that individually don't land on a cent boundary. Rounding once
  // per line is what keeps the printed lines and the printed total agreeing.
  const lines = [
    lineAmountCents(1999, 3.33),
    lineAmountCents(349, 17.5),
    lineAmountCents(12500, 1.5),
  ];
  const subtotal = lines.reduce((sum, line) => sum + line, 0);
  assert.equal(subtotal, 6657 + 6108 + 18750);
  assert.equal(Number.isInteger(subtotal), true);
});

test("percentOfCents computes tax and deposits", () => {
  // HST on the $9,095.00 subtotal from a real estimate: $1,182.35.
  assert.equal(percentOfCents(909500, 13), 118235);
  // A 50% deposit on $10,277.35 is $5,138.675 — must land on a cent.
  assert.equal(percentOfCents(1027735, 50), 513868);
});

test("formatMoney always shows cents", () => {
  // $8,950 and $8,950.00 are the same number, but only one reads as a price.
  assert.equal(formatMoney(895000), "$8,950.00");
  assert.equal(formatMoney(1027735), "$10,277.35");
  assert.equal(formatMoney(0), "$0.00");
  assert.equal(formatMoney(null), "$0.00");
  assert.equal(formatMoney(undefined), "$0.00");
});

test("parseMoneyToCents accepts what a roofer actually types", () => {
  assert.deepEqual(parseMoneyToCents("1200"), { cents: 120000 });
  assert.deepEqual(parseMoneyToCents("$12,400"), { cents: 1240000 });
  assert.deepEqual(parseMoneyToCents("  1200.50  "), { cents: 120050 });
});

test("parseMoneyToCents treats blank as absent, not as zero", () => {
  // The total is optional on a draft; blank must not become $0.00.
  assert.deepEqual(parseMoneyToCents(""), { cents: null });
  assert.deepEqual(parseMoneyToCents("   "), { cents: null });
});

test("parseMoneyToCents reports bad input instead of throwing", () => {
  const notANumber = parseMoneyToCents("about ten grand");
  assert.equal(notANumber.cents, null);
  assert.ok(notANumber.error);

  const negative = parseMoneyToCents("-50");
  assert.equal(negative.cents, null);
  assert.ok(negative.error);
});
