import Link from "next/link";
import { formatMoney } from "@/lib/money";
import type { JobFinancialSummary } from "@/lib/job-financial-summary";

const ACTION_LINK =
  "rounded-xl border border-hairline bg-surface-raised px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument";

/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §6/§21/§25 Phase 8 — the composed
 * "financial status of this job" view the plan has flagged as a gap since
 * the first draft. Deeper on the page than the Phase 7 Financial mini-card
 * on purpose: that card is the quick glance, this is the closeout review —
 * neither replaces the other. Every figure comes from
 * `lib/job-financial-summary.ts`; this component only lays them out.
 *
 * Office-facing only by construction — only ever rendered where the caller
 * has already checked `viewMoney`, same as every other money surface on
 * this page (rail tiles, Estimate Summary Panel, the mini-cards).
 */
export function FinancialCompletionPanel({
  jobId,
  summary,
  approvedQuoteId,
  latestInvoiceId,
}: {
  jobId: string;
  summary: JobFinancialSummary;
  approvedQuoteId: string | null;
  latestInvoiceId: string | null;
}) {
  const hasAnyActivity =
    summary.hasApprovedQuote || summary.hasAdditionalWork || summary.totalInvoicedCents > 0;

  if (!hasAnyActivity) {
    return (
      <section className="rounded-3xl border border-dashed border-hairline p-8 text-center">
        <p className="text-sm font-medium text-ink-primary">Nothing to summarize yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
          Once there&rsquo;s an approved quote, or a bill for work outside one, the contract and
          billing totals show up here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
      <h3 className="text-lg font-semibold text-ink-primary">Financial summary</h3>
      <p className="mt-1 text-sm text-ink-muted">
        Contract value and billing, all in one place — for closing out the job.
      </p>

      {summary.hasApprovedQuote ? (
        <div className="mt-4 space-y-2 border-t border-hairline pt-4">
          <Row label="Original contract" value={formatMoney(summary.originalContractCents ?? 0)} />
          <Row
            label="Approved change orders"
            value={formatMoney(summary.approvedChangeOrdersCents)}
          />
          <Row
            label="Effective contract total"
            value={formatMoney(summary.effectiveContractValueCents)}
            emphasize
          />
          <Row label="Invoiced against contract" value={formatMoney(summary.contractInvoicedCents)} />
          <Row
            label="Remaining contract to bill"
            value={formatMoney(summary.remainingContractToBillCents)}
          />
        </div>
      ) : (
        <p className="mt-4 border-t border-hairline pt-4 text-sm text-ink-muted">
          No approved quote yet — nothing counts toward contract value until there is one.
        </p>
      )}

      {/* §19.2/§21 — kept visibly apart from the contract rows above, never
          summed into them. Real money billed for real work, but not part of
          what was agreed to. */}
      {summary.hasAdditionalWork ? (
        <div className="mt-4 space-y-2 border-t border-hairline pt-4">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">
            Additional work — outside the contract
          </p>
          <Row
            label="Additional work invoiced"
            value={formatMoney(summary.additionalWorkInvoicedCents)}
          />
        </div>
      ) : null}

      <div className="mt-4 space-y-2 border-t border-hairline pt-4">
        <Row label="Total invoiced" value={formatMoney(summary.totalInvoicedCents)} />
        <Row label="Paid" value={formatMoney(summary.paidCents)} />
        <Row label="Balance due" value={formatMoney(summary.balanceDueCents)} emphasize />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {approvedQuoteId ? (
          <Link href={`/jobs/${jobId}/quotes/${approvedQuoteId}`} className={ACTION_LINK}>
            Open the quote
          </Link>
        ) : null}
        {latestInvoiceId ? (
          <Link href={`/jobs/${jobId}/invoices/${latestInvoiceId}`} className={ACTION_LINK}>
            Open the latest invoice
          </Link>
        ) : null}
        <Link href={`/jobs/${jobId}?tab=quote`} className={ACTION_LINK}>
          Go to billing
        </Link>
      </div>
    </section>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={`text-sm ${emphasize ? "font-medium text-ink-primary" : "text-ink-secondary"}`}>
        {label}
      </span>
      <span
        className={`tabular-nums text-ink-primary ${
          emphasize ? "text-base font-semibold" : "text-sm font-medium"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
