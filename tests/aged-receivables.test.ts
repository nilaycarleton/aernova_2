import assert from "node:assert/strict";
import { test } from "node:test";
import { agedReceivables, type InvoiceForAging } from "../lib/reports/aged-receivables.ts";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-08-05T00:00:00Z");

function invoice(overrides: Partial<InvoiceForAging>): InvoiceForAging {
  return {
    totalAmountCents: 10_000,
    payments: [],
    status: "SENT" as InvoiceForAging["status"],
    dueAt: null,
    ...overrides,
  };
}

test("a fully paid invoice contributes nothing to any bucket", () => {
  const { rows, totalCents } = agedReceivables(
    [invoice({ payments: [{ amountCents: 10_000 }] })],
    NOW
  );
  assert.equal(totalCents, 0);
  for (const row of rows) assert.equal(row.count, 0);
});

test("an invoice with no due date is current, not overdue, no matter its age", () => {
  const { rows, totalCents } = agedReceivables([invoice({ dueAt: null })], NOW);
  assert.equal(totalCents, 10_000);
  const current = rows.find((r) => r.key === "current")!;
  assert.equal(current.cents, 10_000);
  assert.equal(current.count, 1);
});

test("an invoice not yet due is current", () => {
  const dueAt = new Date(NOW.getTime() + 10 * DAY);
  const { rows } = agedReceivables([invoice({ dueAt })], NOW);
  assert.equal(rows.find((r) => r.key === "current")!.count, 1);
});

test("buckets split at 30 and 60 days overdue", () => {
  const cases: [number, string][] = [
    [10, "0-30"],
    [30, "0-30"],
    [31, "31-60"],
    [60, "31-60"],
    [61, "60+"],
  ];
  for (const [daysLate, expectedKey] of cases) {
    const dueAt = new Date(NOW.getTime() - daysLate * DAY);
    const { rows } = agedReceivables([invoice({ dueAt })], NOW);
    const hit = rows.find((r) => r.key === expectedKey)!;
    assert.equal(hit.count, 1, `${daysLate} days late should land in ${expectedKey}`);
  }
});

test("a draft-status invoice sitting in an already-filtered list still ages by its balance", () => {
  // The filtering happens upstream (the page excludes DRAFT/VOID); this test
  // documents that the function itself trusts what it's given rather than
  // re-checking status, since invoiceBalance already treats DRAFT specially.
  const dueAt = new Date(NOW.getTime() - 5 * DAY);
  const { totalCents } = agedReceivables(
    [invoice({ status: "DRAFT" as InvoiceForAging["status"], dueAt })],
    NOW
  );
  // A DRAFT is never "overdue" per invoiceBalance's wasAskedFor rule, so it
  // still lands as an outstanding "current" balance here, not zero — proof
  // this file relies on the caller's filter rather than duplicating it.
  assert.equal(totalCents, 10_000);
});

test("the total is the sum across every bucket", () => {
  const { rows, totalCents } = agedReceivables(
    [
      invoice({ totalAmountCents: 5_000, dueAt: null }),
      invoice({ totalAmountCents: 3_000, dueAt: new Date(NOW.getTime() - 40 * DAY) }),
    ],
    NOW
  );
  const sum = rows.reduce((s, r) => s + r.cents, 0);
  assert.equal(sum, totalCents);
  assert.equal(totalCents, 8_000);
});
