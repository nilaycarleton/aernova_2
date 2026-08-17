"use client";

import { useActionState, useState } from "react";
import {
  saveJobProgressPercentAction,
  type SaveJobProgressPercentState,
} from "@/app/(dashboard)/jobs/[jobId]/progress-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import type { JobProgressDisplay } from "@/lib/job-progress";

/**
 * §7.8/§14.5/§25 Phase 9 — a read/review signal beside the visit panel, not
 * a requirement: the display always resolves to something calm (a
 * percentage, the crew's own words, a visit count, or "No progress
 * reported yet"), and nothing here blocks any other action on the job.
 * `editable` is the office's own precision override — `progressPercent` —
 * kept independent of the crew's `progressState`, which always stays
 * visible in `display.secondaryDescription`/`crewStateLabel` regardless of
 * which signal is primary.
 */
export function JobProgressPanel({
  jobId,
  display,
  officePercent,
  editable,
}: {
  jobId: string;
  display: JobProgressDisplay;
  officePercent: number | null;
  editable: boolean;
}) {
  const [state, formAction] = useActionState<SaveJobProgressPercentState, FormData>(
    saveJobProgressPercentAction,
    {}
  );
  const [value, setValue] = useState(officePercent != null ? String(officePercent) : "");

  return (
    <section className="rounded-lg border border-hairline bg-surface-raised p-6">
      <h3 className="text-lg font-semibold text-ink-primary">Progress</h3>
      <p className="mt-2 text-2xl font-semibold text-ink-primary">{display.primaryLabel}</p>
      <p className="mt-1 text-sm text-ink-muted">{display.secondaryDescription}</p>

      {display.percent != null ? (
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-ground/70">
          <div
            className="h-full rounded-full bg-instrument"
            style={{ width: `${Math.max(display.percent, 4)}%` }}
          />
        </div>
      ) : null}

      {editable ? (
        <form
          action={formAction}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-hairline pt-4"
        >
          <input type="hidden" name="jobId" value={jobId} />
          <div>
            <label
              htmlFor={`progress-percent-${jobId}`}
              className="mb-1.5 block text-xs font-medium text-ink-secondary"
            >
              Set an exact percentage (optional)
            </label>
            <input
              id={`progress-percent-${jobId}`}
              name="progressPercent"
              type="number"
              inputMode="numeric"
              step={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0-100"
              className="w-28 rounded-md border border-hairline bg-ground/50 px-3 py-2.5 text-sm tabular-nums text-ink-primary outline-none transition focus:border-signal-blue"
            />
          </div>
          <SubmitButton
            pendingText="Saving…"
            className="rounded-md bg-action px-5 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
          >
            {state.savedAt ? "Saved" : "Save"}
          </SubmitButton>
          <p className="w-full text-xs text-ink-muted">
            Leave it blank and save to clear it — the crew&rsquo;s own report or the visit count
            takes over again.
          </p>
        </form>
      ) : null}

      {state.error ? <p className="mt-2 text-sm text-danger-fg">{state.error}</p> : null}
    </section>
  );
}
