import Link from "next/link";
import { QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageCapability } from "@/lib/auth";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobClient, jobIdentityInclude } from "@/lib/job-identity";
import { formatMoney } from "@/lib/money";
import {
  OUTSTANDING,
  QUOTE_STATUS_FLOW,
  QUOTE_STATUS_META,
  quoteStatusTone,
} from "@/lib/quote-status";
import { DATE_RANGES, isRangeKey, rangeStart, type RangeKey } from "@/lib/date-range";
import { FilterPill } from "@/components/dashboard/filter-pill";
import { QuotesTable, type QuoteRow } from "@/components/dashboard/quotes-table";
import { PageHeader } from "@/components/ui/page-header";
import { NumericReadout } from "@/components/ui/numeric-readout";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Every quote in one place.
 *
 * The job list answers "what work have I got on". This answers a different and
 * more anxious question: **what money is out there waiting on somebody else.**
 * A contractor with eleven quotes in the air cannot hold which of them have
 * gone quiet, and hunting job by job is how a $14,000 re-roof sits unchased for
 * three weeks.
 *
 * One reading, not four — but not in cyan. Three figures sit at the top; the
 * money awaiting an answer leads because it's the number this page exists to
 * make somebody act on, in plain ink like the other two (a quote total is a
 * business figure, never a measurement — the Readout Rule cuts the other way
 * here). The rate beside it is a scoreboard; scoreboards are not readings.
 */
export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; range?: string }>;
}) {
  const { status: statusParam, range: rangeParam } = await searchParams;
  const { company } = await requirePageCapability("viewAllJobs");

  const range: RangeKey = isRangeKey(rangeParam) ? rangeParam : "12m";
  const since = rangeStart(range);

  const status = QUOTE_STATUS_FLOW.find((value) => value === statusParam) ?? null;

  const quotes = await prisma.quote.findMany({
    where: {
      companyId: company.id,
      ...(since ? { createdAt: { gte: since } } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { job: { include: jobIdentityInclude } },
  });

  // The figures are computed over the date range but *not* the status filter —
  // a rate that changes when you filter to Approved would read 100% and mean
  // nothing. Filtering narrows the list; it never rewrites the scoreboard.
  const inRange = await prisma.quote.findMany({
    where: {
      companyId: company.id,
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    select: { status: true, totalAmountCents: true, sentAt: true },
  });

  const outstanding = inRange.filter((quote) => OUTSTANDING.includes(quote.status));
  const outstandingCents = outstanding.reduce((sum, q) => sum + (q.totalAmountCents ?? 0), 0);
  const approved = inRange.filter((quote) => quote.status === QuoteStatus.APPROVED);
  const approvedCents = approved.reduce((sum, q) => sum + (q.totalAmountCents ?? 0), 0);

  // Of the quotes that actually went out, how many came back a yes. Drafts are
  // excluded on purpose: a quote nobody was ever sent did not fail to convert,
  // and counting it as a loss makes the number describe your admin instead of
  // your selling.
  const answered = inRange.filter((quote) => quote.sentAt !== null);
  const approvalRate =
    answered.length === 0 ? null : Math.round((approved.length / answered.length) * 100);

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        eyebrow="Quotes"
        title="What you're waiting on"
        description={`Everything you've quoted in the ${DATE_RANGES[range].label.toLowerCase()}, and where each one stands.`}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        {/* Was the one cyan figure on this surface — same backwards-Readout-
            Rule bug Phase 4 found on the dashboard. Money is a business
            figure, never a measurement. */}
        <div className="rounded-lg border border-hairline bg-surface-raised p-6">
          <NumericReadout
            label="Waiting on an answer"
            value={formatMoney(outstandingCents)}
            detail={
              outstanding.length === 0
                ? "Nothing outstanding."
                : `${outstanding.length} ${outstanding.length === 1 ? "quote" : "quotes"} out there.`
            }
            size="lg"
          />
        </div>

        <div className="rounded-lg border border-hairline bg-surface-raised p-6">
          <NumericReadout
            label="Won"
            value={formatMoney(approvedCents)}
            detail={`${approved.length} approved in this period.`}
            size="lg"
          />
        </div>

        <div className="rounded-lg border border-hairline bg-surface-raised p-6">
          <NumericReadout
            label="Of the ones you sent"
            value={approvalRate === null ? null : `${approvalRate}%`}
            detail={
              approvalRate === null
                ? "Send one and this fills in."
                : `${approved.length} of ${answered.length} came back a yes.`
            }
            size="lg"
          />
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <FilterPill href={`/quotes?range=${range}`} active={status === null}>
          All
        </FilterPill>
        {QUOTE_STATUS_FLOW.map((value) => (
          <FilterPill
            key={value}
            href={`/quotes?range=${range}&status=${value}`}
            active={status === value}
          >
            {QUOTE_STATUS_META[value].label}
          </FilterPill>
        ))}

        <span className="ml-auto flex flex-wrap gap-2">
          {(Object.keys(DATE_RANGES) as RangeKey[]).map((key) => (
            <FilterPill
              key={key}
              href={`/quotes?range=${key}${status ? `&status=${status}` : ""}`}
              active={range === key}
            >
              {DATE_RANGES[key].label}
            </FilterPill>
          ))}
        </span>
      </section>

      {quotes.length === 0 ? (
        <EmptyState
          kind={status ? "filtered" : "first-use"}
          title={
            status
              ? `Nothing ${QUOTE_STATUS_META[status].label.toLowerCase()} in this period.`
              : "No quotes in this period yet."
          }
          description="Quotes are written on a job — open one and price it there."
          action={
            <Link
              href="/jobs"
              className="inline-block rounded-md bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              Go to your jobs
            </Link>
          }
        />
      ) : (
        /* Scrolls in its own box rather than pushing the page sideways. */
        <div className="overflow-x-auto rounded-lg border border-hairline bg-surface-raised">
          <QuotesTable rows={quotes.map((quote): QuoteRow => {
            const client = jobClient(quote.job);
            const address = formatAddress(jobAddress(quote.job));
            const meta = QUOTE_STATUS_META[quote.status];
            return {
              id: quote.id,
              jobId: quote.jobId,
              clientName: client.name,
              title: quote.title,
              quoteLabel: quote.quoteNumber ? `#${quote.quoteNumber}` : "—",
              address: address ?? "—",
              createdLabel: quote.createdAt.toLocaleDateString("en-CA", { dateStyle: "medium" }),
              statusLabel: meta.label,
              statusHint: meta.hint,
              statusTone: quoteStatusTone(quote.status),
              totalLabel: formatMoney(quote.totalAmountCents),
            };
          })} />
        </div>
      )}
    </div>
  );
}

