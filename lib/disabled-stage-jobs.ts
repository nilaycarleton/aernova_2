/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §15/§25 Phase 12 — the dashboard/jobs-list
 * counterpart to Phase 11's job-page warning: which jobs are currently
 * sitting in a stage their own company has since disabled, and in what
 * order to show them.
 *
 * Split the same way `lib/workflow-stages.ts`/`lib/workflow-template.ts`
 * are: `sortDisabledStageJobs()` is pure and unit-tested without a
 * database; `getDisabledStageJobs()` is the one Prisma-touching query,
 * shared by the dashboard's count and the `/jobs?attention=…` list so
 * there's exactly one place that decides what "currently in a disabled
 * stage" means.
 */
import { ActivityKind, type JobStatus } from "@prisma/client";
import { prisma } from "./prisma.ts";

export type DisabledStageJobFacts = {
  id: string;
  title: string;
  jobNumber: number | null;
  /**
   * When this job most recently entered its current status — the latest
   * `STATUS_CHANGED` activity event for it, since `Job.status` only ever
   * changes through `updateJobStatusAction`, which always logs one when
   * the status actually moves. Falls back to `createdAt` for a job that
   * has never changed status since creation (no event exists because
   * nothing changed) — which is also the correct entry time for that case.
   */
  stageEnteredAt: Date;
  createdAt: Date;
};

export type DisabledStageJob = DisabledStageJobFacts & { status: JobStatus };

/**
 * The full, deterministic tiebreak from §15:
 * 1. Oldest entry into the current (now-disabled) stage.
 * 2. Oldest job created.
 * 3. Jobs with a `jobNumber` before jobs without one.
 * 4. `jobNumber` ascending, among numbered jobs.
 * 5. `title` ascending.
 * 6. `id` ascending — the final, always-present fallback.
 *
 * Never reorders for a reason a business owner couldn't see: every level
 * only ever breaks a genuine tie at the level above it.
 */
export function sortDisabledStageJobs<T extends DisabledStageJobFacts>(jobs: T[]): T[] {
  return [...jobs].sort((a, b) => {
    const stageDiff = a.stageEnteredAt.getTime() - b.stageEnteredAt.getTime();
    if (stageDiff !== 0) return stageDiff;

    const createdDiff = a.createdAt.getTime() - b.createdAt.getTime();
    if (createdDiff !== 0) return createdDiff;

    const aHasNumber = a.jobNumber != null;
    const bHasNumber = b.jobNumber != null;
    if (aHasNumber !== bHasNumber) return aHasNumber ? -1 : 1;
    if (aHasNumber && bHasNumber && a.jobNumber !== b.jobNumber) {
      return (a.jobNumber as number) - (b.jobNumber as number);
    }

    const titleDiff = a.title.localeCompare(b.title);
    if (titleDiff !== 0) return titleDiff;

    return a.id.localeCompare(b.id);
  });
}

/**
 * Exactly the jobs whose *current* status matches one of the company's
 * disabled stages — never a job merely because a future stage is disabled,
 * never one that has already moved out of the disabled stage it used to
 * sit in. Reads only; nothing here ever writes `Job.status`.
 */
export async function getDisabledStageJobs(companyId: string): Promise<DisabledStageJob[]> {
  const disabledRows = await prisma.companyWorkflowStage.findMany({
    where: { companyId, isEnabled: false },
    select: { jobStatus: true },
  });
  if (disabledRows.length === 0) return [];

  const jobs = await prisma.job.findMany({
    where: { companyId, status: { in: disabledRows.map((row) => row.jobStatus) } },
    select: { id: true, name: true, jobNumber: true, status: true, createdAt: true },
  });
  if (jobs.length === 0) return [];

  const latestStatusChanges = await prisma.activityEvent.findMany({
    where: { jobId: { in: jobs.map((job) => job.id) }, kind: ActivityKind.STATUS_CHANGED },
    orderBy: { createdAt: "desc" },
    distinct: ["jobId"],
    select: { jobId: true, createdAt: true },
  });
  const enteredAtByJobId = new Map(
    latestStatusChanges.map((event) => [event.jobId as string, event.createdAt])
  );

  const facts: DisabledStageJob[] = jobs.map((job) => ({
    id: job.id,
    title: job.name,
    jobNumber: job.jobNumber,
    status: job.status,
    stageEnteredAt: enteredAtByJobId.get(job.id) ?? job.createdAt,
    createdAt: job.createdAt,
  }));

  return sortDisabledStageJobs(facts);
}
