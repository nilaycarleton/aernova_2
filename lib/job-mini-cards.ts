/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §16/§17/§25 Phase 7 — generalizing
 * `JobStatusStepper`'s shape (label/description/badge/next-action) into two
 * read-only mini-cards, not a cross-entity workflow engine. Pure, same
 * doctrine as `lib/pipeline.ts`'s `stageForJob()`: rows in, a small display
 * shape out, no database and no JSX in sight.
 *
 * Both functions reuse `QUOTE_STATUS_META`/`INVOICE_STATUS_META` for every
 * status they already cover — the only branching added here is "there's no
 * quote/invoice yet" (which those tables have no entry for, since they
 * describe a row that exists) and Additional Work's homeowner-review wait,
 * which is a fact about *when* an invoice was shared, not a status value.
 */
import { InvoiceStatus, QuoteStatus } from "@prisma/client";
import { formatMoney } from "./money.ts";
import { QUOTE_STATUS_META } from "./quote-status.ts";
import { INVOICE_STATUS_META } from "./invoice/status.ts";

/** Same tone, same reasoning as the `QUIET` constant `lib/quote-status.ts` and `lib/invoice/status.ts` each already define privately for their own tables — state, not colour. */
const QUIET = "text-ink-muted bg-surface-lifted";
const NEUTRAL = "text-ink-secondary bg-surface-lifted";

export type MiniCardState = {
  /** The current state, in the trade's words — never a raw enum. */
  label: string;
  /** What it means, one sentence. */
  description: string;
  /** Tailwind classes for the state pill. */
  badge: string;
  /** A dollar figure, when there's a meaningful one to show. */
  secondaryDetail: string | null;
  /** The single most useful next step, if there is one. */
  action: { label: string; href: string } | null;
};

export type SalesQuoteFacts = {
  id: string;
  status: QuoteStatus;
  totalAmountCents: number | null;
} | null;

/**
 * §7.3/§7.4/§7.5 as a glance rather than a document: no quote yet, or
 * whatever `QuoteStatus` the most recent one carries. Always points at the
 * same quote page a "Continue editing"/"Open the quote" link elsewhere on
 * this job already goes to — no second navigation convention invented.
 */
export function salesMiniCardState(jobId: string, latestQuote: SalesQuoteFacts): MiniCardState {
  if (!latestQuote) {
    return {
      label: "No quote yet",
      description: "Nothing has been priced for this job.",
      badge: QUIET,
      secondaryDetail: null,
      action: { label: "Create a quote", href: `/jobs/${jobId}?tab=quote` },
    };
  }

  const meta = QUOTE_STATUS_META[latestQuote.status];
  return {
    label: meta.label,
    description: meta.hint,
    badge: meta.badge,
    secondaryDetail:
      latestQuote.totalAmountCents != null ? formatMoney(latestQuote.totalAmountCents) : null,
    action: {
      label: latestQuote.status === QuoteStatus.DRAFT ? "Continue editing" : "Open the quote",
      href: `/jobs/${jobId}/quotes/${latestQuote.id}`,
    },
  };
}

export type FinancialInvoiceFacts = {
  id: string;
  status: InvoiceStatus;
  totalAmountCents: number;
  amountPaidCents: number;
  requiresHomeownerReview: boolean;
  homeownerReviewConfirmedAt: Date | string | null;
  /** Set once the invoice — or the review request — actually goes out. */
  sentAt: Date | string | null;
} | null;

/**
 * §19.2/§25 Phase 2's Additional Work review wait is a real state a
 * business owner needs to see at a glance, and it isn't one of
 * `InvoiceStatus`'s values — the row stays `DRAFT` on purpose while a
 * homeowner reviews it (see `shareInvoiceAction`/`sendInvoiceEmailAction`).
 * Detected the same way that code leaves evidence of itself: shared
 * (`sentAt` set) but not yet confirmed.
 */
function isAwaitingHomeownerReview(invoice: NonNullable<FinancialInvoiceFacts>): boolean {
  return invoice.requiresHomeownerReview && !invoice.homeownerReviewConfirmedAt && invoice.sentAt != null;
}

export function financialMiniCardState(
  jobId: string,
  liveInvoice: FinancialInvoiceFacts,
  hasApprovedQuote: boolean
): MiniCardState {
  if (!liveInvoice) {
    return {
      label: "No invoice yet",
      description: hasApprovedQuote
        ? "Nothing has been billed for this job yet."
        : "Nothing to bill until a quote is approved, or bill directly for work outside one.",
      badge: QUIET,
      secondaryDetail: null,
      action: { label: "Go to billing", href: `/jobs/${jobId}?tab=quote` },
    };
  }

  if (isAwaitingHomeownerReview(liveInvoice)) {
    return {
      label: "Awaiting homeowner review",
      description: "Sent for review before it can be paid. They haven't confirmed yet.",
      badge: NEUTRAL,
      secondaryDetail: formatMoney(liveInvoice.totalAmountCents),
      action: { label: "Open the invoice", href: `/jobs/${jobId}/invoices/${liveInvoice.id}` },
    };
  }

  const meta = INVOICE_STATUS_META[liveInvoice.status];
  const owedCents = liveInvoice.totalAmountCents - liveInvoice.amountPaidCents;
  return {
    label: meta.label,
    description: meta.hint,
    badge: meta.badge,
    secondaryDetail:
      owedCents > 0 ? `${formatMoney(owedCents)} owed` : formatMoney(liveInvoice.totalAmountCents),
    action: {
      label: liveInvoice.status === InvoiceStatus.DRAFT ? "Send invoice" : "Open the invoice",
      href: `/jobs/${jobId}/invoices/${liveInvoice.id}`,
    },
  };
}
