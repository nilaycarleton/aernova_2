"use client";

import { useState } from "react";
import {
  markChangeOrderApprovedAction,
  markChangeOrderDeclinedAction,
  shareChangeOrderAction,
  unshareChangeOrderAction,
} from "@/app/(dashboard)/jobs/[jobId]/change-orders/[changeOrderId]/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

/**
 * Getting the change order in front of the homeowner — same shape as
 * `QuoteSharePanel`, minus the email/AI-follow-up doors this smaller
 * document doesn't need yet.
 */
export function ChangeOrderSharePanel({
  jobId,
  changeOrderId,
  shareUrl,
  status,
  sentAt,
  viewedAt,
}: {
  jobId: string;
  changeOrderId: string;
  shareUrl: string | null;
  status: string;
  sentAt: string | null;
  viewedAt: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mt-6 rounded-3xl border border-hairline bg-surface-raised p-6">
      <h3 className="text-lg font-semibold text-ink-primary">Send it to them</h3>

      {status === "DECLINED" ? (
        <p className="mb-4 mt-1 text-sm text-ink-muted">You marked this declined.</p>
      ) : null}

      {!shareUrl ? (
        <form action={shareChangeOrderAction} className="mt-3">
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="changeOrderId" value={changeOrderId} />
          <SubmitButton
            pendingText="Creating…"
            className="rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary disabled:opacity-60"
          >
            Create the link
          </SubmitButton>
        </form>
      ) : (
        <>
          <p className="mb-4 mt-1 text-sm text-ink-muted">
            {status === "APPROVED"
              ? "They approved it."
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
              className="shrink-0 rounded-xl bg-ink-primary px-5 py-2.5 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-ink-secondary underline underline-offset-4 hover:text-ink-primary"
            >
              See what they see
            </a>
            {status !== "APPROVED" ? (
              <form
                action={unshareChangeOrderAction}
                onSubmit={(event) => {
                  if (!window.confirm("Turn off the link? Anyone who has it will stop being able to open it.")) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="changeOrderId" value={changeOrderId} />
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

      {/* Most of these are answered by phone, not by a click — same reasoning
          `QuoteSharePanel` gives for its own office-recorded approve/decline. */}
      {status !== "APPROVED" && status !== "DECLINED" ? (
        <form
          action={markChangeOrderApprovedAction}
          className="mt-5 border-t border-hairline pt-4"
          onSubmit={(event) => {
            if (
              !window.confirm(
                "Mark this approved? Do it once they've actually said yes — it adds to the contract value and goes in the record."
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="changeOrderId" value={changeOrderId} />
          <SubmitButton
            pendingText="Recording…"
            className="text-sm text-ink-secondary underline underline-offset-4 transition hover:text-ink-primary"
          >
            They said yes on the phone — mark it approved
          </SubmitButton>
        </form>
      ) : null}

      {status !== "APPROVED" && status !== "DECLINED" ? (
        <form
          action={markChangeOrderDeclinedAction}
          className="mt-3"
          onSubmit={(event) => {
            if (!window.confirm("Mark this declined?")) event.preventDefault();
          }}
        >
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="changeOrderId" value={changeOrderId} />
          <SubmitButton
            pendingText="Recording…"
            className="text-sm text-ink-muted underline underline-offset-4 transition hover:text-danger-fg"
          >
            They said no — mark it declined
          </SubmitButton>
        </form>
      ) : null}
    </section>
  );
}
