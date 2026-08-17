"use client";

import { useState } from "react";
import {
  approveQuoteAction,
  requestChangesAction,
} from "@/app/(public)/q/[token]/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { useQuoteDecision } from "@/components/public/quote-decision";
import { formatMoney } from "@/lib/money";

/**
 * The id the extras checkboxes point at with their `form` attribute, so a tick
 * made in the document posts with the approval made in this rail — including
 * with JavaScript switched off.
 */
export const APPROVE_FORM_ID = "quote-approve";

/**
 * The homeowner's answer.
 *
 * In its own rail beside the document, not underneath it, because the decision
 * should be reachable without reading to the end — some people approve on the
 * number alone, and making them scroll past two pages of warranty text to find
 * the button is a way of losing the yes.
 *
 * Approve asks for a name and nothing else. Not an account, not an email, not a
 * password: this person will use this page once. The name is what makes the
 * approval evidence rather than an anonymous click.
 */
export function QuoteResponse({
  token,
  status,
  clientName,
}: {
  token: string;
  status: string;
  clientName: string;
}) {
  const [asking, setAsking] = useState(false);
  const { totals, selected } = useQuoteDecision();

  const totalLabel = formatMoney(totals.totalCents);
  const depositLabel = totals.depositCents > 0 ? formatMoney(totals.depositCents) : null;

  if (status === "APPROVED") {
    return (
      <aside className="rounded-2xl border border-paper-rule bg-paper-inset p-6 lg:sticky lg:top-8">
        <p className="font-semibold text-paper-ink">Thanks — that&rsquo;s approved.</p>
        <p className="mt-2 text-sm leading-6 text-paper-ink-muted">
          {depositLabel
            ? `We'll be in touch to arrange the ${depositLabel} deposit and book you in.`
            : "We'll be in touch to book you in."}
        </p>
      </aside>
    );
  }

  if (status === "CHANGES_REQUESTED") {
    return (
      <aside className="rounded-2xl border border-paper-rule bg-paper-inset p-6 lg:sticky lg:top-8">
        <p className="font-semibold text-paper-ink">We got your note.</p>
        <p className="mt-2 text-sm leading-6 text-paper-ink-muted">
          We&rsquo;ll have another look and send you an updated quote.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-2xl border border-paper-rule bg-paper-inset p-6 lg:sticky lg:top-8">
      <p className="text-sm text-paper-ink-muted">Your price</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-paper-ink">{totalLabel}</p>
      {totals.acceptedOptionalCents > 0 ? (
        <p className="mt-1 text-sm text-paper-ink-muted">
          Including the {selected.size === 1 ? "extra" : `${selected.size} extras`} you ticked.
        </p>
      ) : null}
      {depositLabel ? (
        <p className="mt-2 text-sm leading-6 text-paper-ink-muted">
          {depositLabel} up front to get started.
        </p>
      ) : null}

      {asking ? (
        <form action={requestChangesAction} className="mt-6 print:hidden">
          <input type="hidden" name="token" value={token} />
          <label
            htmlFor="change-message"
            className="block text-sm font-medium text-paper-ink-strong"
          >
            What would you like changed?
          </label>
          <textarea
            id="change-message"
            name="message"
            rows={4}
            required
            placeholder="Anything at all — a different shingle, leaving the gutters, a question about the price."
            className="mt-2 w-full rounded-xl border border-paper-rule-strong bg-paper-document px-3 py-2.5 text-sm text-paper-ink outline-none transition placeholder:text-paper-ink-faint focus:border-signal-blue"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <SubmitButton
              pendingText="Sending…"
              className="rounded-xl bg-paper-ink px-4 py-2.5 text-sm font-semibold text-paper-document transition hover:bg-paper-ink-strong disabled:opacity-60"
            >
              Send it
            </SubmitButton>
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="rounded-xl border border-paper-rule-strong px-4 py-2.5 text-sm font-medium text-paper-ink-body transition hover:bg-paper"
            >
              Never mind
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-6 space-y-3 print:hidden">
          <form id={APPROVE_FORM_ID} action={approveQuoteAction}>
            <input type="hidden" name="token" value={token} />
            <label htmlFor="approver-name" className="block text-sm font-medium text-paper-ink-strong">
              Your name
            </label>
            <input
              id="approver-name"
              name="name"
              type="text"
              required
              defaultValue={clientName}
              autoComplete="name"
              className="mt-2 w-full rounded-xl border border-paper-rule-strong bg-paper-document px-3 py-2.5 text-sm text-paper-ink outline-none transition focus:border-signal-blue"
            />
            <SubmitButton
              pendingText="Approving…"
              className="mt-3 w-full rounded-xl bg-confirm px-4 py-3 text-sm font-semibold text-on-accent transition hover:opacity-90 disabled:opacity-60"
            >
              Approve this quote
            </SubmitButton>
            {/* Said before they click, not after. Approving is the moment a
                homeowner commits money, and a page that explains the
                consequence afterwards has explained it too late. */}
            <p className="mt-2 text-xs leading-5 text-paper-ink-faint">
              This tells us to go ahead and book the work in.
            </p>
          </form>

          <button
            type="button"
            onClick={() => setAsking(true)}
            className="w-full rounded-xl border border-paper-rule-strong px-4 py-3 text-sm font-medium text-paper-ink-body transition hover:bg-paper"
          >
            Ask for a change
          </button>
        </div>
      )}
    </aside>
  );
}
