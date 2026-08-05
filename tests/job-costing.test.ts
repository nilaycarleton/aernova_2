import assert from "node:assert/strict";
import { test } from "node:test";
import {
  actualProfitCents,
  expenseCentsByCategory,
  jobCostSummary,
  labourAmountCents,
  sumExpenseCents,
  type ExpenseForCost,
} from "../lib/job-costing.ts";

test("summing no expenses is zero, not an error", () => {
  assert.equal(sumExpenseCents([]), 0);
});

test("expenses sum across categories", () => {
  const expenses: ExpenseForCost[] = [
    { category: "MATERIALS", amountCents: 12_000 },
    { category: "LABOUR", amountCents: 8_000 },
    { category: "MATERIALS", amountCents: 500 },
  ];
  assert.equal(sumExpenseCents(expenses), 20_500);
});

test("the breakdown buckets every category, including ones with nothing logged", () => {
  const breakdown = expenseCentsByCategory([
    { category: "LABOUR", amountCents: 5_000 },
  ]);
  assert.deepEqual(breakdown, {
    MATERIALS: 0,
    LABOUR: 5_000,
    EQUIPMENT: 0,
    OTHER: 0,
  });
});

test("labour amount rounds like a quote line does", () => {
  // 3.5 hours at $42.50/hr = $148.75, same lineAmountCents rounding a
  // fractional quantity already gets on a quote.
  assert.equal(labourAmountCents(3.5, 4_250), 14_875);
});

test("a job that cost exactly what it was quoted to cost has zero variance", () => {
  const summary = jobCostSummary(10_000, [{ category: "MATERIALS", amountCents: 10_000 }]);
  assert.equal(summary.varianceCents, 0);
});

test("a job that ran over shows a positive variance", () => {
  const summary = jobCostSummary(10_000, [{ category: "MATERIALS", amountCents: 13_500 }]);
  assert.equal(summary.actualCostCents, 13_500);
  assert.equal(summary.varianceCents, 3_500);
});

test("a job with nothing logged yet reads as zero actual cost, not a missing number", () => {
  const summary = jobCostSummary(10_000, []);
  assert.equal(summary.actualCostCents, 0);
  assert.equal(summary.varianceCents, -10_000);
});

test("actual profit is billed less what it actually cost", () => {
  assert.equal(actualProfitCents(50_000, 30_000), 20_000);
});

test("actual profit can be negative — a job can genuinely lose money", () => {
  assert.equal(actualProfitCents(10_000, 15_000), -5_000);
});
