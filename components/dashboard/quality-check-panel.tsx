"use client";

import { useActionState } from "react";
import {
  saveQualityCheckAction,
  type SaveQualityCheckState,
} from "@/app/(dashboard)/jobs/[jobId]/quality-check-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

export type QualityCheckData = {
  siteCleaned: boolean;
  photosUploaded: boolean;
  fieldEvidenceNotes: string | null;
  fieldEvidenceSubmittedAt: string | null;
  fieldEvidenceSubmittedByName: string | null;
  scopeCompleted: boolean;
  deficienciesResolved: boolean;
  walkthroughCompleted: boolean;
  walkthroughNotes: string | null;
  completedAt: string | null;
};

/**
 * §14.3/§20 — two authors, two halves of one screen. The top half is what
 * crew already submitted from `/today`, read-only here: office can see it,
 * but only office writes ever touch it. The bottom half is the office's own
 * call, and it — not the evidence above — is what
 * `updateJobStatusAction`'s completion gate actually reads (see
 * `lib/quality-check.ts`). `editable` is false for anyone without
 * `completeQualityCheck`, same "render nothing they can't act on" doctrine
 * `JobExpensesPanel` already follows for `manageJobCosts`.
 */
export function QualityCheckPanel({
  jobId,
  data,
  editable,
}: {
  jobId: string;
  data: QualityCheckData | null;
  editable: boolean;
}) {
  const [state, formAction] = useActionState<SaveQualityCheckState, FormData>(
    saveQualityCheckAction,
    {}
  );

  const complete = Boolean(data?.completedAt);

  return (
    <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink-primary">Quality check</h3>
        {complete ? (
          <span className="shrink-0 rounded-full bg-confirm/10 px-3 py-1 text-xs font-medium text-confirm-fg">
            Completed {data?.completedAt}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          What crew reported
        </p>
        {data?.fieldEvidenceSubmittedAt ? (
          <div className="mt-2 space-y-2 rounded-xl bg-ground/40 px-4 py-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className={data.siteCleaned ? "text-confirm-fg" : "text-ink-muted"}>
                {data.siteCleaned ? "✓" : "—"} Site cleaned
              </span>
              <span className={data.photosUploaded ? "text-confirm-fg" : "text-ink-muted"}>
                {data.photosUploaded ? "✓" : "—"} Photos uploaded
              </span>
            </div>
            {data.fieldEvidenceNotes ? (
              <p className="whitespace-pre-line text-sm leading-6 text-ink-secondary">
                {data.fieldEvidenceNotes}
              </p>
            ) : null}
            <p className="text-xs text-ink-muted">
              Submitted {data.fieldEvidenceSubmittedAt}
              {data.fieldEvidenceSubmittedByName ? ` by ${data.fieldEvidenceSubmittedByName}` : ""}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">Nothing submitted from the field yet.</p>
        )}
      </div>

      <div className="mt-5 border-t border-hairline pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Office review</p>

        {editable ? (
          <form action={formAction} className="mt-3 space-y-3">
            <input type="hidden" name="jobId" value={jobId} />

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="scopeCompleted"
                defaultChecked={data?.scopeCompleted ?? false}
                className="h-5 w-5 shrink-0"
              />
              <span className="text-sm text-ink-primary">Scope of work is done</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="deficienciesResolved"
                defaultChecked={data?.deficienciesResolved ?? false}
                className="h-5 w-5 shrink-0"
              />
              <span className="text-sm text-ink-primary">Deficiencies resolved</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="walkthroughCompleted"
                defaultChecked={data?.walkthroughCompleted ?? false}
                className="h-5 w-5 shrink-0"
              />
              <span className="text-sm text-ink-primary">Final walkthrough completed</span>
            </label>

            <div>
              <label
                htmlFor={`walkthrough-notes-${jobId}`}
                className="mb-1.5 block text-xs font-medium text-ink-secondary"
              >
                Walkthrough notes (optional)
              </label>
              <textarea
                id={`walkthrough-notes-${jobId}`}
                name="walkthroughNotes"
                rows={2}
                defaultValue={data?.walkthroughNotes ?? ""}
                className="w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue"
              />
            </div>

            {state.error ? <p className="text-sm text-danger-fg">{state.error}</p> : null}

            <SubmitButton
              pendingText="Saving…"
              className="rounded-xl bg-action px-5 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
            >
              {state.savedAt ? "Saved" : "Save"}
            </SubmitButton>
            {!complete ? (
              <p className="text-xs text-ink-muted">
                All three, checked and saved, is what unlocks &ldquo;Mark completed&rdquo; above.
              </p>
            ) : null}
          </form>
        ) : (
          <div className="mt-2 space-y-1 text-sm text-ink-secondary">
            <p>{data?.scopeCompleted ? "✓" : "—"} Scope of work is done</p>
            <p>{data?.deficienciesResolved ? "✓" : "—"} Deficiencies resolved</p>
            <p>{data?.walkthroughCompleted ? "✓" : "—"} Final walkthrough completed</p>
          </div>
        )}
      </div>
    </section>
  );
}
