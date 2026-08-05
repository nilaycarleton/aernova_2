import assert from "node:assert/strict";
import { test } from "node:test";
import { invoiceFromQuote, billableOnInvoice } from "../lib/invoice/from-quote.ts";
import { computeTotals, amountInput } from "../lib/quote/totals.ts";
import { percentToMicros } from "../lib/money.ts";

const HST = percentToMicros(13);

function line(over: Partial<Parameters<typeof billableOnInvoice>[0]> = {}) {
  return {
    kind: "ITEM" as const,
    group: "Product / Service",
    name: "Re-roof",
    description: null,
    quantity: 1,
    unit: "each",
    unitPriceCents: 680_000,
    sortOrder: 0,
    isOptional: false,
    clientSelected: false,
    ...over,
  };
}

// The same sample quote quote-totals.test.ts uses, so the two files can be read
// against each other.
const QUOTE = [
  line({ name: "Tear-off and re-roof", unitPriceCents: 680_000, sortOrder: 0 }),
  line({ name: "Gutter guards", unitPriceCents: 45_000, sortOrder: 1 }),
  line({ name: "Chimney flashing", unitPriceCents: 25_000, sortOrder: 2 }),
];

test("a declined extra never reaches the bill", () => {
  const withExtra = [
    ...QUOTE,
    line({ name: "Skylight flashing", unitPriceCents: 80_000, isOptional: true, sortOrder: 3 }),
  ];
  const draft = invoiceFromQuote(withExtra);
  assert.equal(draft.lineItems.length, 3);
  assert.ok(!draft.lineItems.some((l) => l.name === "Skylight flashing"));
  assert.equal(draft.subtotalCents, 750_000);
});

test("an extra they ticked crosses as ordinary work", () => {
  const withExtra = [
    ...QUOTE,
    line({
      name: "Skylight flashing",
      unitPriceCents: 80_000,
      isOptional: true,
      clientSelected: true,
      sortOrder: 3,
    }),
  ];
  const draft = invoiceFromQuote(withExtra);
  assert.equal(draft.lineItems.length, 4);
  assert.equal(draft.subtotalCents, 830_000, "$7,500 + the $800 they said yes to");
});

test("text rows cross — they are prose the homeowner is meant to read", () => {
  const draft = invoiceFromQuote([
    ...QUOTE,
    line({ kind: "TEXT", name: "Work carried out in dry conditions.", sortOrder: 3 }),
  ]);
  assert.equal(draft.lineItems.length, 4);
  const text = draft.lineItems.find((l) => l.kind === "TEXT")!;
  assert.equal(text.amountCents, 0, "prose has no price");
  assert.equal(draft.subtotalCents, 750_000, "and adds nothing to the subtotal");
});

test("the invoice total matches what the homeowner approved", () => {
  const lines = [
    ...QUOTE,
    line({
      name: "Skylight flashing",
      unitPriceCents: 80_000,
      isOptional: true,
      clientSelected: true,
      sortOrder: 3,
    }),
  ];
  const discount = amountInput({ kind: "PERCENT", percentMicros: percentToMicros(10) });

  const quoteTotals = computeTotals(
    lines.map((l) => ({
      quantity: l.quantity,
      unitPriceCents: l.unitPriceCents,
      isOptional: l.isOptional,
      isAccepted: l.clientSelected,
      kind: l.kind,
    })),
    { discount, taxRateMicros: HST }
  );
  const draft = invoiceFromQuote(lines, { discount, taxRateMicros: HST });

  assert.equal(draft.totalAmountCents, quoteTotals.totalCents);
});

test("the 10% off the roof does not quietly discount the $800 extra", () => {
  const lines = [
    line({ name: "Re-roof", unitPriceCents: 750_000, sortOrder: 0 }),
    line({
      name: "Skylight flashing",
      unitPriceCents: 80_000,
      isOptional: true,
      clientSelected: true,
      sortOrder: 1,
    }),
  ];
  const draft = invoiceFromQuote(lines, {
    discount: amountInput({ kind: "PERCENT", percentMicros: percentToMicros(10) }),
  });

  // 10% of the $7,500 that was negotiated, not of the $8,300 total. Flattening
  // the accepted extra before computing would give $830 here.
  assert.equal(draft.discountCents, 75_000);
  assert.equal(draft.subtotalCents, 830_000);
  assert.equal(draft.totalAmountCents, 755_000);
});

test("the document checks out under a pen: lines − discount + tax = total", () => {
  const draft = invoiceFromQuote(QUOTE, {
    discount: amountInput({ kind: "AMOUNT", cents: 50_000 }),
    taxRateMicros: HST,
  });
  const lineSum = draft.lineItems.reduce((sum, l) => sum + l.amountCents, 0);
  assert.equal(lineSum, draft.subtotalCents);
  assert.equal(
    draft.subtotalCents - draft.discountCents + draft.taxCents,
    draft.totalAmountCents
  );
});

test("rows are renumbered from zero, with no gaps where a declined extra sat", () => {
  const draft = invoiceFromQuote([
    line({ name: "A", sortOrder: 0 }),
    line({ name: "Declined", isOptional: true, sortOrder: 1 }),
    line({ name: "B", sortOrder: 2 }),
    line({ name: "C", sortOrder: 7 }),
  ]);
  assert.deepEqual(
    draft.lineItems.map((l) => [l.name, l.sortOrder]),
    [
      ["A", 0],
      ["B", 1],
      ["C", 2],
    ]
  );
});

test("no invoice line carries a cost — the type has nowhere to put one", () => {
  const draft = invoiceFromQuote(QUOTE);
  for (const item of draft.lineItems) {
    assert.ok(!("unitCostCents" in item), "cost is not the homeowner's business");
  }
});
