import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PIPELINE_STAGES, PIPELINE_STAGE_META, stageForJob, stageForRequest } from "@/lib/pipeline";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Where the business is stuck, right now — not a period report. Reuses
 * `/reports/revenue`'s exact stage-classification (stageForJob/
 * stageForRequest over the same PIPELINE_STAGES), but deliberately
 * unfiltered by date: a job that's been sitting in Opened for two months is
 * still stuck today, whether or not it falls inside whatever reporting
 * window happens to be selected elsewhere. WON and LOST are excluded —
 * they're resolved, not "in" the pipeline anymore; that history lives on
 * the revenue report's Lead funnel instead.
 */
export async function PipelineSnapshot({ companyId }: { companyId: string }) {
  const [openRequests, activeJobs] = await Promise.all([
    prisma.request.findMany({
      where: { companyId, status: { in: ["NEW", "ASSESSING"] }, jobId: null },
      select: { status: true },
    }),
    prisma.job.findMany({
      where: { companyId, status: { not: "ARCHIVED" } },
      select: {
        status: true,
        quotes: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
      },
    }),
  ]);

  const counts = new Map(PIPELINE_STAGES.map((stage) => [stage, 0]));
  for (const request of openRequests) {
    const stage = stageForRequest(request.status);
    if (stage) counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }
  for (const job of activeJobs) {
    const stage = stageForJob(job.status, job.quotes[0]?.status ?? null);
    if (stage) counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }

  const rows = PIPELINE_STAGES.filter((stage) => stage !== "WON" && stage !== "LOST")
    .map((stage) => ({ stage, count: counts.get(stage) ?? 0 }))
    .filter((row) => row.count > 0);

  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <section className="min-w-0 rounded-lg border border-hairline bg-surface-raised p-6">
      <h2 className="text-sm font-semibold text-ink-primary">Where things stand</h2>

      {total === 0 ? (
        <div className="mt-4">
          <EmptyState
            kind="clear"
            title="Nothing in the pipeline right now."
            description="New requests and open quotes will show up here."
            compact
          />
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-hairline">
          {rows.map((row) => (
            <li key={row.stage} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <span className="text-sm text-ink-primary">{PIPELINE_STAGE_META[row.stage].label}</span>
              <span className="shrink-0 text-sm tabular-nums text-ink-secondary">{row.count}</span>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/pipeline"
        className="mt-4 inline-block text-sm font-medium text-ink-primary underline underline-offset-4 transition hover:text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
      >
        Open the board
      </Link>
    </section>
  );
}
