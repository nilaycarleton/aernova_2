import test from "node:test";
import assert from "node:assert/strict";
import { percentToMicros, microsToPercent, taxOnCents } from "../lib/money.ts";
import { provinceCode, taxRatesForProvince } from "../lib/trade-catalog.ts";

test("a rate survives the round trip exactly, including Quebec's", () => {
  // 9.975 has no exact binary form. Stored as millionths it is just 99_750.
  assert.equal(percentToMicros(9.975), 99_750);
  assert.equal(microsToPercent(99_750), 9.975);
  assert.equal(percentToMicros(13), 130_000);
  assert.equal(percentToMicros(5), 50_000);
});

test("tax lands on a whole cent", () => {
  assert.equal(taxOnCents(1_000_00, percentToMicros(13)), 13_000);
  assert.equal(taxOnCents(0, percentToMicros(13)), 0);
  // $86.53 at QST 9.975% is 863.14... cents — one rounding, at the end.
  assert.equal(taxOnCents(8_653, percentToMicros(9.975)), 863);
});

test("tax on a big quote does not drift", () => {
  // The failure this guards against: a float rate multiplied across a large
  // total, off by a cent on the number a homeowner signs.
  const total = 4_875_000; // $48,750.00
  assert.equal(taxOnCents(total, percentToMicros(9.975)), 486_281); // $4,862.81
  assert.equal(taxOnCents(total, percentToMicros(13)), 633_750);
});

test("provinces are recognised however a contractor writes them", () => {
  assert.equal(provinceCode("Ontario"), "ON");
  assert.equal(provinceCode("ont."), "ON");
  assert.equal(provinceCode("on"), "ON");
  assert.equal(provinceCode("British Columbia"), "BC");
  assert.equal(provinceCode("québec"), "QC");
  assert.equal(provinceCode("Neverland"), null);
  assert.equal(provinceCode(null), null);
});

test("PST provinces get two rates, not one combined one", () => {
  // GST and PST have separate numbers, remittances and exemptions. A single
  // 12% row would be a number their accountant cannot take apart.
  const bc = taxRatesForProvince("BC");
  assert.deepEqual(
    bc.map((rate) => rate.name),
    ["GST", "PST"]
  );
  assert.equal(bc[1].rateMicros, percentToMicros(7));
});

test("an unknown province falls back to GST alone", () => {
  const fallback = taxRatesForProvince(null);
  assert.equal(fallback.length, 1);
  assert.equal(fallback[0].name, "GST");
  assert.equal(fallback[0].isDefault, true);
});

test("exactly one rate is the default in every province", () => {
  for (const province of ["ON", "BC", "QC", "AB", "NS", "SK"]) {
    const defaults = taxRatesForProvince(province).filter((rate) => rate.isDefault);
    assert.equal(defaults.length, 1, `${province} should have one default rate`);
  }
});
