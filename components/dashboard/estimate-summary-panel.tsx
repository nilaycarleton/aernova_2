import { formatMoney } from "@/lib/money";
import type { QuoteTotals } from "@/lib/quote/totals";

/**
 * docs/AERNOVA_PROJECT_WORKFLOW.md §7.3/§25 Phase 5 — the "noted gap" from
 * the first draft: a rolled-up read of the estimate's financial shape,
 * ahead of the line-item builder rather than after it. Purely
 * presentational — every figure here is a `QuoteTotals` field the builder
 * already computes with `computeTotals()` (see `lib/quote/totals.ts`), so
 * there is exactly one place this arithmetic happens, not two.
 *
 * Office/estimator-only by construction: this only ever renders on
 * `QuoteBuilderPage`, which is already gated on `editQuote` (see that
 * page's own comment on why cost/margin can't reach a crew role), and it is
 * never imported by any public/homeowner-facing page.
 */
export function EstimateSummaryPanel({
  totals,
  lineItemCount,
}: {
  totals: QuoteTotals;
  lineItemCount: number;
}) {
  const percent = (value: number | null) => (value === null ? "—" : `${value.toFixed(1)}%`);

  return (
    <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
      <h3 className="text-lg font-semibold text-ink-primary">Estimate summary</h3>
      <p className="mt-1 text-sm text-ink-muted">
        The financial shape of this estimate, before you get into the lines below.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="Estimated revenue" value={formatMoney(totals.totalCents)} />
        <Tile label="Estimated cost" value={formatMoney(totals.costCents)} />
        <Tile label="Gross profit" value={formatMoney(totals.marginCents)} />
        <Tile label="Gross margin" value={percent(totals.marginPercent)} />
        <Tile label="Markup" value={percent(totals.markupPercent)} />
        <Tile
          label="Line items"
          value={`${lineItemCount} ${lineItemCount === 1 ? "line" : "lines"}`}
        />
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        Cost, profit, margin and markup are never shown to the client.
      </p>
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ground/50 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-ink-primary">{value}</p>
    </div>
  );
}
