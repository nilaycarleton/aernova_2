"use client";

import { useActionState, useState } from "react";
import {
  submitFieldEvidenceAction,
  type SubmitFieldEvidenceState,
} from "@/app/(dashboard)/today/quality-actions";

/**
 * What a crew member checks off before leaving a job nearing completion —
 * site cleaned, photos taken, anything the office should know. §20/§22:
 * thumb-sized, minimal typing, nothing money- or customer-facing anywhere
 * near it. This is evidence, not a decision — it never marks the job
 * complete; only the office's own quality-check panel can do that.
 */
export function QualityEvidencePanel({
  jobId,
  initialSiteCleaned,
  initialPhotosUploaded,
  initialNotes,
  submitted,
}: {
  jobId: string;
  initialSiteCleaned: boolean;
  initialPhotosUploaded: boolean;
  initialNotes: string;
  /** Set once field evidence has already been submitted for this job. */
  submitted: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [siteCleaned, setSiteCleaned] = useState(initialSiteCleaned);
  const [photosUploaded, setPhotosUploaded] = useState(initialPhotosUploaded);
  const [notes, setNotes] = useState(initialNotes);
  const [state, formAction] = useActionState<SubmitFieldEvidenceState, FormData>(
    submitFieldEvidenceAction,
    {}
  );

  if (!open && !state.submittedAt) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-xl border border-hairline px-5 py-4 text-base font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
      >
        {submitted ? "Update quality check evidence" : "Quality check — before you go"}
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-xl border border-hairline p-4">
      <input type="hidden" name="jobId" value={jobId} />
      <p className="text-sm font-medium text-ink-primary">Quality check — before you go</p>

      <label className="flex items-center gap-3 rounded-xl border border-hairline px-4 py-3">
        <input
          type="checkbox"
          name="siteCleaned"
          checked={siteCleaned}
          onChange={(e) => setSiteCleaned(e.target.checked)}
          className="h-5 w-5 shrink-0"
        />
        <span className="text-base text-ink-primary">Site cleaned up</span>
      </label>

      <label className="flex items-center gap-3 rounded-xl border border-hairline px-4 py-3">
        <input
          type="checkbox"
          name="photosUploaded"
          checked={photosUploaded}
          onChange={(e) => setPhotosUploaded(e.target.checked)}
          className="h-5 w-5 shrink-0"
        />
        <span className="text-base text-ink-primary">Photos uploaded</span>
      </label>

      <div>
        <label htmlFor={`qc-notes-${jobId}`} className="sr-only">
          Anything the office should know
        </label>
        <textarea
          id={`qc-notes-${jobId}`}
          name="fieldEvidenceNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything the office should know (optional)"
          className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-sm text-ink-primary outline-none transition focus:border-signal-blue"
        />
      </div>

      {state.error ? <p className="text-sm text-danger-fg">{state.error}</p> : null}

      <button
        type="submit"
        className="w-full rounded-xl bg-action px-5 py-4 text-base font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
      >
        {state.submittedAt ? "Saved — update again" : "Save"}
      </button>
    </form>
  );
}
