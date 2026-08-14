"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { JobStatus } from "@prisma/client";
import { ALL_STATUSES, STATUS_META, statusBadgeClass } from "@/lib/job-status";
import { deleteJobAction } from "@/app/(dashboard)/jobs/[jobId]/status-actions";
import { ConfirmSubmit } from "@/components/dashboard/confirm-submit";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { DataRow } from "@/components/ui/data-row";
import { EmptyState } from "@/components/ui/empty-state";

// Was a hand-rolled `window.confirm` on the form's `onSubmit` — the same
// question, now asked through the shared ConfirmSubmit primitive instead of
// a duplicated instance of the same pattern (Phase 3 migration map §60: this
// callsite migrates because JobsBrowser itself is migrating in this slice).
function DeleteProjectButton({ jobId, jobName }: { jobId: string; jobName: string }) {
  return (
    <form action={deleteJobAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <ConfirmSubmit
        pendingText="Deleting…"
        question={`Delete "${jobName}" and all of its photos, measurements, and quotes? This cannot be undone.`}
        // Impeccable audit finding (live at 390px): the delete control on a
        // job row is a real destructive action, not a data-grid cell — it
        // needs the same >=44px mobile touch target as everything else in
        // DESIGN.md, not the compact 30px it inherited unchanged.
        className="min-h-11 rounded-lg border border-danger/25 bg-danger/10 px-3 text-xs font-medium text-danger-fg transition hover:bg-danger/20 disabled:opacity-60"
      >
        Delete
      </ConfirmSubmit>
    </form>
  );
}

export type BrowserJob = {
  id: string;
  name: string;
  clientName: string;
  /** The address on one line, or null when this job has no address yet. */
  address: string | null;
  status: JobStatus;
  captureSource: string;
  updatedAt: string | Date;
  measurements: number;
  issues: number;
  quotes: number;
};

type SortKey = "recent" | "name" | "client";

export function JobsBrowser({
  jobs,
  initialQuery = "",
}: {
  jobs: BrowserJob[];
  /** A search handed over by another page, e.g. a client's name. */
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "ALL">("ALL");
  const [sort, setSort] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = jobs.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        (p.address?.toLowerCase().includes(q) ?? false)
      );
    });
    rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "client") return a.clientName.localeCompare(b.clientName);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return rows;
  }, [jobs, query, statusFilter, sort]);

  if (jobs.length === 0) {
    return (
      <EmptyState
        kind="first-use"
        title="Let's create your first job"
        description="A name and who it's for is enough to start. Everything else — the address, photos, measurements, the quote — can follow once you have it."
        action={
          <Link
            href="/jobs/new"
            className="inline-flex rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            New job
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <FilterToolbar
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by job, client, or address…"
        resultCount={`${filtered.length} of ${jobs.length} job${jobs.length === 1 ? "" : "s"}`}
        filters={
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as JobStatus | "ALL")}
              aria-label="Filter by status"
              className="rounded-md border border-hairline bg-ground/60 px-3 py-2 text-sm text-ink-strong"
            >
              <option value="ALL">All statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort jobs"
              className="rounded-md border border-hairline bg-ground/60 px-3 py-2 text-sm text-ink-strong"
            >
              <option value="recent">Recently updated</option>
              <option value="name">Name (A–Z)</option>
              <option value="client">Client (A–Z)</option>
            </select>
          </>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState kind="filtered" title="No jobs match your filters." />
      ) : (
        <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface-raised">
          {filtered.map((job) => (
            <DataRow
              key={job.id}
              href={`/jobs/${job.id}`}
              primary={job.name}
              meta={
                <span className="block space-y-1">
                  <span className="block truncate">
                    {job.clientName} · {job.address ?? "No address yet"}
                  </span>
                  <span className="block text-xs text-ink-muted">
                    {job.measurements} measurements · {job.issues} issues · {job.quotes} quotes
                  </span>
                  <span className="block text-xs">
                    <span className="text-ink-muted">Next: </span>
                    <span className="font-medium text-ink-primary">
                      {STATUS_META[job.status].nextStep}
                    </span>
                  </span>
                </span>
              }
              trailing={
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(
                      job.status
                    )}`}
                  >
                    {STATUS_META[job.status].label}
                  </span>
                  <DeleteProjectButton jobId={job.id} jobName={job.name} />
                </div>
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
