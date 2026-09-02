import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCompanyInfoSnapshot,
  buildCustomerInfoSnapshot,
  canSendWarranty,
  isWarrantyEditable,
  warrantyStatusLabel,
  warrantyTermLabel,
} from "../lib/warranty.ts";

test("a term that divides evenly into years reads as years, not a raw month count", () => {
  assert.equal(warrantyTermLabel(12), "1 year");
  assert.equal(warrantyTermLabel(24), "2 years");
  assert.equal(warrantyTermLabel(60), "5 years");
});

test("a term that doesn't divide evenly reads as months", () => {
  assert.equal(warrantyTermLabel(6), "6 months");
  assert.equal(warrantyTermLabel(18), "18 months");
  assert.equal(warrantyTermLabel(1), "1 month");
});

test("every warranty status label reads as a sentence, never the raw enum", () => {
  for (const status of ["DRAFT", "REVIEWED", "SENT", "VIEWED", "CONFIRMED"] as const) {
    const label = warrantyStatusLabel(status);
    assert.notEqual(label, status);
    assert.ok(!label.includes("_"), `${status} label reads as an enum`);
  }
});

test("only a confirmed warranty is locked from further edits", () => {
  for (const status of ["DRAFT", "REVIEWED", "SENT", "VIEWED"] as const) {
    assert.equal(isWarrantyEditable(status), true, status);
  }
  assert.equal(isWarrantyEditable("CONFIRMED"), false);
});

test("only a reviewed draft can be sent — never straight from draft, never re-sent after confirmation", () => {
  assert.equal(canSendWarranty("REVIEWED"), true);
  for (const status of ["DRAFT", "SENT", "VIEWED", "CONFIRMED"] as const) {
    assert.equal(canSendWarranty(status), false, status);
  }
});

test("the company snapshot prefers the legal name and omits blank fields rather than printing empty lines", () => {
  const snapshot = buildCompanyInfoSnapshot({
    name: "Nilay's Roofing",
    legalName: "Nilay Sorathia Roofing Ltd.",
    licenceNumber: "RC-4821",
    phone: "555-0100",
    email: null,
    addressLine1: "12 Main St",
    city: "Toronto",
    province: "ON",
    postalCode: "M1M 1M1",
  });
  assert.match(snapshot, /^Nilay Sorathia Roofing Ltd\./);
  assert.match(snapshot, /Licence #RC-4821/);
  assert.match(snapshot, /12 Main St, Toronto, ON, M1M 1M1/);
  assert.match(snapshot, /555-0100/);
  assert.ok(!snapshot.includes("null"), "a missing field never prints the word null");
});

test("the company snapshot falls back to the display name when no legal name is set", () => {
  const snapshot = buildCompanyInfoSnapshot({
    name: "Nilay's Roofing",
    legalName: null,
    licenceNumber: null,
    phone: null,
    email: null,
    addressLine1: null,
    city: null,
    province: null,
    postalCode: null,
  });
  assert.equal(snapshot, "Nilay's Roofing");
});

test("the customer snapshot includes only what's on file", () => {
  const full = buildCustomerInfoSnapshot({ name: "Jane Homeowner", email: "jane@example.com", phone: "555-0199" });
  assert.equal(full, "Jane Homeowner\n555-0199\njane@example.com");

  const nameOnly = buildCustomerInfoSnapshot({ name: "Jane Homeowner", email: null, phone: null });
  assert.equal(nameOnly, "Jane Homeowner");
});
