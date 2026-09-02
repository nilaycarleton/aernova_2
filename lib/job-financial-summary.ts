/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §6/§21/§25 Phase 8 — "no single screen
 * composes this chain into one 'financial status of this job' view," now
 * closed. Pure, same doctrine as `lib/quote/totals.ts` and
 * `lib/job-costing.ts`: rows in, figures out, no database in sight.
 *
 * The one rule this file exists to enforce in code, not just in a panel's
 * copy: **contract value and Additional Work are two different sums that
 * must never be added together.** An approved quote plus its approved
 * change orders is what was agreed to; an Additional Work invoice
 * (`Invoice.quoteId: null`, §19.2) is real money billed for real work, but
 * it was never part of that agreement, so it counts toward what's been
 * billed and never toward what the contract is worth.
 */
import type { Cents } from "./money.ts";
import { effectiveContractValueCents } from "./change-order.ts";

export type FinancialQuoteFacts = { totalAmountCents: number | null } | null;

export type FinancialChangeOrderFacts = {
  /** Only "APPROVED" counts — the same filter `ChangeOrdersPanel` applies for its own subtitle. */
  status: string;
  amountCents: number;
};

export type FinancialInvoiceFacts = {
  /** Non-"VOID" only; a voided invoice was never really billed. */
  status: string;
  /** Set for a contract draw (`createInvoiceFromQuoteAction`), null for Additional Work (`createDirectInvoiceAction`, §19.2) — the same distinguishing field `AdditionalWorkPanel`'s own `existingInvoices` filter already uses. */
  quoteId: string | null;
  totalAmountCents: number;
  amountPaidCents: number;
};

export type JobFinancialSummary = {
  /** The approved quote's total, or null when there isn't one — not 0, since a job with no contract has no contract value to report, not a $0 one. */
  originalContractCents: Cents | null;
  approvedChangeOrdersCents: Cents;
  effectiveContractValueCents: Cents;
  /** Non-void invoices tied to the quote — contract draws. */
  contractInvoicedCents: Cents;
  /** Non-void invoices with no quote behind them — Additional Work. Never part of contract value. */
  additionalWorkInvoicedCents: Cents;
  totalInvoicedCents: Cents;
  paidCents: Cents;
  balanceDueCents: Cents;
  /** What's left of the *contract* to bill — the deposit/progress/final-draw room, not the same fact as balanceDueCents. */
  remainingContractToBillCents: Cents;
  hasApprovedQuote: boolean;
  hasApprovedChangeOrders: boolean;
  hasAdditionalWork: boolean;
  isFullyInvoicedAgainstContract: boolean;
  isPaidInFull: boolean;
};

export function jobFinancialSummary(
  approvedQuote: FinancialQuoteFacts,
  changeOrders: FinancialChangeOrderFacts[],
  invoices: FinancialInvoiceFacts[]
): JobFinancialSummary {
  const hasApprovedQuote = approvedQuote != null;
  const originalContractCents = hasApprovedQuote ? (approvedQuote!.totalAmountCents ?? 0) : null;

  const approvedChangeOrdersCents = changeOrders
    .filter((co) => co.status === "APPROVED")
    .reduce((sum, co) => sum + co.amountCents, 0);

  const effectiveCents = effectiveContractValueCents(
    originalContractCents ?? 0,
    approvedChangeOrdersCents
  );

  // A change order can only exist against an already-approved quote
  // (`ChangeOrder.quoteId` is required — §19.1), so `approvedChangeOrdersCents`
  // is always 0 when `hasApprovedQuote` is false. Nothing here fabricates a
  // contract value out of a change order that couldn't have been created.

  const liveInvoices = invoices.filter((inv) => inv.status !== "VOID");
  const contractInvoices = liveInvoices.filter((inv) => inv.quoteId != null);
  const additionalWorkInvoices = liveInvoices.filter((inv) => inv.quoteId == null);

  const contractInvoicedCents = contractInvoices.reduce(
    (sum, inv) => sum + inv.totalAmountCents,
    0
  );
  const additionalWorkInvoicedCents = additionalWorkInvoices.reduce(
    (sum, inv) => sum + inv.totalAmountCents,
    0
  );
  const totalInvoicedCents = contractInvoicedCents + additionalWorkInvoicedCents;

  // The cached running total every invoice already carries (`lib/invoice/balance.ts`'s
  // own doctrine: `InvoicePayment` rows are the truth, `amountPaidCents` is the
  // cache) — reused rather than re-summing payment rows, so this needs no
  // `InvoicePayment` query of its own.
  const paidCents = liveInvoices.reduce((sum, inv) => sum + inv.amountPaidCents, 0);
  const balanceDueCents = totalInvoicedCents - paidCents;
  const remainingContractToBillCents = Math.max(0, effectiveCents - contractInvoicedCents);

  return {
    originalContractCents,
    approvedChangeOrdersCents,
    effectiveContractValueCents: effectiveCents,
    contractInvoicedCents,
    additionalWorkInvoicedCents,
    totalInvoicedCents,
    paidCents,
    balanceDueCents,
    remainingContractToBillCents,
    hasApprovedQuote,
    hasApprovedChangeOrders: approvedChangeOrdersCents > 0,
    hasAdditionalWork: additionalWorkInvoices.length > 0,
    isFullyInvoicedAgainstContract: hasApprovedQuote && remainingContractToBillCents === 0,
    isPaidInFull: totalInvoicedCents > 0 && balanceDueCents <= 0,
  };
}
