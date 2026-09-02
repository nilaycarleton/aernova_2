import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeTotals,
  lineTotalCents,
  markupPercent,
  priceFromMarkup,
} from "../lib/quote/totals.ts";
import { percentToMicros } from "../lib/money.ts";

// The sample quote from the 2026-07-28 screenshots, to the cent.
const SAMPLE = [
  { quantity: 1, unitPriceCents: 680_000, unitCostCents: 410_000 },
  { quantity: 1, unitPriceCents: 45_000, unitCostCents: 17_500 },
  { quantity: 1, unitPriceCents: 25_000, unitCostCents: 8_000 },
];

test("the sample quote reproduces Jobber's figures exactly", () => {
  const t = computeTotals(SAMPLE);
  assert.equal(t.subtotalCents, 750_000, "$7,500.00");
  assert.equal(t.costCents, 435_500, "$4,355.00");
  assert.equal(t.marginCents, 314_500, "$3,145.00");
  assert.equal(t.marginPercent?.toFixed(2), "41.93", "margin is a share of price");
});

test("margin percent is invariant to tax — it's a share of price, not of what the client pays", () => {
  // Same $7,500/$4,355/$3,145 quote as above, with a 13% tax rate added. Tax
  // collected isn't profit, so marginPercent must read the same 41.93%
  // whether or not a tax rate is set — a regression here previously divided
  // by the tax-inclusive total instead, quietly deflating every taxed quote.
  const t = computeTotals(SAMPLE, { taxRateMicros: percentToMicros(13) });
  assert.equal(t.marginCents, 314_500, "tax doesn't touch the margin itself");
  assert.notEqual(t.taxableCents, t.totalCents, "sanity: tax is actually being added");
  assert.equal(t.marginPercent?.toFixed(2), "41.93", "margin is a share of price, not of price+tax");
});

test("markup is derived from the cost/price pair, as the popover shows", () => {
  assert.equal(markupPercent(410_000, 680_000)?.toFixed(2), "65.85");
  assert.equal(markupPercent(17_500, 45_000)?.toFixed(2), "157.14");
  assert.equal(markupPercent(8_000, 25_000)?.toFixed(1), "212.5");
});

test("markup on no cost is undefined, not zero and not infinite", () => {
  assert.equal(markupPercent(null, 45_000), null);
  assert.equal(markupPercent(0, 45_000), null);
});

test("markup round-trips back to a price", () => {
  assert.equal(priceFromMarkup(410_000, 65.85), 679_985);
  assert.equal(priceFromMarkup(8_000, 212.5), 25_000);
});

test("an optional line is counted, but not into the subtotal", () => {
  const t = computeTotals([
    ...SAMPLE,
    { quantity: 1, unitPriceCents: 80_000, unitCostCents: 30_000, isOptional: true },
  ]);
  assert.equal(t.subtotalCents, 750_000, "the upsell must not inflate the total");
  assert.equal(t.optionalCents, 80_000);
  assert.equal(t.costCents, 435_500, "nor its cost, until they say yes");
});

test("an extra they ticked joins the bill, cost and all", () => {
  const t = computeTotals([
    ...SAMPLE,
    { quantity: 1, unitPriceCents: 80_000, unitCostCents: 30_000, isOptional: true, isAccepted: true },
  ]);
  assert.equal(t.subtotalCents, 750_000, "the subtotal is still the work as quoted");
  assert.equal(t.acceptedOptionalCents, 80_000);
  assert.equal(t.optionalCents, 0, "it is no longer on offer — it is bought");
  assert.equal(t.totalCents, 830_000);
  assert.equal(t.costCents, 465_500, "the extra costs money to do");
  assert.equal(t.marginCents, 364_500);
});

test("only the extras they ticked are added", () => {
  const t = computeTotals([
    ...SAMPLE,
    { quantity: 1, unitPriceCents: 80_000, isOptional: true, isAccepted: true },
    { quantity: 1, unitPriceCents: 25_000, isOptional: true },
  ]);
  assert.equal(t.acceptedOptionalCents, 80_000);
  assert.equal(t.optionalCents, 25_000, "the one they left sits outside the total");
  assert.equal(t.totalCents, 830_000);
});

test("an extra is taxed like everything else on the bill", () => {
  const t = computeTotals(
    [{ quantity: 1, unitPriceCents: 100_000 }, { quantity: 1, unitPriceCents: 80_000, isOptional: true, isAccepted: true }],
    { taxRateMicros: percentToMicros(13) }
  );
  assert.equal(t.taxableCents, 180_000);
  assert.equal(t.taxCents, 23_400, "13% of $1,800, extra included");
  assert.equal(t.totalCents, 203_400);
});

test("a percentage discount does not quietly come off an extra they added", () => {
  // Ticking the $800 box must move the total by $800, or the number beside the
  // checkbox is a number the homeowner cannot reconcile.
  const base = computeTotals(SAMPLE, { discount: { kind: "PERCENT", micros: percentToMicros(10) } });
  const withExtra = computeTotals(
    [...SAMPLE, { quantity: 1, unitPriceCents: 80_000, isOptional: true, isAccepted: true }],
    { discount: { kind: "PERCENT", micros: percentToMicros(10) } }
  );
  assert.equal(base.discountCents, withExtra.discountCents, "the discount is on the roof, not the upsell");
  assert.equal(withExtra.totalCents - base.totalCents, 80_000);
});

test("a deposit is a share of the bill including what they added", () => {
  const t = computeTotals(
    [{ quantity: 1, unitPriceCents: 100_000 }, { quantity: 1, unitPriceCents: 100_000, isOptional: true, isAccepted: true }],
    { deposit: { kind: "PERCENT", micros: percentToMicros(50) } }
  );
  assert.equal(t.totalCents, 200_000);
  assert.equal(t.depositCents, 100_000);
});

test("accepted means nothing on a line that was never optional", () => {
  const t = computeTotals([{ quantity: 1, unitPriceCents: 45_000, isAccepted: true }]);
  assert.equal(t.subtotalCents, 45_000);
  assert.equal(t.acceptedOptionalCents, 0);
});

test("a text row is prose, not free work", () => {
  const t = computeTotals([
    { kind: "TEXT", quantity: 1, unitPriceCents: 0 },
    { quantity: 1, unitPriceCents: 45_000 },
  ]);
  assert.equal(t.subtotalCents, 45_000);
});

test("tax lands on the discounted amount, never on money never charged", () => {
  const t = computeTotals(SAMPLE, {
    discount: { kind: "AMOUNT", cents: 50_000 },
    taxRateMicros: percentToMicros(13),
  });
  assert.equal(t.discountCents, 50_000);
  assert.equal(t.taxableCents, 700_000);
  assert.equal(t.taxCents, 91_000, "13% of $7,000, not of $7,500");
  assert.equal(t.totalCents, 791_000);
});

test("a percentage discount is taken off the subtotal", () => {
  const t = computeTotals(SAMPLE, { discount: { kind: "PERCENT", micros: percentToMicros(10) } });
  assert.equal(t.discountCents, 75_000);
  assert.equal(t.totalCents, 675_000);
});

test("a discount bigger than the quote clamps instead of going negative", () => {
  const t = computeTotals(SAMPLE, { discount: { kind: "AMOUNT", cents: 999_999_99 } });
  assert.equal(t.discountCents, 750_000);
  assert.equal(t.totalCents, 0);
});

test("Quebec's 9.975% does not drift", () => {
  const t = computeTotals([{ quantity: 1, unitPriceCents: 1_000_000 }], {
    taxRateMicros: percentToMicros(9.975),
  });
  assert.equal(t.taxCents, 99_750, "$997.50 on $10,000");
});

test("a percentage deposit is a share of what they'll be billed, tax included", () => {
  const t = computeTotals(SAMPLE, {
    taxRateMicros: percentToMicros(13),
    deposit: { kind: "PERCENT", micros: percentToMicros(50) },
  });
  assert.equal(t.totalCents, 847_500);
  assert.equal(t.depositCents, 423_750);
});

test("margin percent on an empty quote is undefined, not 0%", () => {
  const t = computeTotals([]);
  assert.equal(t.marginPercent, null);
  assert.equal(t.totalCents, 0);
});

test("the aggregate markup percent matches the sample quote's cost/price pair", () => {
  // $4,355.00 cost, $3,145.00 margin — same SAMPLE quote as the first test.
  const t = computeTotals(SAMPLE);
  assert.equal(t.markupPercent?.toFixed(2), "72.22", "(price - cost) / cost, same basis as marginCents");
});

test("aggregate markup percent on an empty or zero-cost quote is undefined, not 0% or infinite", () => {
  assert.equal(computeTotals([]).markupPercent, null);
  assert.equal(
    computeTotals([{ quantity: 1, unitPriceCents: 45_000 }]).markupPercent,
    null,
    "no cost data anywhere on the quote"
  );
});

test("a fractional quantity multiplies out and still sums", () => {
  // 33.67 squares at $312.45 — the kind of number the measurement pipeline
  // produces, and the case per-line rounding exists for.
  const t = computeTotals([{ quantity: 33.67, unitPriceCents: 31_245 }]);
  assert.equal(t.subtotalCents, 1_052_019);
  assert.equal(t.totalCents, 1_052_019);
});

// A negative quantity or price on a line item was never a legitimate feature
// (see the discount/deposit fields for how a real credit is represented) —
// this was a Strix-pentest finding: a negative-quantity line had no floor at
// all, unlike the discount two lines below, which billed $100 for a $5,000
// job in the reported proof of concept.
test("a negative quantity does not undercut the subtotal below the real work billed", () => {
  const t = computeTotals([
    { quantity: 1, unitPriceCents: 500_000, unitCostCents: 300_000 },
    { quantity: -1, unitPriceCents: 490_000 },
  ]);
  assert.equal(t.subtotalCents, 500_000, "the negative-quantity line contributes nothing, not -$4,900");
  assert.equal(t.totalCents, 500_000);
});

test("a negative unit price on a line item is floored, same as a negative quantity", () => {
  const t = computeTotals([{ quantity: 1, unitPriceCents: -100_000 }]);
  assert.equal(t.subtotalCents, 0);
});

test("two negative factors don't cancel into a false-positive amount", () => {
  // Each factor is floored independently before multiplying, so a negative
  // quantity paired with a negative price can't slip past a product-only check.
  const t = computeTotals([{ quantity: -2, unitPriceCents: -50_000 }]);
  assert.equal(t.subtotalCents, 0);
});

test("a negative unit cost cannot fabricate a margin above the sale price", () => {
  const t = computeTotals([{ quantity: 1, unitPriceCents: 1_000_000, unitCostCents: -500_000 }]);
  assert.equal(t.costCents, 0, "a negative cost contributes nothing, not -$5,000");
  assert.equal(t.marginCents, 1_000_000, "margin cannot exceed the total price of the job");
  assert.equal(t.marginPercent, 100);
});

test("lineTotalCents alone is floored at zero, for callers outside computeTotals", () => {
  assert.equal(lineTotalCents({ quantity: -1, unitPriceCents: 50_000 }), 0);
  assert.equal(lineTotalCents({ quantity: 1, unitPriceCents: 50_000 }), 50_000);
});
