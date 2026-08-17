"use client";

import { useActionState, useRef, useState } from "react";
import type { QuoteDeclineReason } from "@prisma/client";
import { useImperativeAlertDialog } from "@astryxdesign/core/AlertDialog";
import {
  draftQuoteFollowUpAction,
  markQuoteApprovedAction,
  markQuoteDeclinedAction,
  sendQuoteEmailAction,
  shareQuoteAction,
  unshareQuoteAction,
  type DraftFollowUpState,
  type SendEmailState,
} from "@/app/(dashboard)/jobs/[jobId]/quotes/[quoteId]/send-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { QUOTE_DECLINE_REASON_META, quoteDeclineReasonLabel } from "@/lib/quote-status";

/**
 * Getting the quote in front of the homeowner.
 *
 * "Email it to them" only appears once three things are all true: Resend is
 * configured (`emailConfigured`), the client has an email on file, and the
 * link already exists. Absent rather than disabled for the same reason the
 * sidebar drops a whole nav entry for crew instead of greying it out — a
 * button that's there but can't work invites a click that goes nowhere, and a
 * missing button is honest about why. Without a key at all, this panel is
 * exactly what it was before Resend existed: mint the link and hand it over,
 * so it can go out by text today, which is how most of these actually go out.
 */
export function QuoteSharePanel({
  jobId,
  quoteId,
  shareUrl,
  status,
  sentAt,
  viewedAt,
  approvedByHand,
  declineReason,
  declineNote,
  clientEmail,
  emailConfigured,
  aiConfigured,
}: {
  jobId: string;
  quoteId: string;
  shareUrl: string | null;
  status: string;
  sentAt: string | null;
  viewedAt: string | null;
  /** True when somebody here recorded the yes, rather than the client clicking. */
  approvedByHand: boolean;
  /** Set once `markQuoteDeclinedAction` has run — REJECTED always has one. */
  declineReason: QuoteDeclineReason | null;
  declineNote: string | null;
  clientEmail: string | null;
  emailConfigured: boolean;
  aiConfigured: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [declining, setDeclining] = useState(false);
  const confirm = useImperativeAlertDialog();
  const unshareFormRef = useRef<HTMLFormElement>(null);
  const skipUnshareConfirmRef = useRef(false);
  const approveFormRef = useRef<HTMLFormElement>(null);
  const skipApproveConfirmRef = useRef(false);
  const [emailState, emailAction] = useActionState<SendEmailState, FormData>(
    sendQuoteEmailAction,
    {}
  );

  // Item 50. A draft the contractor reads and can edit before it's part of
  // what's sent — `EMAIL_FORM_ID` is how the textarea posts along with a form
  // it isn't nested inside, same `form="…"` idiom the quote-approve extras
  // checkboxes already use for the same reason.
  const [followUpDraft, setFollowUpDraft] = useState<string | null>(null);
  const [followUpDrafting, setFollowUpDrafting] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  async function draftFollowUp() {
    setFollowUpDrafting(true);
    setFollowUpError(null);
    try {
      const result: DraftFollowUpState = await draftQuoteFollowUpAction(jobId, quoteId);
      if ("error" in result) setFollowUpError(result.error);
      else setFollowUpDraft(result.message);
    } catch {
      setFollowUpError("Couldn't draft a follow-up. Try again.");
    } finally {
      setFollowUpDrafting(false);
    }
  }

  async function copy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
      <h3 className="text-lg font-semibold text-ink-primary">Send it to them</h3>

      {/* Shown regardless of whether a link ever existed — plenty of these
          are declined on a call before anyone clicks "Create the link". */}
      {status === "REJECTED" ? (
        <p className="mb-4 mt-1 text-sm text-ink-muted">
          You marked this declined
          {declineReason ? ` — ${quoteDeclineReasonLabel(declineReason).toLowerCase()}` : ""}.
          {declineNote ? ` "${declineNote}"` : ""}
        </p>
      ) : null}

      {!shareUrl ? (
        <>
          <p className="mb-4 mt-1 text-sm text-ink-muted">
            Creates a link only they can open. No sign-up, nothing to install — they tap it and
            read the quote.
          </p>
          <form action={shareQuoteAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="quoteId" value={quoteId} />
            <SubmitButton
              pendingText="Creating…"
              className="rounded-xl bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
            >
              Create the link
            </SubmitButton>
          </form>
        </>
      ) : (
        <>
          <p className="mb-4 mt-1 text-sm text-ink-muted">
            {/* The status line answers the day-three question — "have they even
                looked at it?" — without making anyone go hunting for it. */}
            {status === "APPROVED"
              ? // Two different facts, said as two different sentences. One of
                // them has a name and an IP behind it; the other has your word.
                approvedByHand
                ? "You marked this approved."
                : "They approved it."
              : status === "CHANGES_REQUESTED"
                ? "They asked for a change — check the job's history."
                : viewedAt
                  ? `They opened it ${viewedAt}.`
                  : sentAt
                    ? `Link created ${sentAt}. They haven't opened it yet.`
                    : "Ready to send."}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="The link to send"
              className="min-w-0 flex-1 rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-secondary"
            />
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-xl bg-action px-5 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              {copied ? "Copied" : "Copy link"}
            </button>

            {emailConfigured && clientEmail ? (
              <form id="quote-follow-up-email" action={emailAction} className="shrink-0">
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="quoteId" value={quoteId} />
                <SubmitButton
                  pendingText="Sending…"
                  className="w-full rounded-xl border border-hairline px-5 py-2.5 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
                >
                  {emailState.sentAt ? "Sent" : "Email it to them"}
                </SubmitButton>
              </form>
            ) : null}
          </div>

          {emailConfigured && !clientEmail ? (
            <p className="mt-2 text-xs text-ink-muted">
              Add an email to this client to send the quote that way too.
            </p>
          ) : null}
          {emailState.error ? (
            <p className="mt-2 text-sm text-danger-fg">{emailState.error}</p>
          ) : emailState.sentAt ? (
            <p className="mt-2 text-sm text-ink-secondary">Sent to {clientEmail}.</p>
          ) : null}

          {/* Item 50. Only once a quote has actually gone out before — a
              follow-up to a quote nobody has seen yet isn't a follow-up. The
              textarea posts with the email form above via `form=`, the same
              cross-form idiom the quote-approve extras checkboxes use, since
              it isn't nested inside that form's markup. */}
          {aiConfigured && emailConfigured && clientEmail && sentAt ? (
            <div className="mt-4 border-t border-hairline pt-4">
              {followUpDraft === null ? (
                <button
                  type="button"
                  onClick={draftFollowUp}
                  disabled={followUpDrafting}
                  className="text-sm text-ink-secondary underline underline-offset-4 transition hover:text-ink-primary disabled:opacity-60"
                >
                  {followUpDrafting ? "Drafting…" : "Draft a follow-up with AI"}
                </button>
              ) : (
                <div>
                  <label
                    htmlFor="quote-followup-message"
                    className="mb-1.5 block text-xs font-medium text-ink-secondary"
                  >
                    Follow-up message — edit anything, then press &ldquo;Email it to them&rdquo;
                    above
                  </label>
                  <textarea
                    id="quote-followup-message"
                    form="quote-follow-up-email"
                    name="customMessage"
                    rows={3}
                    defaultValue={followUpDraft}
                    className="w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue"
                  />
                </div>
              )}
              {followUpError ? <p className="mt-2 text-sm text-danger-fg">{followUpError}</p> : null}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-ink-secondary underline underline-offset-4 hover:text-ink-primary"
            >
              See what they see
            </a>

            {/* Only before they answer. Pulling the link out from under a
                homeowner who already approved would break the record of them
                approving it. */}
            {status !== "APPROVED" ? (
              <form
                ref={unshareFormRef}
                action={unshareQuoteAction}
                onSubmit={(event) => {
                  if (skipUnshareConfirmRef.current) {
                    skipUnshareConfirmRef.current = false;
                    return;
                  }
                  event.preventDefault();
                  confirm.show({
                    title: "Turn off the link?",
                    description: "Anyone who has it will stop being able to open the quote.",
                    actionLabel: "Turn off",
                    actionVariant: "destructive",
                    onAction: () => {
                      confirm.hide();
                      skipUnshareConfirmRef.current = true;
                      unshareFormRef.current?.requestSubmit();
                    },
                  });
                }}
              >
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="quoteId" value={quoteId} />
                <SubmitButton
                  pendingText="Turning off…"
                  className="text-sm text-ink-muted underline underline-offset-4 transition hover:text-danger-fg"
                >
                  Turn the link off
                </SubmitButton>
              </form>
            ) : null}
          </div>
        </>
      )}

      {/* Outside both branches on purpose. Most quotes are not approved by
          clicking anything — they are approved in a driveway, or on a call
          three days later, and plenty of them were never sent as a link at
          all. A product that can only record a click leaves a contractor with
          a pipeline full of work that looks ignored. Excludes REJECTED too —
          a declined quote is answered, just the other way, and this button
          must not read as a way to reverse that decision by hand. */}
      {status !== "APPROVED" && status !== "REJECTED" ? (
        <form
          ref={approveFormRef}
          action={markQuoteApprovedAction}
          className="mt-5 border-t border-hairline pt-4"
          onSubmit={(event) => {
            if (skipApproveConfirmRef.current) {
              skipApproveConfirmRef.current = false;
              return;
            }
            event.preventDefault();
            confirm.show({
              title: "Mark this approved?",
              description:
                "Do it once they've actually said yes — it moves the job forward and goes in the record.",
              actionLabel: "Mark approved",
              actionVariant: "primary",
              onAction: () => {
                confirm.hide();
                skipApproveConfirmRef.current = true;
                approveFormRef.current?.requestSubmit();
              },
            });
          }}
        >
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="quoteId" value={quoteId} />
          <SubmitButton
            pendingText="Recording…"
            className="text-sm text-ink-secondary underline underline-offset-4 transition hover:text-ink-primary"
          >
            They said yes on the phone — mark it approved
          </SubmitButton>
        </form>
      ) : null}

      {/* The other answer, same reasoning as approval above — most declines
          also arrive by phone, not by a link. A reason is required (item 42's
          win-rate view groups by it), so this is a small form, not a
          `window.confirm` — there is a fact to collect, not just a click to
          double-check. */}
      {status !== "APPROVED" && status !== "REJECTED" ? (
        <div className="mt-5 border-t border-hairline pt-4">
          {declining ? (
            <form
              action={markQuoteDeclinedAction}
              onSubmit={() => setDeclining(false)}
              className="space-y-3"
            >
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="quoteId" value={quoteId} />
              <div>
                <label
                  htmlFor="decline-reason"
                  className="mb-1.5 block text-xs font-medium text-ink-secondary"
                >
                  Why?
                </label>
                <select
                  id="decline-reason"
                  name="reason"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue"
                >
                  {Object.entries(QUOTE_DECLINE_REASON_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="decline-note"
                  className="mb-1.5 block text-xs font-medium text-ink-secondary"
                >
                  Anything worth remembering (optional)
                </label>
                <textarea
                  id="decline-note"
                  name="note"
                  rows={2}
                  className="w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue"
                />
              </div>
              <div className="flex gap-3">
                <SubmitButton
                  pendingText="Recording…"
                  className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-on-accent transition hover:opacity-90 disabled:opacity-60"
                >
                  Mark it declined
                </SubmitButton>
                <button
                  type="button"
                  onClick={() => setDeclining(false)}
                  className="text-sm text-ink-muted underline underline-offset-4"
                >
                  Never mind
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setDeclining(true)}
              className="text-sm text-ink-secondary underline underline-offset-4 transition hover:text-ink-primary"
            >
              They said no — mark it declined
            </button>
          )}
        </div>
      ) : null}

      {confirm.element}
    </section>
  );
}
