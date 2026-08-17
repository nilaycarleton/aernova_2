import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { NumericReadout } from "@/components/ui/numeric-readout";

type Props = {
  totalJobs: number;
  readyForQuote: number;
  quoted: number;
  totalValueCents: number;
};

/**
 * The dashboard opens on the contractor's numbers, not a description of the
 * product. One command band: the open quote value as the hero readout, a
 * plain-language line of where the jobs stand, and the one primary action.
 *
 * The value renders in ordinary ink, not Instrument Cyan — money is a
 * business KPI, not a measurement/reading, and DESIGN.md's Readout Rule
 * reserves cyan for genuine technical truth (roof area, pitch). An earlier
 * revision of this file used `text-instrument-fg` here and called it "the
 * Readout Rule" backwards; Phase 4 corrects that via `NumericReadout`'s own
 * `tone="default"`, which is the only tone this callsite may use.
 */
export function DashboardCommandBand({
  totalJobs,
  readyForQuote,
  quoted,
  totalValueCents,
}: Props) {
  const hasValue = totalValueCents > 0;

  // The three counts a roofer tracks, said the way they'd say them — prose, not
  // three more identical tiles. This absorbs the old Total / Ready / Quoted row.
  const status = [
    `Across ${totalJobs} ${totalJobs === 1 ? "job" : "jobs"}`,
    `${readyForQuote} ready to quote`,
    `${quoted} quoted`,
  ].join(" · ");

  return (
    <section className="min-w-0 rounded-3xl border border-hairline bg-surface-raised p-6 sm:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {hasValue ? (
            <NumericReadout label="Open quote value" value={formatMoney(totalValueCents)} size="lg" />
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">Open quote value</p>
              <p className="mt-1 text-3xl font-semibold text-ink-muted">No open quotes yet</p>
            </>
          )}
          <p className="mt-3 text-sm text-ink-secondary">{status}</p>
        </div>

        <Link
          href="/jobs/new"
          className="shrink-0 rounded-xl bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        >
          New Job
        </Link>
      </div>
    </section>
  );
}
