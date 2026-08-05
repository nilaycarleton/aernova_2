import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageCapability } from "@/lib/auth";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobClient, jobIdentityInclude } from "@/lib/job-identity";
import { JobsBrowser } from "@/components/dashboard/jobs-browser";

/**
 * The job list, at the noun's own address.
 *
 * It used to live on `/dashboard`, which was fine while jobs were the only
 * thing in the product. They are about to stop being: the global `+` offers
 * five nouns — client, request, quote, job, invoice — and four of them will be
 * routes. A sidebar where four nouns are destinations and the fifth is "the
 * dashboard" is wrong in a way that only gets more expensive to fix, so the
 * move happens now, while there is a redirect already in place and no real
 * traffic to break.
 *
 * `/dashboard` keeps the numbers and the pipeline; this page keeps the list.
 *
 * The status tiles Jobber shows above its list — unscheduled, late, requires
 * invoicing — are deliberately absent. Every one of them is a question about a
 * visit or an invoice, and neither exists until Phases 4 and 5. A tile that
 * cannot count anything is worse than no tile.
 */
export default async function JobsPage({
  searchParams,
}: {
  // `?q=` lets another page hand this one a starting search — the client list
  // sends a client's name here, which is the only way to see one client's work
  // until a client detail page exists.
  searchParams: Promise<{ q?: string }>;
}) {
  const { company } = await requirePageCapability("viewAllJobs");
  const { q } = await searchParams;

  const jobs = await prisma.job.findMany({
    where: { companyId: company.id },
    include: {
      measurements: true,
      issues: true,
      quotes: true,
      ...jobIdentityInclude,
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink-primary">Jobs</h2>
          {/* Silent when the list is empty: `JobsBrowser` already says so, at
              the size the situation deserves, and saying it twice on one screen
              makes the emptiness feel like a fault. */}
          {jobs.length > 0 ? (
            <p className="mt-1 text-sm text-ink-muted">
              {jobs.length} {jobs.length === 1 ? "job" : "jobs"} — search, filter and sort them
              here.
            </p>
          ) : null}
        </div>

        {/* The empty state carries its own "New job" button, so a second one up
            here would be two primary actions for one decision. */}
        {jobs.length > 0 ? (
          <div className="flex shrink-0 gap-3">
            {/* Only on a phone. On a desktop the full form is right there and
                a shortcut past it is just a second door to the same room. */}
            <Link
              href="/jobs/quick"
              className="rounded-xl border border-hairline bg-surface-raised px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument sm:hidden"
            >
              Quick job
            </Link>
            <Link
              href="/jobs/new"
              className="rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              New job
            </Link>
          </div>
        ) : null}
      </div>

      <JobsBrowser
        initialQuery={q ?? ""}
        jobs={jobs.map((job) => ({
          id: job.id,
          name: job.name,
          clientName: jobClient(job).name,
          address: formatAddress(jobAddress(job)),
          status: job.status,
          captureSource: job.captureSource,
          updatedAt: job.updatedAt,
          measurements: job.measurements.length,
          issues: job.issues.length,
          quotes: job.quotes.length,
        }))}
      />
    </div>
  );
}
