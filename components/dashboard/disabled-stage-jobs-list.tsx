import Link from "next/link";
import { sinceLabel } from "@/lib/relative-time";
import { DataRow } from "@/components/ui/data-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Status } from "@/components/ui/status";
import { statusTone } from "@/lib/job-status";
import type { JobStatus } from "@prisma/client";

export type DisabledStageJobRow = {
  id: string;
  name: string;
  clientName: string;
  address: string | null;
  status: JobStatus;
  statusLabel: string;
  stageEnteredAt: string | Date;
};

/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §15/§25 Phase 12 — the dashboard action
 * item's exact destination. Deliberately not `JobsBrowser`: that component
 * always re-sorts to its own "recently updated" default the moment it
 * mounts, which would silently undo the required oldest-stuck-first
 * tiebreak the instant this page rendered. This is a plain, unsortable
 * list — the order it's given is the order it shows, full stop.
 */
export function DisabledStageJobsList({ jobs }: { jobs: DisabledStageJobRow[] }) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        kind="clear"
        title="Nothing sitting in a disabled stage"
        description="Every job is either in an active stage or archived."
        action={
          <Link
            href="/jobs"
            className="inline-flex rounded-lg border border-hairline bg-surface-raised px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            See all jobs
          </Link>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-hairline rounded-lg border border-hairline bg-surface-raised">
      {jobs.map((job) => (
        <DataRow
          key={job.id}
          href={`/jobs/${job.id}`}
          primary={job.name}
          meta={
            <span className="block space-y-1">
              <span className="block truncate">
                {job.clientName} · {job.address ?? "No address yet"}
              </span>
              <span className="block text-xs">
                Stuck since <span className="text-ink-secondary">{sinceLabel(job.stageEnteredAt)}</span>
              </span>
            </span>
          }
          trailing={
            <Status variant="solid" tone={statusTone(job.status)} label={job.statusLabel} />
          }
        />
      ))}
    </ul>
  );
}
