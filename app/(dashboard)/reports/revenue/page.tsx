import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageCapability } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { DATE_RANGES, isRangeKey, rangeStart, type RangeKey } from "@/lib/date-range";
import { FilterPill } from "@/components/dashboard/filter-pill";
import { ReportsNav } from "@/components/dashboard/reports-nav";
import { PageHeader } from "@/components/ui/page-header";
import { NumericReadout } from "@/components/ui/numeric-readout";
import { EmptyState } from "@/components/ui/empty-state";
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_META,
  stageForJob,
  stageForRequest,
  type PipelineStage,
} from "@/lib/pipeline";
import {
  rankJobsByProfit,
  revenueByJobType,
  revenueBySource,
  totalRevenueCents,
  type InvoiceForRevenue,
  type JobProfitRow,
} from "@/lib/reports/revenue";
import { actualProfitCents } from "@/lib/job-costing";

/**
 * Item 47: revenue, by lead source and by job type, the lead funnel, and
 * profit per job. "Revenue" means **invoiced** — confirmed with the user
 * rather than guessed — the sum of what was billed in the period, not what
 * has actually landed. `/reports/aged-receivables` is where the gap between
 * billed and collected belongs instead.
 *
 * Total revenue leads this page, in plain ink — a dollar figure is a business
 * reading, never a measurement, so the Readout Rule this page inherits from
 * `/reports` keeps it off Instrument Cyan. Lead source, job type, the funnel
 * and the profit table are all plain ink too — they explain the number, they
 * don't compete with it.
 */
export default async function RevenueReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const { company } = await requirePageCapability("viewMoney");

  const range: RangeKey = isRangeKey(rangeParam) ? rangeParam : "12m";
  const since = rangeStart(range);
  const dateFilter = since ? { createdAt: { gte: since } } : {};

  const [invoiceRows, openRequests, jobsInRange] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId: company.id,
        status: { notIn: ["DRAFT", "VOID"] },
        ...dateFilter,
      },
      select: {
        jobId: true,
        totalAmountCents: true,
        job: {
          select: {
            name: true,
            type: true,
            client: { select: { leadSource: true } },
          },
        },
      },
    }),
    prisma.request.findMany({
      where: {
        companyId: company.id,
        status: { in: ["NEW", "ASSESSING", "CLOSED"] },
        jobId: null,
        ...(since ? { requestedAt: { gte: since } } : {}),
      },
      select: { status: true },
    }),
    prisma.job.findMany({
      where: { companyId: company.id, status: { not: "ARCHIVED" }, ...dateFilter },
      select: {
        status: true,
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true },
        },
      },
    }),
  ]);

  const invoicesForRevenue: InvoiceForRevenue[] = invoiceRows.map((row) => ({
    totalAmountCents: row.totalAmountCents,
    leadSource: row.job.client?.leadSource ?? null,
    jobType: row.job.type,
  }));

  const totalCents = totalRevenueCents(invoicesForRevenue);
  const bySource = revenueBySource(invoicesForRevenue);
  const byType = revenueByJobType(invoicesForRevenue);

  // Profit per job: billed in the period, cost logged against the job at any
  // time — work is often costed after the invoice that paid for it goes out,
  // and slicing the cost side to the same window would understate it.
  const billedByJob = new Map<string, { name: string; cents: number }>();
  for (const row of invoiceRows) {
    const current = billedByJob.get(row.jobId);
    billedByJob.set(row.jobId, {
      name: row.job.name,
      cents: (current?.cents ?? 0) + row.totalAmountCents,
    });
  }
  const jobIds = [...billedByJob.keys()];
  const expenseTotals =
    jobIds.length === 0
      ? []
      : await prisma.jobExpense.groupBy({
          by: ["jobId"],
          where: { companyId: company.id, jobId: { in: jobIds } },
          _sum: { amountCents: true },
        });
  const actualCostByJob = new Map(expenseTotals.map((row) => [row.jobId, row._sum.amountCents ?? 0]));
  const profitRows: JobProfitRow[] = jobIds.map((jobId) => {
    const billed = billedByJob.get(jobId)!;
    const actualCostCents = actualCostByJob.get(jobId) ?? 0;
    return {
      jobId,
      jobName: billed.name,
      billedCents: billed.cents,
      actualCostCents,
      profitCents: actualProfitCents(billed.cents, actualCostCents),
    };
  });
  const topProfitRows = rankJobsByProfit(profitRows).slice(0, 10);

  const funnelCounts = new Map<PipelineStage, number>(PIPELINE_STAGES.map((s) => [s, 0]));
  for (const request of openRequests) {
    const stage = stageForRequest(request.status);
    if (stage) funnelCounts.set(stage, (funnelCounts.get(stage) ?? 0) + 1);
  }
  for (const job of jobsInRange) {
    const stage = stageForJob(job.status, job.quotes[0]?.status ?? null);
    if (stage) funnelCounts.set(stage, (funnelCounts.get(stage) ?? 0) + 1);
  }
  const funnelRows = PIPELINE_STAGES.map((stage) => ({
    stage,
    count: funnelCounts.get(stage) ?? 0,
  })).filter((row) => row.count > 0);

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        eyebrow="Reports"
        title="Revenue"
        description={`What was billed in the ${DATE_RANGES[range].label.toLowerCase()}, where it came from, and what it actually made.`}
      />

      <ReportsNav current="/reports/revenue" />

      <section className="flex flex-wrap gap-2">
        {(Object.keys(DATE_RANGES) as RangeKey[]).map((key) => (
          <FilterPill key={key} href={`/reports/revenue?range=${key}`} active={range === key}>
            {DATE_RANGES[key].label}
          </FilterPill>
        ))}
      </section>

      {invoiceRows.length === 0 ? (
        <EmptyState
          kind="first-use"
          title="Nothing invoiced yet in this period."
          action={
            <Link
              href="/invoices"
              className="inline-block rounded-md bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              See invoices
            </Link>
          }
        />
      ) : (
        <>
          <section className="rounded-lg border border-hairline bg-surface-raised p-6 sm:p-8">
            {/* Was cyan — same backwards-Readout-Rule bug Phase 4 found on the
                dashboard. Revenue is a business figure, never a measurement. */}
            <NumericReadout
              label="Revenue"
              value={formatMoney(totalCents)}
              detail={`${formatMoney(byType.ONE_OFF)} one-off · ${formatMoney(byType.RECURRING)} recurring`}
              size="lg"
            />
          </section>

          <section className="rounded-lg border border-hairline bg-surface-raised p-6">
            <h3 className="text-lg font-semibold text-ink-primary">By lead source</h3>
            <ul className="mt-4 divide-y divide-hairline">
              {bySource.map((row) => {
                const share = totalCents > 0 ? Math.round((row.cents / totalCents) * 100) : 0;
                return (
                  <li
                    key={row.source}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm text-ink-primary">{row.source}</span>
                    <span className="shrink-0 text-sm tabular-nums text-ink-secondary">
                      {formatMoney(row.cents)} · {share}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {funnelRows.length > 0 ? (
            <section className="rounded-lg border border-hairline bg-surface-raised p-6">
              <h3 className="text-lg font-semibold text-ink-primary">Lead funnel</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Everything opened or moved in this period, by stage.
              </p>
              <ul className="mt-4 divide-y divide-hairline">
                {funnelRows.map((row) => (
                  <li
                    key={row.stage}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm text-ink-primary">
                      {PIPELINE_STAGE_META[row.stage].label}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-ink-secondary">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {topProfitRows.length > 0 ? (
            <section className="rounded-lg border border-hairline bg-surface-raised p-6">
              <h3 className="text-lg font-semibold text-ink-primary">Profit per job</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Billed in this period, less whatever cost has been logged against the job — see
                each job&rsquo;s own Costs tab.
              </p>
              <ul className="mt-4 divide-y divide-hairline">
                {topProfitRows.map((row) => (
                  <li key={row.jobId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/jobs/${row.jobId}?tab=costs`}
                      className="min-w-0 truncate text-sm font-medium text-ink-primary underline underline-offset-4 hover:text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                    >
                      {row.jobName}
                    </Link>
                    <span
                      className={`shrink-0 text-sm font-medium tabular-nums ${
                        row.profitCents < 0 ? "text-danger-fg" : "text-ink-secondary"
                      }`}
                    >
                      {formatMoney(row.profitCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
