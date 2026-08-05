"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { JobStatus } from "@prisma/client";
import { ALL_STATUSES, STATUS_META, statusBadgeClass } from "@/lib/job-status";
import { deleteJobAction } from "@/app/(dashboard)/jobs/[jobId]/status-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

function DeleteProjectButton({ jobId, jobName }: { jobId: string; jobName: string }) {
  return (
    <form
      action={deleteJobAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete "${jobName}" and all of its photos, measurements, and quotes? This cannot be undone.`
          )
        ) {
          event.preventDefault();
        }
      }}
      className="absolute bottom-4 right-4 z-10"
    >
      <input type="hidden" name="jobId" value={jobId} />
      <SubmitButton
        pendingText="Deleting…"
        className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger-fg transition hover:bg-danger/20 disabled:opacity-60"
      >
        Delete
      </SubmitButton>
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
      <div className="rounded-3xl border border-dashed border-hairline p-10 text-center">
        <p className="text-lg font-medium text-ink-primary">Let&apos;s create your first job</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
          A name and who it&apos;s for is enough to start. Everything else — the address, photos,
          measurements, the quote — can follow once you have it.
        </p>
        <Link
          href="/jobs/new"
          className="mt-5 inline-flex rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        >
          New job
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by job, client, or address…"
          className="min-w-0 flex-1 rounded-xl border border-hairline bg-ground/60 px-4 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-signal-blue/50 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as JobStatus | "ALL")}
          aria-label="Filter by status"
          className="rounded-xl border border-hairline bg-ground/60 px-3 py-2 text-sm text-ink-strong"
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
          className="rounded-xl border border-hairline bg-ground/60 px-3 py-2 text-sm text-ink-strong"
        >
          <option value="recent">Recently updated</option>
          <option value="name">Name (A–Z)</option>
          <option value="client">Client (A–Z)</option>
        </select>
      </div>

      <p className="text-xs text-ink-muted">
        {filtered.length} of {jobs.length} job{jobs.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline p-10 text-center text-ink-muted">
          No jobs match your filters.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((job) => (
            <div key={job.id} className="relative">
              <Link
                href={`/jobs/${job.id}`}
                className="block rounded-2xl border border-hairline bg-surface-raised p-5 transition hover:bg-surface-lifted"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h4 className="truncate text-lg font-semibold text-ink-primary">{job.name}</h4>
                    <p className="mt-1 text-sm text-ink-muted">{job.clientName}</p>
                    <p className="mt-2 truncate text-sm text-ink-muted">
                      {job.address ?? "No address yet"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(
                      job.status
                    )}`}
                  >
                    {STATUS_META[job.status].label}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 pr-20 text-sm text-ink-muted">
                  <span>{job.measurements} measurements</span>
                  <span>•</span>
                  <span>{job.issues} issues</span>
                  <span>•</span>
                  <span>{job.quotes} quotes</span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-ink-muted">Next:</span>
                  <span className="font-medium text-ink-primary">{STATUS_META[job.status].nextStep}</span>
                </div>
              </Link>
              <DeleteProjectButton jobId={job.id} jobName={job.name} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
