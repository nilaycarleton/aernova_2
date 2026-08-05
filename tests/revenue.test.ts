import assert from "node:assert/strict";
import { test } from "node:test";
import {
  rankJobsByProfit,
  revenueByJobType,
  revenueBySource,
  totalRevenueCents,
  type InvoiceForRevenue,
  type JobProfitRow,
} from "../lib/reports/revenue.ts";

const invoices: InvoiceForRevenue[] = [
  { totalAmountCents: 10_000, leadSource: "Referral", jobType: "ONE_OFF" },
  { totalAmountCents: 5_000, leadSource: "Referral", jobType: "RECURRING" },
  { totalAmountCents: 3_000, leadSource: null, jobType: "ONE_OFF" },
];

test("total revenue sums every invoice, regardless of source or type", () => {
  assert.equal(totalRevenueCents(invoices), 18_000);
});

test("revenue by source groups and sorts richest first", () => {
  const rows = revenueBySource(invoices);
  assert.deepEqual(rows, [
    { source: "Referral", cents: 15_000 },
    { source: "Not recorded", cents: 3_000 },
  ]);
});

test("a blank lead source is grouped with a missing one, not its own empty-string bucket", () => {
  const rows = revenueBySource([
    ...invoices,
    { totalAmountCents: 1_000, leadSource: "   ", jobType: "ONE_OFF" },
  ]);
  const unrecorded = rows.find((r) => r.source === "Not recorded");
  assert.equal(unrecorded?.cents, 4_000);
});

test("revenue by job type splits recurring from one-off", () => {
  assert.deepEqual(revenueByJobType(invoices), { ONE_OFF: 13_000, RECURRING: 5_000 });
});

test("jobs rank by profit, richest first, not by input order", () => {
  const rows: JobProfitRow[] = [
    { jobId: "a", jobName: "A", billedCents: 10_000, actualCostCents: 8_000, profitCents: 2_000 },
    { jobId: "b", jobName: "B", billedCents: 10_000, actualCostCents: 2_000, profitCents: 8_000 },
  ];
  assert.deepEqual(
    rankJobsByProfit(rows).map((r) => r.jobId),
    ["b", "a"]
  );
});

test("a job that lost money still ranks — profit can be negative", () => {
  const rows: JobProfitRow[] = [
    { jobId: "a", jobName: "A", billedCents: 10_000, actualCostCents: 12_000, profitCents: -2_000 },
    { jobId: "b", jobName: "B", billedCents: 10_000, actualCostCents: 2_000, profitCents: 8_000 },
  ];
  assert.deepEqual(
    rankJobsByProfit(rows).map((r) => r.jobId),
    ["b", "a"]
  );
});
