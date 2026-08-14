"use client";

import { useActionState } from "react";
import {
  recordAddOnReviewOverrideAction,
  type RecordOverrideState,
} from "@/app/(dashboard)/jobs/[jobId]/additional-work-actions";
import { AddOnOverrideFields } from "@/components/dashboard/addon-override-fields";
import { SubmitButton } from "@/components/dashboard/submit-button";

/**
 * The fallback, recorded after a review-pending invoice already exists —
 * not approval-free, and not the default: §19.2 is explicit that this is a
 * named exception, used when homeowner contact is missing, the yes already
 * came in some other way, or the owner is intentionally stepping around
 * their own process.
 */
export function AddOnOverrideForm({ jobId, invoiceId }: { jobId: string; invoiceId: string }) {
  const [state, formAction] = useActionState<RecordOverrideState, FormData>(
    recordAddOnReviewOverrideAction,
    {}
  );

  if (state.recordedAt) {
    return (
      <p className="mt-4 text-sm text-ink-secondary">
        Review skipped — this invoice can be sent normally now.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-4 space-y-3 border-t border-hairline pt-4">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <AddOnOverrideFields idPrefix="invoice-override" />
      {state.error ? <p className="text-sm text-danger-fg">{state.error}</p> : null}
      <SubmitButton
        pendingText="Recording…"
        className="rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted disabled:opacity-60"
      >
        Skip homeowner review
      </SubmitButton>
    </form>
  );
}
