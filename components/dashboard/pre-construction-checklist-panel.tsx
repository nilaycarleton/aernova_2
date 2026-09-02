"use client";

import { useActionState } from "react";
import {
  savePreConstructionChecklistAction,
  type SavePreConstructionChecklistState,
} from "@/app/(dashboard)/jobs/[jobId]/pre-construction-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { preConstructionGateMessage, type PreConstructionGap } from "@/lib/pre-construction";

export type PreConstructionChecklistData = {
  materialsConfirmed: boolean;
  materialsNotes: string | null;
  permitsChecked: boolean;
  permitRequired: boolean | null;
  permitNotes: string | null;
  crewReady: boolean;
  startDateConfirmed: boolean;
  readinessNotes: string | null;
  confirmedAt: string | null;
};

/**
 * §7.6/§25 Phase 4 — office-facing only, never rendered on `/today`. Sits
 * between contract approval and scheduling: reviews what's confirmed, lets
 * office check off the rest, and names what's left in plain language. Warning
 * only — see `lib/pre-construction.ts` — so there's no "override" control
 * here, just a calm read of what's done.
 */
export function PreConstructionChecklistPanel({
  jobId,
  data,
  gaps,
  editable,
}: {
  jobId: string;
  data: PreConstructionChecklistData | null;
  gaps: PreConstructionGap[];
  editable: boolean;
}) {
  const [state, formAction] = useActionState<SavePreConstructionChecklistState, FormData>(
    savePreConstructionChecklistAction,
    {}
  );

  const confirmed = Boolean(data?.confirmedAt);
  const permitRequiredValue =
    data?.permitRequired === true ? "yes" : data?.permitRequired === false ? "no" : "";

  return (
    <section className="rounded-lg border border-hairline bg-surface-raised p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink-primary">Pre-construction checklist</h3>
        {confirmed ? (
          <span className="shrink-0 rounded-full bg-confirm/10 px-3 py-1 text-xs font-medium text-confirm-fg">
            Confirmed {data?.confirmedAt}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Review before this job goes on the schedule — materials, permits, crew, and a start date.
      </p>

      {gaps.length > 0 ? (
        <p className="mt-3 rounded-lg bg-ground/50 px-4 py-2.5 text-sm text-ink-secondary">
          {preConstructionGateMessage(gaps)}
        </p>
      ) : (
        <p className="mt-3 rounded-lg bg-confirm/10 px-4 py-2.5 text-sm text-confirm-fg">
          Everything here is confirmed. This job is ready to schedule.
        </p>
      )}

      {editable ? (
        <form action={formAction} className="mt-5 space-y-4 border-t border-hairline pt-5">
          <input type="hidden" name="jobId" value={jobId} />

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="materialsConfirmed"
                defaultChecked={data?.materialsConfirmed ?? false}
                className="h-5 w-5 shrink-0"
              />
              <span className="text-sm text-ink-primary">Materials confirmed, or not needed</span>
            </label>
            <textarea
              name="materialsNotes"
              rows={2}
              defaultValue={data?.materialsNotes ?? ""}
              placeholder="Notes (optional) — e.g. supplier, delivery date"
              className="mt-2 w-full rounded-md border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue"
            />
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="permitsChecked"
                defaultChecked={data?.permitsChecked ?? false}
                className="h-5 w-5 shrink-0"
              />
              <span className="text-sm text-ink-primary">Permit requirements checked</span>
            </label>
            <fieldset className="mt-2 flex flex-wrap gap-4 pl-8 text-sm text-ink-secondary">
              <legend className="sr-only">Is a permit required for this job?</legend>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="permitRequired"
                  value="yes"
                  defaultChecked={permitRequiredValue === "yes"}
                  className="h-4 w-4"
                />
                A permit is required
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="permitRequired"
                  value="no"
                  defaultChecked={permitRequiredValue === "no"}
                  className="h-4 w-4"
                />
                No permit needed
              </label>
            </fieldset>
            <textarea
              name="permitNotes"
              rows={2}
              defaultValue={data?.permitNotes ?? ""}
              placeholder="Notes (optional) — e.g. permit number, applied-for date"
              className="mt-2 w-full rounded-md border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="crewReady"
              defaultChecked={data?.crewReady ?? false}
              className="h-5 w-5 shrink-0"
            />
            <span className="text-sm text-ink-primary">Crew is ready for this job</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="startDateConfirmed"
              defaultChecked={data?.startDateConfirmed ?? false}
              className="h-5 w-5 shrink-0"
            />
            <span className="text-sm text-ink-primary">Start date confirmed with the client</span>
          </label>

          <div>
            <label
              htmlFor={`pre-construction-notes-${jobId}`}
              className="mb-1.5 block text-xs font-medium text-ink-secondary"
            >
              General readiness notes (optional)
            </label>
            <textarea
              id={`pre-construction-notes-${jobId}`}
              name="readinessNotes"
              rows={2}
              defaultValue={data?.readinessNotes ?? ""}
              className="w-full rounded-md border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue"
            />
          </div>

          {state.error ? <p className="text-sm text-danger-fg">{state.error}</p> : null}

          <SubmitButton
            pendingText="Saving…"
            className="rounded-md bg-action px-5 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
          >
            {state.savedAt ? "Saved" : "Save"}
          </SubmitButton>
        </form>
      ) : (
        <div className="mt-5 space-y-1 border-t border-hairline pt-5 text-sm text-ink-secondary">
          <p>{data?.materialsConfirmed ? "✓" : "—"} Materials confirmed, or not needed</p>
          <p>{data?.permitsChecked ? "✓" : "—"} Permit requirements checked</p>
          <p>{data?.crewReady ? "✓" : "—"} Crew is ready</p>
          <p>{data?.startDateConfirmed ? "✓" : "—"} Start date confirmed</p>
        </div>
      )}
    </section>
  );
}
