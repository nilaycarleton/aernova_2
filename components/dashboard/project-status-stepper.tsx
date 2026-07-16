"use client";

import { useState, useTransition } from "react";
import { ProjectStatus } from "@prisma/client";
import {
  STATUS_FLOW,
  STATUS_META,
  ALL_STATUSES,
  nextStatus,
} from "@/lib/project-status";
import { updateProjectStatusAction } from "@/app/(dashboard)/projects/[projectId]/status-actions";

export function ProjectStatusStepper({
  projectId,
  status,
}: {
  projectId: string;
  status: ProjectStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentIndex = STATUS_FLOW.indexOf(status);
  const next = nextStatus(status);
  const meta = STATUS_META[status];

  const setStatus = (target: ProjectStatus) => {
    if (target === status) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateProjectStatusAction(projectId, target);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update status");
      }
    });
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Workflow</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{meta.label}</h3>
          <p className="mt-1 max-w-xl text-sm text-slate-400">{meta.description}</p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {next && (
            <button
              type="button"
              onClick={() => setStatus(next)}
              disabled={pending}
              className="rounded-xl border border-white/10 bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/30 disabled:opacity-50"
            >
              {pending ? "Saving…" : STATUS_META[status].advanceLabel}
            </button>
          )}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            disabled={pending}
            aria-label="Set project status"
            className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 disabled:opacity-50"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      {/* Pipeline stepper */}
      <ol className="mt-6 flex flex-wrap gap-x-2 gap-y-3">
        {STATUS_FLOW.map((stage, index) => {
          const done = currentIndex > index;
          const active = currentIndex === index;
          return (
            <li key={stage} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => setStatus(stage)}
                disabled={pending}
                className="flex min-w-0 items-center gap-2 text-left"
                title={STATUS_META[stage].description}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? `${STATUS_META[stage].dot} text-slate-950`
                      : done
                        ? "bg-emerald-500/80 text-slate-950"
                        : "bg-white/10 text-slate-400"
                  }`}
                >
                  {done ? "✓" : index + 1}
                </span>
                <span
                  className={`truncate text-xs font-medium ${
                    active ? "text-white" : done ? "text-slate-300" : "text-ink-muted"
                  }`}
                >
                  {STATUS_META[stage].label}
                </span>
              </button>
              {index < STATUS_FLOW.length - 1 && (
                <span className={`h-px flex-1 ${done ? "bg-emerald-500/40" : "bg-white/10"}`} />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
