"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProjectStatus } from "@prisma/client";
import { ALL_STATUSES, STATUS_META, statusBadgeClass } from "@/lib/project-status";
import { deleteProjectAction } from "@/app/(dashboard)/projects/[projectId]/status-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  return (
    <form
      action={deleteProjectAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete "${projectName}" and all of its photos, measurements, and quotes? This cannot be undone.`
          )
        ) {
          event.preventDefault();
        }
      }}
      className="absolute bottom-4 right-4 z-10"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton
        pendingText="Deleting…"
        className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-60"
      >
        Delete
      </SubmitButton>
    </form>
  );
}

export type BrowserProject = {
  id: string;
  name: string;
  clientName: string;
  addressLine1: string;
  city: string;
  province: string;
  status: ProjectStatus;
  captureSource: string;
  updatedAt: string | Date;
  measurements: number;
  issues: number;
  proposals: number;
};

type SortKey = "recent" | "name" | "client";

export function ProjectsBrowser({ projects }: { projects: BrowserProject[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">("ALL");
  const [sort, setSort] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = projects.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.addressLine1.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
      );
    });
    rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "client") return a.clientName.localeCompare(b.clientName);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return rows;
  }, [projects, query, statusFilter, sort]);

  if (projects.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center">
        <p className="text-lg font-medium text-white">Let&apos;s create your first roof project</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
          Add the client and address, upload your drone photos, and Aernova builds a 3D model you
          can measure and turn into a quote.
        </p>
        <Link
          href="/projects/new"
          className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          New project
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
          placeholder="Search by project, client, or address…"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white placeholder:text-ink-muted focus:border-sky-500/50 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "ALL")}
          aria-label="Filter by status"
          className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
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
          aria-label="Sort projects"
          className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200"
        >
          <option value="recent">Recently updated</option>
          <option value="name">Name (A–Z)</option>
          <option value="client">Client (A–Z)</option>
        </select>
      </div>

      <p className="text-xs text-ink-muted">
        {filtered.length} of {projects.length} project{projects.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-400">
          No projects match your filters.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((project) => (
            <div key={project.id} className="relative">
              <Link
                href={`/projects/${project.id}`}
                className="block rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h4 className="truncate text-lg font-semibold text-white">{project.name}</h4>
                    <p className="mt-1 text-sm text-slate-400">{project.clientName}</p>
                    <p className="mt-2 truncate text-sm text-ink-muted">
                      {project.addressLine1}, {project.city}, {project.province}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(
                      project.status
                    )}`}
                  >
                    {STATUS_META[project.status].label}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 pr-20 text-sm text-slate-400">
                  <span>{project.measurements} measurements</span>
                  <span>•</span>
                  <span>{project.issues} issues</span>
                  <span>•</span>
                  <span>{project.proposals} proposals</span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-ink-muted">Next:</span>
                  <span className="font-medium text-cyan-100">{STATUS_META[project.status].nextStep}</span>
                </div>
              </Link>
              <DeleteProjectButton projectId={project.id} projectName={project.name} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
