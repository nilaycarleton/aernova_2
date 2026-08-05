"use client";

import { useActionState } from "react";
import {
  saveQuoteAsTemplateAction,
  type TemplateState,
} from "@/app/(dashboard)/jobs/[jobId]/template-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

/**
 * Keep this quote to write the next one with.
 *
 * Its own panel rather than a button in the builder's toolbar, because the
 * builder is one big form and a second action inside it would either nest a
 * form — which HTML forbids — or hijack the Save everyone already knows.
 *
 * It saves what is *stored*, not what is on screen: a roofer who changes a price
 * and hits this without saving first would template the old one. Hence the line
 * under the button, which says so in the only words that matter.
 */
export function QuoteTemplatePanel({
  jobId,
  quoteId,
  defaultName,
  lineCount,
}: {
  jobId: string;
  quoteId: string;
  defaultName: string;
  lineCount: number;
}) {
  const [state, formAction] = useActionState<TemplateState, FormData>(
    saveQuoteAsTemplateAction,
    {}
  );

  return (
    <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
      <h3 className="text-lg font-semibold text-ink-primary">Use this one again</h3>

      {lineCount === 0 ? (
        <p className="mt-1 text-sm text-ink-muted">
          Once this quote has some lines on it, you can keep it as a template and start the
          next one from it.
        </p>
      ) : (
        <>
          <p className="mb-4 mt-1 text-sm text-ink-muted">
            Saves the lines, the wording and the deposit — not the client, the discount or the
            tax. Those belong to this job.
          </p>

          <form action={formAction} className="flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="quoteId" value={quoteId} />
            <label htmlFor="template-name" className="sr-only">
              What to call this template
            </label>
            <input
              id="template-name"
              name="name"
              type="text"
              defaultValue={defaultName}
              placeholder="Full re-roof — architectural asphalt"
              className="min-w-0 flex-1 rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue"
            />
            <SubmitButton
              pendingText="Saving…"
              className="shrink-0 rounded-xl border border-hairline bg-surface-raised px-5 py-2.5 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted disabled:opacity-60"
            >
              Save as a template
            </SubmitButton>
          </form>

          <p aria-live="polite" className="mt-3 min-h-5 text-sm">
            {state.error ? (
              <span className="text-danger-fg">{state.error}</span>
            ) : state.savedName ? (
              <span className="text-ink-secondary">
                Saved as &ldquo;{state.savedName}&rdquo;. It&rsquo;ll be offered next time you
                start a quote.
              </span>
            ) : (
              /* Said before they press it, not after. */
              <span className="text-ink-muted">Saves the quote as it was last saved.</span>
            )}
          </p>
        </>
      )}
    </section>
  );
}
