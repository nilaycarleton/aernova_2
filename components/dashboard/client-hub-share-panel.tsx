"use client";

import { useRef, useState } from "react";
import { useImperativeAlertDialog } from "@astryxdesign/core/AlertDialog";
import {
  createClientHubLinkAction,
  unshareClientHubLinkAction,
} from "@/app/(dashboard)/clients/[clientId]/hub-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

/**
 * Item 44's Client Hub, from the office side.
 *
 * Same shape as `QuoteSharePanel`'s link section, deliberately smaller: a
 * client hub has no "sent"/"viewed" state of its own to report (nobody
 * answers it — it's a directory, not a document with a decision on it), so
 * this is just mint, copy, preview, and turn off.
 */
export function ClientHubSharePanel({
  clientId,
  shareUrl,
}: {
  clientId: string;
  shareUrl: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const confirm = useImperativeAlertDialog();
  const unshareFormRef = useRef<HTMLFormElement>(null);
  const skipUnshareConfirmRef = useRef(false);

  async function copy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-lg border border-hairline bg-surface-raised p-6">
      <h3 className="text-lg font-semibold text-ink-primary">Client hub</h3>

      {!shareUrl ? (
        <>
          <p className="mb-4 mt-1 text-sm text-ink-muted">
            One link with every quote, invoice, visit, and roof report you&rsquo;ve sent this
            client — across every job. No sign-up, nothing to install.
          </p>
          <form action={createClientHubLinkAction}>
            <input type="hidden" name="clientId" value={clientId} />
            <SubmitButton
              pendingText="Creating…"
              className="rounded-md bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active disabled:opacity-60"
            >
              Create the link
            </SubmitButton>
          </form>
        </>
      ) : (
        <>
          <p className="mb-4 mt-1 text-sm text-ink-muted">
            Only what&rsquo;s already been sent shows up here — a draft quote or invoice stays
            private until you send it.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="The link to send"
              className="min-w-0 flex-1 rounded-lg border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-secondary"
            />
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-md bg-action px-5 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
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

            <form
              ref={unshareFormRef}
              action={unshareClientHubLinkAction}
              onSubmit={(event) => {
                if (skipUnshareConfirmRef.current) {
                  skipUnshareConfirmRef.current = false;
                  return;
                }
                event.preventDefault();
                confirm.show({
                  title: "Turn off the link?",
                  description: "Anyone who has it will stop being able to open it.",
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
              <input type="hidden" name="clientId" value={clientId} />
              <SubmitButton
                pendingText="Turning off…"
                className="text-sm text-ink-muted underline underline-offset-4 transition hover:text-danger-fg"
              >
                Turn the link off
              </SubmitButton>
            </form>
          </div>
        </>
      )}

      {confirm.element}
    </section>
  );
}
