import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageCapability } from "@/lib/auth";
import { DashboardCommandBand } from "@/components/dashboard/dashboard-command-band";

/**
 * The overview: where the money is and where the work stands.
 *
 * The job list moved to `/jobs` — its own noun's address — and what is left
 * here is the thing a contractor opens first thing in the morning to see how
 * the business is doing, rather than to find one job. The counters grow into
 * Jobber's five-noun home screen as requests, quotes and invoices land.
 */
export default async function DashboardPage() {
  const { company } = await requirePageCapability("viewAllJobs");

  const jobs = await prisma.job.findMany({
    where: { companyId: company.id },
    include: { quotes: true },
    orderBy: { updatedAt: "desc" },
  });

  const totalJobs = jobs.length;
  const readyForQuote = jobs.filter((job) => job.status === "READY_FOR_QUOTE").length;
  const quoted = jobs.filter((job) => job.status === "QUOTED").length;

  const totalDraftQuoteValueCents = jobs.reduce((sum, job) => {
    const latestQuote = job.quotes[0];
    return sum + (latestQuote?.totalAmountCents ?? 0);
  }, 0);

  return (
    <div className="min-w-0 space-y-8">
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
    </div>
  );
}
