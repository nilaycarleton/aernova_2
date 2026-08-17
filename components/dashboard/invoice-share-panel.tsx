"use client";

import { useActionState, useRef, useState } from "react";
import { useImperativeAlertDialog } from "@astryxdesign/core/AlertDialog";
import {
  sendInvoiceEmailAction,
  shareInvoiceAction,
  unshareInvoiceAction,
  type SendInvoiceState,
} from "@/app/(dashboard)/jobs/[jobId]/invoices/[invoiceId]/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

/**
 * Getting the invoice in front of the homeowner.
 *
 * Deliberately the same shape as `QuoteSharePanel`, down to the two doors onto
 * one token and the "email only when it can actually work" rule: a contractor
 * who has learned how to send a quote has learned how to send a bill, and two
 * panels that do the same job differently is a thing to relearn for no reason.
 *
 * What is different is the last line. A quote's panel offers "they said yes on
 * the phone"; this one says nothing of the sort, because the equivalent — money
 * arrived — is not a footnote under a share link. It is the panel below.
 */
export function InvoiceSharePanel({
  jobId,
  invoiceId,
  shareUrl,
  status,
  sentAt,
  viewedAt,
  clientEmail,
  emailConfigured,
  hasPayments,
}: {
  jobId: string;
  invoiceId: string;
  shareUrl: string | null;
  status: string;
  sentAt: string | null;
  viewedAt: string | null;
  clientEmail: string | null;
  emailConfigured: boolean;
  /** Money has come in. The link stops being revocable. */
  hasPayments: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const confirm = useImperativeAlertDialog();
  const unshareFormRef = useRef<HTMLFormElement>(null);
  const skipUnshareConfirmRef = useRef(false);
  const [emailState, emailAction] = useActionState<SendInvoiceState, FormData>(
    sendInvoiceEmailAction,
    {}
  );

  async function copy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "VOID") {
    return (
      <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <h3 className="text-lg font-semibold text-ink-primary">This invoice was cancelled</h3>
        <p className="mt-1 text-sm text-ink-muted">
          It stays on the record so your numbering has no holes in it. Raise a new one to bill
          for the work.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
      <h3 className="text-lg font-semibold text-ink-primary">Send it to them</h3>

      {!shareUrl ? (
        <>
          <p className="mb-4 mt-1 text-sm text-ink-muted">
            Creates a link only they can open. No sign-up, nothing to install — they tap it and
            see what they owe.
          </p>
          <form action={shareInvoiceAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="invoiceId" value={invoiceId} />
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
            {status === "PAID"
              ? "Paid in full. Nothing to chase."
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
              <form action={emailAction} className="shrink-0">
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="invoiceId" value={invoiceId} />
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
              Add an email to this client to send the invoice that way too.
            </p>
          ) : null}
          {emailState.error ? (
            <p className="mt-2 text-sm text-danger-fg">{emailState.error}</p>
          ) : emailState.sentAt ? (
            <p className="mt-2 text-sm text-ink-secondary">Sent to {clientEmail}.</p>
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

            {/* Only while nothing has been paid. Pulling the link out from
                under a homeowner who has already sent money — and may be about
                to send the rest — is how a part-paid invoice becomes a phone
                call about a broken link. */}
            {!hasPayments ? (
              <form
                ref={unshareFormRef}
                action={unshareInvoiceAction}
                onSubmit={(event) => {
                  if (skipUnshareConfirmRef.current) {
                    skipUnshareConfirmRef.current = false;
                    return;
                  }
                  event.preventDefault();
                  confirm.show({
                    title: "Turn off the link?",
                    description: "Anyone who has it will stop being able to open the invoice.",
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
                <input type="hidden" name="invoiceId" value={invoiceId} />
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

      {confirm.element}
    </section>
  );
}
