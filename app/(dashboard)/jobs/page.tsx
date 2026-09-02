import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageCapability } from "@/lib/auth";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobClient, jobIdentityInclude } from "@/lib/job-identity";
import { getDisabledStageJobs } from "@/lib/disabled-stage-jobs";
import { effectiveStageMeta } from "@/lib/workflow-stages";
import { JobsBrowser } from "@/components/dashboard/jobs-browser";
import {
  DisabledStageJobsList,
  type DisabledStageJobRow,
} from "@/components/dashboard/disabled-stage-jobs-list";
import { PageHeader } from "@/components/ui/page-header";

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
  // until a client detail page exists. `?attention=disabled-workflow-stage`
  // is the Phase 12 dashboard Action Center's own link target — see
  // `lib/dashboard-action-center.ts` and `lib/disabled-stage-jobs.ts`.
  searchParams: Promise<{ q?: string; attention?: string }>;
}) {
  const { company } = await requirePageCapability("viewAllJobs");
  const { q, attention } = await searchParams;

  if (attention === "disabled-workflow-stage") {
    return <DisabledWorkflowStageJobs companyId={company.id} />;
  }

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
      <PageHeader
        title="Jobs"
        // Silent when the list is empty: `JobsBrowser` already says so, at the
        // size the situation deserves, and saying it twice on one screen makes
        // the emptiness feel like a fault. The empty state also carries its
        // own "New job" button, so a second one up here would be two primary
        // actions for one decision.
        description={jobs.length > 0 ? `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"} — search, filter and sort them here.` : undefined}
        primaryAction={
          jobs.length > 0 ? (
            <Link
              href="/jobs/new"
              className="rounded-md bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              New job
            </Link>
          ) : undefined
        }
        secondaryActions={
          jobs.length > 0 ? (
            // Only on a phone. On a desktop the full form is right there and a
            // shortcut past it is just a second door to the same room.
            <Link
              href="/jobs/quick"
              className="rounded-lg border border-hairline bg-surface-raised px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument sm:hidden"
            >
              Quick job
            </Link>
          ) : undefined
        }
      />

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

/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §15/§25 Phase 12 — the exact filtered
 * jobs list the dashboard's disabled-stage Action Center item links to.
 * Deliberately not `JobsBrowser`: this list has one required order
 * (oldest-stuck-first, `sortDisabledStageJobs`'s full tiebreak) and
 * `JobsBrowser` always re-sorts to "recently updated" on mount, which
 * would undo it the instant the page rendered. `DisabledStageJobsList` is
 * a plain, unsortable list for exactly that reason.
 */
async function DisabledWorkflowStageJobs({ companyId }: { companyId: string }) {
  const disabledStageJobs = await getDisabledStageJobs(companyId);

  const ids = disabledStageJobs.map((job) => job.id);
  const [jobRecords, workflowOverrides] = await Promise.all([
    ids.length > 0
      ? prisma.job.findMany({ where: { id: { in: ids } }, include: jobIdentityInclude })
      : Promise.resolve([]),
    prisma.companyWorkflowStage.findMany({
      where: { companyId },
      select: { jobStatus: true, label: true, isEnabled: true },
    }),
  ]);
  const jobById = new Map(jobRecords.map((job) => [job.id, job]));

  const rows: DisabledStageJobRow[] = disabledStageJobs.flatMap((entry) => {
    const job = jobById.get(entry.id);
    if (!job) return [];
    const meta = effectiveStageMeta(entry.status, workflowOverrides);
    return [
      {
        id: entry.id,
        name: entry.title,
        clientName: jobClient(job).name,
        address: formatAddress(jobAddress(job)),
        status: meta.status,
        statusLabel: meta.label,
        stageEnteredAt: entry.stageEnteredAt,
      },
    ];
  });

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Link href="/jobs" className="hover:text-ink-secondary">
              Jobs
            </Link>
            {" · Disabled stage"}
          </>
        }
        title="Jobs in a disabled stage"
        description="Showing jobs currently sitting in a stage your company has disabled for future jobs — oldest first. Nothing here changed automatically; each one still needs you to move it forward."
      />

      <DisabledStageJobsList jobs={rows} />
    </div>
  );
}
