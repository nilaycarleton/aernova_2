/**
 * Phase 8, item 47: revenue, by source and by job type, plus profit per job.
 *
 * Pure, same doctrine as `lib/quote/totals.ts` and `lib/invoice/balance.ts` —
 * rows in, figures out, no database in sight. "Revenue" here means
 * **invoiced**, confirmed with the user rather than guessed: the sum of what
 * was billed in the period, not what has actually been collected. A
 * contractor already thinks in terms of the invoice they just sent, and a
 * cash-basis number would disagree with it for no reason a roofer would find
 * useful — `/reports/aged-receivables` is where "and how much of that is
 * still outstanding" belongs instead.
 */
import type { JobType } from "@prisma/client";
import type { Cents } from "../money.ts";

export type InvoiceForRevenue = {
  totalAmountCents: number;
  /** Resolved by the caller from the job's client — null when nobody recorded one. */
  leadSource: string | null;
  jobType: JobType;
};

export type LeadSourceRow = { source: string; cents: Cents };

const UNRECORDED_SOURCE = "Not recorded";

export function revenueBySource(invoices: InvoiceForRevenue[]): LeadSourceRow[] {
  const totals = new Map<string, Cents>();
  for (const invoice of invoices) {
    const key = invoice.leadSource?.trim() || UNRECORDED_SOURCE;
    totals.set(key, (totals.get(key) ?? 0) + invoice.totalAmountCents);
  }
  return [...totals.entries()]
    .map(([source, cents]) => ({ source, cents }))
    .sort((a, b) => b.cents - a.cents);
}

export function revenueByJobType(invoices: InvoiceForRevenue[]): Record<JobType, Cents> {
  const totals: Record<JobType, Cents> = { ONE_OFF: 0, RECURRING: 0 };
  for (const invoice of invoices) {
    totals[invoice.jobType] += invoice.totalAmountCents;
  }
  return totals;
}

export function totalRevenueCents(invoices: InvoiceForRevenue[]): Cents {
  return invoices.reduce((sum, invoice) => sum + invoice.totalAmountCents, 0);
}

export type JobProfitRow = {
  jobId: string;
  jobName: string;
  billedCents: Cents;
  actualCostCents: Cents;
  profitCents: Cents;
};

/**
 * Ranked by profit, richest first — the question this table answers is "what
 * made money," not "what's alphabetically first." A job with nothing logged
 * against it yet still appears at its full billed amount as profit, which is
 * honest: no cost has been recorded, not zero cost incurred, and the Costs
 * tab on the job itself is where that gets corrected once it's known.
 */
export function rankJobsByProfit(rows: JobProfitRow[]): JobProfitRow[] {
  return [...rows].sort((a, b) => b.profitCents - a.profitCents);
}
