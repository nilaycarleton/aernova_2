import assert from "node:assert/strict";
import { test } from "node:test";
import { InvoiceStatus } from "@prisma/client";
import { invoiceStatusTone } from "../lib/invoice/status.ts";

test("OVERDUE reads as danger", () => {
  assert.equal(invoiceStatusTone(InvoiceStatus.OVERDUE), "danger");
});

test("PAID reads as success", () => {
  assert.equal(invoiceStatusTone(InvoiceStatus.PAID), "success");
});

test("every other status reads as neutral", () => {
  for (const status of [
    InvoiceStatus.DRAFT,
    InvoiceStatus.SENT,
    InvoiceStatus.PARTIALLY_PAID,
    InvoiceStatus.VOID,
  ]) {
    assert.equal(invoiceStatusTone(status), "neutral", status);
  }
});
