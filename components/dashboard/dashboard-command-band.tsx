import Link from "next/link";
import { formatMoney } from "@/lib/money";

type Props = {
  totalJobs: number;
  readyForQuote: number;
  quoted: number;
  totalValueCents: number;
};

/**
 * The dashboard opens on the contractor's numbers, not a description of the
 * product. One command band: the open quote value as the hero readout — the
 * single cyan figure per the Readout Rule — a plain-language line of where the
 * jobs stand, and the one primary action. This replaces the old marketing hero
 * plus four identical stat tiles: the number is the content, and everything
 * around it is there to keep it readable. It is the same readout language the
 * job header opens with, so the whole app reads as one instrument.
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
          <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">
            Open quote value
          </p>
          {hasValue ? (
            <p className="mt-2 break-words text-5xl font-semibold tabular-nums text-instrument-fg">
              {formatMoney(totalValueCents)}
            </p>
          ) : (
            <p className="mt-2 text-3xl font-semibold text-ink-muted">
              No open quotes yet
            </p>
          )}
          <p className="mt-3 text-sm text-ink-secondary">{status}</p>
        </div>

        <Link
          href="/jobs/new"
          className="shrink-0 rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        >
          New Job
        </Link>
      </div>
    </section>
  );
}
