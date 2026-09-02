"use client";

import { useActionState, useState } from "react";
import type { JobProgressState } from "@prisma/client";
import {
  saveJobProgressStateAction,
  type SaveJobProgressStateState,
} from "@/app/(dashboard)/today/progress-actions";
import { PROGRESS_STATE_OPTIONS } from "@/lib/job-progress";

/**
 * §7.8/§14.5/§22/§25 Phase 9 — five plain states, not a percentage, so a
 * crew member can say how a job is going the same way they'd say it out
 * loud. Same collapsible-until-tapped shape as `QualityEvidencePanel`:
 * thumb-sized, minimal typing, nothing money- or customer-facing anywhere
 * near it. Never touches `Job.status`, `QualityCheck`, or the office's own
 * `Job.progressPercent`.
 */
export function ProgressPicker({
  jobId,
  initialState,
}: {
  jobId: string;
  initialState: JobProgressState | null;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<JobProgressState | null>(initialState);
  const [state, formAction] = useActionState<SaveJobProgressStateState, FormData>(
    saveJobProgressStateAction,
    {}
  );

  const currentLabel = PROGRESS_STATE_OPTIONS.find((option) => option.value === initialState)?.label;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-lg border border-hairline px-5 py-4 text-base font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
      >
        {currentLabel ? `Progress — ${currentLabel}` : "How's it going?"}
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-lg border border-hairline p-4">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="progressState" value={selected ?? ""} />
      <p className="text-sm font-medium text-ink-primary">How&rsquo;s it going?</p>

      <fieldset className="grid grid-cols-1 gap-2">
        <legend className="sr-only">How&rsquo;s the job going?</legend>
        {PROGRESS_STATE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSelected(option.value)}
            aria-pressed={selected === option.value}
            className={`rounded-lg border px-4 py-3.5 text-left text-base font-medium transition ${
              selected === option.value
                ? "border-ink-primary bg-action text-on-action"
                : "border-hairline text-ink-primary hover:bg-surface-lifted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </fieldset>

      {state.error ? <p className="text-sm text-danger-fg">{state.error}</p> : null}

      <button
        type="submit"
        disabled={!selected}
        className="w-full rounded-md bg-action px-5 py-4 text-base font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
      >
        {state.savedAt ? "Saved — update again" : "Save"}
      </button>
    </form>
  );
}
