/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §14.6/§15/§17/§25 Phase 11.
 *
 * A thin read-time join between the static `STATUS_META`/`STATUS_FLOW`
 * (`lib/job-status.ts`, unchanged) and a company's optional
 * `CompanyWorkflowStage` overrides — never a state machine, never a second
 * source of truth for where a job actually is. `JobStatus` itself, and
 * `updateJobStatusAction`, read none of this.
 *
 * Zero Prisma dependency on purpose: callers pass in whatever
 * `CompanyWorkflowStage` rows they already loaded (or none, for a company
 * that's never customized anything), so this stays fully unit-testable
 * without a database. The Prisma-touching half — applying a
 * `WorkflowTemplate` to a company — lives separately, in
 * `lib/workflow-template.ts`.
 */
import { JobStatus } from "@prisma/client";
import { STATUS_FLOW, STATUS_META } from "./job-status.ts";

/** The shape of one override — a `CompanyWorkflowStage` row, minus its id/companyId/timestamps. */
export type StageOverride = {
  jobStatus: JobStatus;
  label: string | null;
  isEnabled: boolean;
};

export type EffectiveStageMeta = {
  status: JobStatus;
  /** The label to actually render — the company's own word, or the default. */
  label: string;
  /** `STATUS_META[status].label`, always — for Settings UI to show what "clear" restores. */
  defaultLabel: string;
  description: string;
  badge: string;
  nextStep: string;
  advanceLabel: string;
  /** False if the company has hidden this stage for future jobs. */
  isEnabled: boolean;
  /**
   * True only when this status is both the job's *current* status and
   * disabled — a distinct fact from `isEnabled`. A job sitting in a
   * disabled stage still shows that stage; this is what tells the caller
   * to render the warning instead of quietly filtering it out. Always
   * false when no `currentStatus` is passed (e.g. rendering Settings,
   * where there's no one specific job in view).
   */
  isCurrentDisabled: boolean;
};

function overrideFor(status: JobStatus, overrides: readonly StageOverride[]): StageOverride | undefined {
  return overrides.find((o) => o.jobStatus === status);
}

export function effectiveStageMeta(
  status: JobStatus,
  overrides: readonly StageOverride[],
  currentStatus?: JobStatus
): EffectiveStageMeta {
  const meta = STATUS_META[status];
  const override = overrideFor(status, overrides);
  const trimmedLabel = override?.label?.trim();
  const isEnabled = override?.isEnabled ?? true;

  return {
    status,
    label: trimmedLabel || meta.label,
    defaultLabel: meta.label,
    description: meta.description,
    badge: meta.badge,
    nextStep: meta.nextStep,
    advanceLabel: meta.advanceLabel,
    isEnabled,
    isCurrentDisabled: currentStatus === status && !isEnabled,
  };
}

/** Every `STATUS_FLOW` stage, joined with the company's overrides, in the fixed underlying order. */
export function effectiveStageFlow(
  overrides: readonly StageOverride[],
  currentStatus?: JobStatus
): EffectiveStageMeta[] {
  return STATUS_FLOW.map((status) => effectiveStageMeta(status, overrides, currentStatus));
}

/**
 * Parses a `WorkflowTemplate.stagesJson` (or any `Json` column shaped the
 * same way) into `StageOverride[]`, dropping anything malformed rather than
 * throwing — this reads a column Prisma types as untyped `Json`, not
 * something the app itself writes by hand.
 */
export function parseStageOverridesJson(value: unknown): StageOverride[] {
  if (!Array.isArray(value)) return [];
  const validStatuses = new Set<string>(STATUS_FLOW);
  const stages: StageOverride[] = [];
  for (const entry of value) {
    if (
      entry &&
      typeof entry === "object" &&
      "jobStatus" in entry &&
      "isEnabled" in entry &&
      typeof (entry as { jobStatus: unknown }).jobStatus === "string" &&
      typeof (entry as { isEnabled: unknown }).isEnabled === "boolean" &&
      validStatuses.has((entry as { jobStatus: string }).jobStatus)
    ) {
      const record = entry as { jobStatus: string; label?: unknown; isEnabled: boolean };
      stages.push({
        jobStatus: record.jobStatus as JobStatus,
        label: typeof record.label === "string" && record.label.trim() ? record.label : null,
        isEnabled: record.isEnabled,
      });
    }
  }
  return stages;
}

/**
 * The next *enabled* stage after `status` in `STATUS_FLOW` order, skipping
 * any the company has disabled — what the stepper's smart advance button
 * should actually target, so it never offers a hidden stage as the normal
 * forward move. Independent of whether `status` itself is enabled: a job
 * currently sitting in a disabled stage still advances to the next active
 * one when the owner is ready to move it (§15) — nothing here decides that
 * automatically, it only answers what "next" means once they click it.
 */
export function nextEnabledStatus(status: JobStatus, overrides: readonly StageOverride[]): JobStatus | null {
  const index = STATUS_FLOW.indexOf(status);
  if (index === -1) return null;
  for (let i = index + 1; i < STATUS_FLOW.length; i++) {
    if (effectiveStageMeta(STATUS_FLOW[i], overrides).isEnabled) return STATUS_FLOW[i];
  }
  return null;
}
