"use client";

import { useActionState, useState } from "react";
import {
  requestReviewAction,
  type RequestReviewState,
} from "@/app/(dashboard)/jobs/[jobId]/status-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

/**
 * Item 48. Absent, not disabled, until a job is `COMPLETED` and the company
 * has set a review link — same "no button for a capability that doesn't
 * exist yet" rule the calendar feed and quote-email panels already follow.
 * `reviewUrl` is a static, company-wide address, so — unlike a quote's share
 * link — there's nothing to mint here; the link is just shown.
 */
export function ReviewRequestPanel({
  jobId,
  reviewUrl,
  reviewRequestedAt,
  clientEmail,
  emailConfigured,
}: {
  jobId: string;
  reviewUrl: string;
  reviewRequestedAt: string | null;
  clientEmail: string | null;
  emailConfigured: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [state, action] = useActionState<RequestReviewState, FormData>(requestReviewAction, {});

  async function copy() {
    await navigator.clipboard.writeText(reviewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-lg border border-hairline bg-surface-raised p-6">
      <h3 className="text-lg font-semibold text-ink-primary">Ask for a review</h3>
      <p className="mt-1 text-sm text-ink-muted">
        {reviewRequestedAt ? `Asked on ${reviewRequestedAt}.` : "The job's done — worth asking."}
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          readOnly
          value={reviewUrl}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="The review link"
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-secondary"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md bg-action px-5 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        >
          {copied ? "Copied" : "Copy link"}
        </button>

        {emailConfigured && clientEmail ? (
          <form action={action} className="shrink-0">
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="channel" value="email" />
            <SubmitButton
              pendingText="Sending…"
              className="w-full rounded-lg border border-hairline px-5 py-2.5 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
            >
              Email it to them
            </SubmitButton>
          </form>
        ) : null}
      </div>

      {emailConfigured && !clientEmail ? (
        <p className="mt-2 text-xs text-ink-muted">
          Add an email to this client to send the review link that way too.
        </p>
      ) : null}

      {state.error ? <p className="mt-2 text-sm text-danger-fg">{state.error}</p> : null}

      {/* Most of these get asked in person or by text, not by clicking a
          button here — same reasoning as a quote's own phone-call approval.
          This just records that it happened. */}
      <form action={action} className="mt-4 border-t border-hairline pt-4">
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="channel" value="link" />
        <SubmitButton
          pendingText="Recording…"
          className="text-sm text-ink-secondary underline underline-offset-4 transition hover:text-ink-primary"
        >
          I asked them another way
        </SubmitButton>
      </form>
    </section>
  );
}
