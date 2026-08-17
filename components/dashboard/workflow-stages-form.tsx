"use client";

import { useActionState } from "react";
import type { JobStatus } from "@prisma/client";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { saveWorkflowStagesAction, type SaveWorkflowState } from "@/app/(dashboard)/settings/workflow/actions";

export type WorkflowStageRow = {
  status: JobStatus;
  defaultLabel: string;
  /** The company's own label, or "" if it's never been customized. */
  currentLabel: string;
  isEnabled: boolean;
};

const inputClass =
  "w-full rounded-md border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue";

/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §14.6/§15/§25 Phase 11 — every backend
 * `JobStatus` in fixed `STATUS_FLOW` order (no drag-and-drop; `sortOrder`
 * stays whatever the flow position already is). "Hide" rather than
 * "disable" or "delete" in the visible copy — deliberately, since the
 * actual action is show/hide, not a deletion of anything, and a job
 * already in a hidden stage is never affected (the page header says as
 * much once, so each row doesn't have to repeat it).
 */
export function WorkflowStagesForm({ stages }: { stages: WorkflowStageRow[] }) {
  const [state, formAction] = useActionState<SaveWorkflowState, FormData>(saveWorkflowStagesAction, {});

  return (
    <form action={formAction} className="rounded-lg border border-hairline bg-surface-raised p-6">
      <ul className="divide-y divide-hairline">
        {stages.map((stage) => (
          <li key={stage.status} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name={`enabled:${stage.status}`}
                defaultChecked={stage.isEnabled}
                className="h-4 w-4 shrink-0"
              />
              <span className="text-xs font-medium text-ink-muted">Shown</span>
            </label>

            <div className="min-w-0 flex-1">
              <input
                type="text"
                name={`label:${stage.status}`}
                defaultValue={stage.currentLabel}
                placeholder={stage.defaultLabel}
                aria-label={`Label for ${stage.defaultLabel}`}
                className={inputClass}
              />
            </div>
          </li>
        ))}
      </ul>

      {state.error ? <p className="mt-3 text-sm text-danger-fg">{state.error}</p> : null}

      <div className="mt-5 flex items-center gap-3">
        <SubmitButton
          pendingText="Saving…"
          className="rounded-md bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
        >
          {state.savedAt ? "Saved" : "Save changes"}
        </SubmitButton>
        <p className="text-xs text-ink-muted">
          Leave a name blank to use the default. Hiding a stage only affects new choices going
          forward.
        </p>
      </div>
    </form>
  );
}
