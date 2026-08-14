import Link from "next/link";
import { InvoiceStatus, QuoteStatus, RequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageCapability } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { agedReceivables } from "@/lib/reports/aged-receivables";
import { sweepOverdueInvoices } from "@/lib/invoice/overdue";
import { getDisabledStageJobs } from "@/lib/disabled-stage-jobs";
import { buildActionCenterItems, type ActionCenterFacts } from "@/lib/dashboard-action-center";
import { DashboardCommandBand } from "@/components/dashboard/dashboard-command-band";
import { DashboardActionCenter } from "@/components/dashboard/dashboard-action-center";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RevenueTrendSummary } from "@/components/dashboard/revenue-trend-summary";
import { PipelineSnapshot } from "@/components/dashboard/pipeline-snapshot";

/**
 * The overview: where the money is and where the work stands.
 *
 * The job list moved to `/jobs` — its own noun's address — and what is left
 * here is the thing a contractor opens first thing in the morning to see how
 * the business is doing, rather than to find one job. The counters grow into
 * Jobber's five-noun home screen as requests, quotes and invoices land.
 */
export default async function DashboardPage() {
  const { company, role } = await requirePageCapability("viewAllJobs");
  const canViewMoney = can(role, "viewMoney");

  // OVERDUE goes stale with nothing but the clock — same sweep-on-view
  // `/invoices` runs before reading invoice standing (lib/invoice/overdue.ts).
  if (canViewMoney) await sweepOverdueInvoices(company.id);

  const [jobs, overdueInvoices, newRequestCount, changesRequestedQuoteCount, disabledStageJobs] =
    await Promise.all([
      prisma.job.findMany({
        where: { companyId: company.id },
        include: { quotes: true },
        orderBy: { updatedAt: "desc" },
      }),
      canViewMoney
        ? prisma.invoice.findMany({
            where: { companyId: company.id, status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.VOID] } },
            select: { totalAmountCents: true, amountPaidCents: true, status: true, dueAt: true },
          })
        : Promise.resolve([]),
      prisma.request.count({ where: { companyId: company.id, status: RequestStatus.NEW } }),
      canViewMoney
        ? prisma.quote.count({ where: { companyId: company.id, status: QuoteStatus.CHANGES_REQUESTED } })
        : Promise.resolve(0),
      getDisabledStageJobs(company.id),
    ]);

  const totalJobs = jobs.length;
  const readyForQuote = jobs.filter((job) => job.status === "READY_FOR_QUOTE").length;
  const quoted = jobs.filter((job) => job.status === "QUOTED").length;

  const totalDraftQuoteValueCents = jobs.reduce((sum, job) => {
    const latestQuote = job.quotes[0];
    return sum + (latestQuote?.totalAmountCents ?? 0);
  }, 0);

  // Same reading `ReceivablesSummary` used to show on its own tile — reused
  // rather than re-derived, so "overdue" means one thing everywhere it appears.
  const { rows: agingRows, totalCents: totalReceivableCents } = agedReceivables(
    overdueInvoices.map((invoice) => ({
      totalAmountCents: invoice.totalAmountCents,
      payments: [{ amountCents: invoice.amountPaidCents }],
      status: invoice.status,
      dueAt: invoice.dueAt,
    }))
  );
  const overdueInvoiceCents =
    totalReceivableCents - (agingRows.find((row) => row.key === "current")?.cents ?? 0);
  const overdueInvoiceCount = agingRows
    .filter((row) => row.key !== "current")
    .reduce((sum, row) => sum + row.count, 0);

  const actionCenterFacts: ActionCenterFacts = {
    canViewMoney,
    overdueInvoiceCount,
    overdueInvoiceCents,
    newRequestCount,
    changesRequestedQuoteCount,
    disabledStageJobCount: disabledStageJobs.length,
  };
  const actionCenterItems = buildActionCenterItems(actionCenterFacts);

  return (
    <div className="min-w-0 space-y-8">
      {/* No PageHeader here — live review showed it repeating TopNav's own
          "Dashboard" heading with no added content (no description, no
          page-level action beyond what DashboardCommandBand already shows).
          PageHeader earns its place on Jobs/Job workspace because it carries
          real distinct content there; on Dashboard it would be decoration. */}
      <DashboardCommandBand
        totalJobs={totalJobs}
        readyForQuote={readyForQuote}
        quoted={quoted}
        totalValueCents={totalDraftQuoteValueCents}
      />

      {totalJobs > 0 ? (
        <p className="text-sm text-ink-muted">
          <Link
            href="/jobs"
            className="font-medium text-ink-primary underline underline-offset-4 transition hover:text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            See all {totalJobs} {totalJobs === 1 ? "job" : "jobs"}
          </Link>{" "}
          to search, filter and sort them.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardActionCenter items={actionCenterItems} />
        </div>
        <RevenueTrendSummary companyId={company.id} />
      </div>

      <PipelineSnapshot companyId={company.id} />

      <RecentActivity companyId={company.id} />
    </div>
  );
}
