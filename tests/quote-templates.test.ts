import assert from "node:assert/strict";
import { test } from "node:test";
import { applyTemplateLines, type CatalogPrice, type TemplateLine } from "../lib/quote/templates.ts";

function line(over: Partial<TemplateLine> = {}): TemplateLine {
  return {
    serviceId: null,
    kind: "ITEM",
    name: "Architectural shingles — installed",
    description: "Supplied and fitted, old shingles hauled away.",
    quantity: 30,
    unit: "square",
    unitCostCents: 20_000,
    unitPriceCents: 31_000,
    isOptional: false,
    imageUrl: null,
    ...over,
  };
}

const catalog = new Map<string, CatalogPrice>([
  ["svc_shingles", { id: "svc_shingles", unit: "square", unitPriceCents: 34_000, unitCostCents: 22_000 }],
]);

test("a linked row takes today's price, not the price when the template was made", () => {
  const [row] = applyTemplateLines([line({ serviceId: "svc_shingles" })], catalog);
  assert.equal(row.unitPriceCents, 34_000, "the price list moved and the template followed");
  assert.equal(row.unitCostCents, 22_000);
  assert.equal(row.amountCents, 1_020_000, "30 squares at $340");
});

test("but the words stay as the roofer wrote them", () => {
  const [row] = applyTemplateLines(
    [line({ serviceId: "svc_shingles", description: "Including the porch roof." })],
    catalog
  );
  assert.equal(row.description, "Including the porch roof.");
  assert.equal(row.name, "Architectural shingles — installed");
});

test("an unlinked row keeps the price stored on the template", () => {
  const [row] = applyTemplateLines([line()], catalog);
  assert.equal(row.unitPriceCents, 31_000);
  assert.equal(row.unitCostCents, 20_000);
});

test("a deleted service falls back rather than dropping the line", () => {
  // The one failure a roofer would not notice until the homeowner did.
  const rows = applyTemplateLines([line({ serviceId: "svc_gone" })], catalog);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].unitPriceCents, 31_000);
});

test("the unit follows the price it belongs to", () => {
  // A catalog that moved from "square" to "sq ft" changed what the number
  // means; keeping the old word beside the new price misprices by 100x.
  const perSqFt = new Map<string, CatalogPrice>([
    ["svc_shingles", { id: "svc_shingles", unit: "sq ft", unitPriceCents: 340, unitCostCents: 220 }],
  ]);
  const [row] = applyTemplateLines([line({ serviceId: "svc_shingles" })], perSqFt);
  assert.equal(row.unit, "sq ft");
  assert.equal(row.unitPriceCents, 340);
});

test("a linked row with no cost in the catalog loses the template's cost", () => {
  // The catalog is the authority on money. "No cost tracked" is an answer, not
  // a gap to be filled in from a stale copy.
  const noCost = new Map<string, CatalogPrice>([
    ["svc_shingles", { id: "svc_shingles", unit: "square", unitPriceCents: 34_000, unitCostCents: null }],
  ]);
  const [row] = applyTemplateLines([line({ serviceId: "svc_shingles" })], noCost);
  assert.equal(row.unitCostCents, null);
});

test("optional extras and photos survive the trip", () => {
  const [row] = applyTemplateLines(
    [line({ isOptional: true, imageUrl: "/uploads/quotes/x/y.jpg" })],
    catalog
  );
  assert.equal(row.isOptional, true, "the house upsell is part of the house template");
  assert.equal(row.imageUrl, "/uploads/quotes/x/y.jpg");
});

test("a paragraph carries no money and no photo", () => {
  const [row] = applyTemplateLines(
    [line({ kind: "TEXT", quantity: 1, unitPriceCents: 9_999, imageUrl: "/uploads/a.jpg" })],
    catalog
  );
  assert.equal(row.unitPriceCents, 0);
  assert.equal(row.quantity, 0);
  assert.equal(row.amountCents, 0);
  assert.equal(row.imageUrl, null);
});

test("rows come back in order, renumbered from zero", () => {
  const rows = applyTemplateLines([line({ name: "A" }), line({ name: "B" }), line({ name: "C" })], catalog);
  assert.deepEqual(rows.map((r) => r.sortOrder), [0, 1, 2]);
  assert.deepEqual(rows.map((r) => r.name), ["A", "B", "C"]);
});

test("a templated row is the roofer's, so a re-measure cannot overwrite it", () => {
  const [row] = applyTemplateLines([line()], catalog);
  assert.equal(row.source, "manual");
});
