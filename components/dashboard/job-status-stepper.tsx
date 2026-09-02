"use client";

import { useState, useTransition } from "react";
import { JobStatus } from "@prisma/client";
import { STATUS_FLOW } from "@/lib/job-status";
import { effectiveStageFlow, effectiveStageMeta, nextEnabledStatus, type StageOverride } from "@/lib/workflow-stages";
import { updateJobStatusAction } from "@/app/(dashboard)/jobs/[jobId]/status-actions";

/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §15/§17/§25 Phase 11 — reads through
 * `effectiveStageMeta()`/`effectiveStageFlow()` instead of `STATUS_META`
 * directly, so a company's custom labels and disabled stages show up here
 * without this component knowing anything about `CompanyWorkflowStage`
 * rows itself. `workflowOverrides` defaults to `[]`, which is exactly
 * "no customization" — every stage renders exactly as it always has.
 */
export function JobStatusStepper({
  jobId,
  status,
  workflowOverrides = [],
}: {
  jobId: string;
  status: JobStatus;
  workflowOverrides?: StageOverride[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentIndex = STATUS_FLOW.indexOf(status);
  const meta = effectiveStageMeta(status, workflowOverrides, status);
  const next = nextEnabledStatus(status, workflowOverrides);

  // Disabled future stages never appear as normal forward choices — but a
  // job's own *current* stage always does, even if the company has since
  // disabled it (§15): nothing here silently drops what a job actually is.
  const visibleFlow = effectiveStageFlow(workflowOverrides, status).filter(
    (m) => m.isEnabled || m.status === status
  );

  const setStatus = (target: JobStatus) => {
    if (target === status) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateJobStatusAction(jobId, target);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update status");
      }
    });
  };

  return (
    <section className="rounded-lg border border-hairline bg-surface-raised p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">Workflow</p>
          <h3 className="mt-1 text-lg font-semibold text-ink-primary">{meta.label}</h3>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">{meta.description}</p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {next && (
            <button
              type="button"
              onClick={() => setStatus(next)}
              disabled={pending}
              className="rounded-lg border border-hairline bg-surface-raised px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument disabled:opacity-50"
            >
              {pending ? "Saving…" : meta.advanceLabel}
            </button>
          )}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as JobStatus)}
            disabled={pending}
            aria-label="Set job status"
            className="rounded-lg border border-hairline bg-ground/60 px-3 py-2 text-sm text-ink-strong disabled:opacity-50"
          >
            {visibleFlow.map((m) => (
              <option key={m.status} value={m.status}>
                {m.label}
              </option>
            ))}
            <option value={JobStatus.ARCHIVED}>
              {effectiveStageMeta(JobStatus.ARCHIVED, workflowOverrides, status).label}
            </option>
          </select>
        </div>
      </div>

      {meta.isCurrentDisabled ? (
        <p className="mt-3 rounded-lg border border-caution/30 bg-caution/5 px-4 py-3 text-sm text-caution-fg">
          This stage is disabled for future jobs. Move this job to the next active stage when ready.
        </p>
      ) : null}

      {error && <p className="mt-3 text-sm text-danger-fg">{error}</p>}

      {/* Pipeline stepper */}
      <ol className="mt-6 flex flex-wrap gap-x-2 gap-y-3">
        {visibleFlow.map((m, displayIndex) => {
          const stageIndex = STATUS_FLOW.indexOf(m.status);
          const done = currentIndex > stageIndex;
          const active = currentIndex === stageIndex;
          return (
            <li key={m.status} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => setStatus(m.status)}
                disabled={pending}
                className="flex min-w-0 items-center gap-2 rounded-lg py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                title={m.isCurrentDisabled ? "Disabled for future jobs" : m.description}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? "bg-action text-on-action"
                      : done
                        ? "bg-confirm/80 text-on-accent"
                        : "bg-surface-lifted text-ink-muted"
                  }`}
                >
                  {done ? "✓" : displayIndex + 1}
                </span>
                <span
                  className={`truncate text-xs font-medium ${
                    active ? "text-ink-primary" : done ? "text-ink-secondary" : "text-ink-muted"
                  }`}
                >
                  {m.label}
                </span>
              </button>
              {displayIndex < visibleFlow.length - 1 && (
                <span className={`h-px flex-1 ${done ? "bg-confirm/40" : "bg-surface-lifted"}`} />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
