import Link from "next/link";
import { QuoteStatus, type QuoteDeclineReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageCapability } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { quoteDeclineReasonLabel } from "@/lib/quote-status";
import { DATE_RANGES, isRangeKey, rangeStart, type RangeKey } from "@/lib/date-range";
import { FilterPill } from "@/components/dashboard/filter-pill";
import { ReportsNav } from "@/components/dashboard/reports-nav";
import { PageHeader } from "@/components/ui/page-header";
import { NumericReadout } from "@/components/ui/numeric-readout";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Item 42: won/lost outcome capture with reasons, feeding a win-rate view.
 *
 * The win rate leads this surface, but not in cyan — a percentage is a
 * business scoreboard, not a measurement, so the Readout Rule keeps it off
 * Instrument Cyan the same way it keeps the dollar figures off it. Everything
 * here is plain ink: this page answers "how often do we close," not "what is
 * it worth," and no figure competes with another for the contractor's eye.
 *
 * Scored per **quote**, not per job. A job re-quoted after a decline produces
 * two decisions, not one, and a win rate that collapsed them into "the job's
 * current state" would erase the first no — which is exactly the fact a
 * roofer chasing patterns in *why* jobs are lost needs kept. Archived jobs
 * still count: `lib/pipeline.ts` drops them from the live board on purpose,
 * but a decision that happened is a decision that happened regardless of
 * whether the job was later put away.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const { company } = await requirePageCapability("viewMoney");

  const range: RangeKey = isRangeKey(rangeParam) ? rangeParam : "12m";
  const since = rangeStart(range);

  const [decidedQuotes, closedRequests] = await Promise.all([
    prisma.quote.findMany({
      where: {
        companyId: company.id,
        status: { in: [QuoteStatus.APPROVED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED] },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      select: { status: true, declineReason: true, totalAmountCents: true },
    }),
    prisma.request.count({
      where: {
        companyId: company.id,
        status: "CLOSED",
        jobId: null,
        ...(since ? { requestedAt: { gte: since } } : {}),
      },
    }),
  ]);

  const won = decidedQuotes.filter((q) => q.status === QuoteStatus.APPROVED);
  const lost = decidedQuotes.filter((q) => q.status !== QuoteStatus.APPROVED);
  const decidedCount = decidedQuotes.length;
  const winRate = decidedCount > 0 ? Math.round((won.length / decidedCount) * 100) : null;

  const wonCents = won.reduce((sum, q) => sum + (q.totalAmountCents ?? 0), 0);
  const lostCents = lost.reduce((sum, q) => sum + (q.totalAmountCents ?? 0), 0);

  // EXPIRED carries no `declineReason` — nobody chose that outcome, the price
  // simply lapsed — so it gets its own bucket rather than folding into
  // `QuoteDeclineReason`'s closed set, which is only for a decline somebody
  // actually recorded.
  type ReasonBucket = QuoteDeclineReason | "EXPIRED";
  const reasonOrder: ReasonBucket[] = [
    "PRICE",
    "WENT_WITH_COMPETITOR",
    "BAD_TIMING",
    "NO_LONGER_NEEDED",
    "OTHER",
    "EXPIRED",
  ];
  const reasonCounts = new Map<ReasonBucket, number>();
  for (const quote of lost) {
    const bucket: ReasonBucket =
      quote.status === QuoteStatus.EXPIRED ? "EXPIRED" : (quote.declineReason ?? "OTHER");
    reasonCounts.set(bucket, (reasonCounts.get(bucket) ?? 0) + 1);
  }
  const reasonRows = reasonOrder
    .map((bucket) => ({ bucket, count: reasonCounts.get(bucket) ?? 0 }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  const reasonLabel = (bucket: ReasonBucket) =>
    bucket === "EXPIRED" ? "Expired — no answer came back" : quoteDeclineReasonLabel(bucket);

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        eyebrow="Reports"
        title="Win rate"
        description={`How often a quote you sent came back a yes, in the ${DATE_RANGES[range].label.toLowerCase()}.`}
      />

      <ReportsNav current="/reports" />

      <section className="flex flex-wrap gap-2">
        {(Object.keys(DATE_RANGES) as RangeKey[]).map((key) => (
          <FilterPill key={key} href={`/reports?range=${key}`} active={range === key}>
            {DATE_RANGES[key].label}
          </FilterPill>
        ))}
      </section>

      {decidedCount === 0 ? (
        <EmptyState
          kind="first-use"
          title="Nothing decided yet in this period."
          description="A quote counts here once it's approved, declined, or its price lapses."
          action={
            <Link
              href="/pipeline"
              className="inline-block rounded-md bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              See what&rsquo;s still open
            </Link>
          }
        />
      ) : (
        <>
          <section className="rounded-lg border border-hairline bg-surface-raised p-6 sm:p-8">
            {/* Was the one cyan figure on this surface — same backwards-
                Readout-Rule bug Phase 4 found on the dashboard. A win rate is
                a business scoreboard figure, never a measurement. */}
            <NumericReadout label="Win rate" value={`${winRate}%`} size="lg" />
            <p className="mt-3 text-sm text-ink-secondary">
              {`${won.length} won · ${lost.length} lost · ${decidedCount} decided`}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {`${formatMoney(wonCents)} won, ${formatMoney(lostCents)} lost.`}
            </p>
          </section>

          <section className="rounded-lg border border-hairline bg-surface-raised p-6">
            <h3 className="text-lg font-semibold text-ink-primary">Why they were lost</h3>
            {reasonRows.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">Nothing lost in this period.</p>
            ) : (
              <ul className="mt-4 divide-y divide-hairline">
                {reasonRows.map(({ bucket, count }) => {
                  const share = Math.round((count / lost.length) * 100);
                  return (
                    <li
                      key={bucket}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <span className="text-sm text-ink-primary">{reasonLabel(bucket)}</span>
                      <span className="shrink-0 text-sm tabular-nums text-ink-secondary">
                        {count} · {share}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {closedRequests > 0 ? (
            <p className="text-sm text-ink-muted">
              {closedRequests} more {closedRequests === 1 ? "lead" : "leads"} closed in this
              period without ever becoming a quote — worth a call in a year, same as a declined
              one.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
