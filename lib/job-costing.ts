/**
 * Phase 8, item 46: what a job actually cost, against what it was quoted to
 * cost. Pure, and tested like every other money file in this codebase — rows
 * in, figures out, no database in sight.
 *
 * The quoted half is not reinvented here. `computeTotals()` in
 * `lib/quote/totals.ts` already produces `costCents` correctly — it already
 * knows to skip a declined optional line and include an accepted one — so
 * this file only ever receives that number, never a line array of its own.
 * The actual half is `JobExpense`, a ledger of entries rather than a running
 * total, for the same reason `InvoicePayment` is a row per payment: a
 * materials run in March and a dump-fee receipt in April are two facts with
 * two dates.
 */
import { lineAmountCents, type Cents } from "./money.ts";
import type { JobExpenseCategory } from "@prisma/client";

/** The shape the arithmetic needs. Deliberately narrower than the Prisma row. */
export type ExpenseForCost = {
  category: JobExpenseCategory;
  amountCents: number;
};

export function sumExpenseCents(expenses: ExpenseForCost[]): Cents {
  return expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
}

const EMPTY_BREAKDOWN: Record<JobExpenseCategory, Cents> = {
  MATERIALS: 0,
  LABOUR: 0,
  EQUIPMENT: 0,
  OTHER: 0,
};

export function expenseCentsByCategory(
  expenses: ExpenseForCost[]
): Record<JobExpenseCategory, Cents> {
  const totals = { ...EMPTY_BREAKDOWN };
  for (const expense of expenses) {
    totals[expense.category] += expense.amountCents;
  }
  return totals;
}

/**
 * Hours × rate, rounded once — the same `lineAmountCents` rounding a quote
 * line uses, so an hourly entry and a per-square line round the same way.
 * The entry form calls this to suggest an amount; the amount itself is what's
 * stored and what a person can still overwrite, same "auto but overridable"
 * convention as `QuoteLineItem.amountCents`.
 */
export function labourAmountCents(hours: number, hourlyRateCents: number): Cents {
  return lineAmountCents(hourlyRateCents, hours);
}

export type JobCostSummary = {
  quotedCostCents: Cents;
  actualCostCents: Cents;
  /** Actual less quoted. Positive means the job cost more than it was priced to cost. */
  varianceCents: Cents;
  byCategory: Record<JobExpenseCategory, Cents>;
};

export function jobCostSummary(
  quotedCostCents: Cents,
  expenses: ExpenseForCost[]
): JobCostSummary {
  const actualCostCents = sumExpenseCents(expenses);
  return {
    quotedCostCents,
    actualCostCents,
    varianceCents: actualCostCents - quotedCostCents,
    byCategory: expenseCentsByCategory(expenses),
  };
}

/**
 * What a job actually made: what it was billed, less what it actually cost.
 * Billed rather than quoted — a draw, a decline, or a discount can mean the
 * two differ (see `lib/invoice/from-quote.ts`), and profit is a fact about
 * money that moved, not about the document that proposed it.
 */
export function actualProfitCents(billedCents: Cents, actualCostCents: Cents): Cents {
  return billedCents - actualCostCents;
}
