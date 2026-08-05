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
} from "@/lib/quote-status";
import { DATE_RANGES, isRangeKey, rangeStart, type RangeKey } from "@/lib/date-range";
import { FilterPill } from "@/components/dashboard/filter-pill";

/**
 * Every quote in one place.
 *
 * The job list answers "what work have I got on". This answers a different and
 * more anxious question: **what money is out there waiting on somebody else.**
 * A contractor with eleven quotes in the air cannot hold which of them have
 * gone quiet, and hunting job by job is how a $14,000 re-roof sits unchased for
 * three weeks.
 *
 * One reading, not four. Three figures sit at the top and only one is cyan —
 * the money awaiting an answer, because that is the number this page exists to
 * make somebody act on. The rate beside it is a scoreboard; scoreboards are not
 * readings.
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
      <header className="min-w-0">
        <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">Quotes</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink-primary">What you&rsquo;re waiting on</h2>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Everything you&rsquo;ve quoted in the {DATE_RANGES[range].label.toLowerCase()}, and where each
          one stands.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {/* The one cyan figure on this surface. */}
        <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Waiting on an answer</p>
          <p className="mt-2 break-words text-4xl font-semibold tabular-nums text-instrument-fg">
            {formatMoney(outstandingCents)}
          </p>
          <p className="mt-2 text-sm text-ink-secondary">
            {outstanding.length === 0
              ? "Nothing outstanding."
              : `${outstanding.length} ${outstanding.length === 1 ? "quote" : "quotes"} out there.`}
          </p>
        </div>

        <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Won</p>
          <p className="mt-2 break-words text-4xl font-semibold tabular-nums text-ink-primary">
            {formatMoney(approvedCents)}
          </p>
          <p className="mt-2 text-sm text-ink-secondary">
            {approved.length} approved in this period.
          </p>
        </div>

        <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Of the ones you sent</p>
          <p className="mt-2 text-4xl font-semibold tabular-nums text-ink-primary">
            {approvalRate === null ? "—" : `${approvalRate}%`}
          </p>
          <p className="mt-2 text-sm text-ink-secondary">
            {approvalRate === null
              ? "Send one and this fills in."
              : `${approved.length} of ${answered.length} came back a yes.`}
          </p>
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
        <div className="rounded-3xl border border-dashed border-hairline p-10 text-center">
          <p className="text-ink-secondary">
            {status
              ? `Nothing ${QUOTE_STATUS_META[status].label.toLowerCase()} in this period.`
              : "No quotes in this period yet."}
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            Quotes are written on a job — open one and price it there.
          </p>
          <Link
            href="/jobs"
            className="mt-5 inline-block rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            Go to your jobs
          </Link>
        </div>
      ) : (
        /* Scrolls in its own box rather than pushing the page sideways. */
        <div className="overflow-x-auto rounded-3xl border border-hairline bg-surface-raised">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline">
                <Th>Client</Th>
                <Th>Quote</Th>
                <Th>Where</Th>
                <Th>Created</Th>
                <Th>Standing</Th>
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => {
                const client = jobClient(quote.job);
                const address = formatAddress(jobAddress(quote.job));
                const meta = QUOTE_STATUS_META[quote.status];
                return (
                  <tr key={quote.id} className="border-b border-hairline last:border-b-0">
                    <td className="px-4 py-3">
                      {/* The whole row is about this quote, so the link is on
                          the thing you'd point at: whose roof it is. */}
                      <Link
                        href={`/jobs/${quote.jobId}/quotes/${quote.id}`}
                        className="font-medium text-ink-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                      >
                        {client.name}
                      </Link>
                      <span className="mt-0.5 block text-xs text-ink-muted">{quote.title}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-secondary">
                      {quote.quoteNumber ? `#${quote.quoteNumber}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">{address ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-secondary">
                      {quote.createdAt.toLocaleDateString("en-CA", { dateStyle: "medium" })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        title={meta.hint}
                        className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-ink-primary">
                      {formatMoney(quote.totalAmountCents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-muted ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}

