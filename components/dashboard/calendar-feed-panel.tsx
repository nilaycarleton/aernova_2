"use client";

import { useRef, useState } from "react";
import { useImperativeAlertDialog } from "@astryxdesign/core/AlertDialog";
import {
  createCalendarFeedAction,
  revokeCalendarFeedAction,
} from "@/app/(dashboard)/schedule/feed-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

/**
 * Put the schedule on the phone you already use.
 *
 * Not an integration, and the copy says so. There is no Google account to
 * connect and no permission to grant — you copy a link and paste it into
 * whatever calendar you already have. That is the whole feature, and it is why
 * it works identically in Google, Apple, Outlook and Thunderbird.
 *
 * Two things are said out loud because getting them wrong costs somebody a
 * morning: it only goes **one way**, and it is **not instant**.
 */
export function CalendarFeedPanel({ feedUrl }: { feedUrl: string | null }) {
  const [copied, setCopied] = useState(false);
  const confirm = useImperativeAlertDialog();
  const revokeFormRef = useRef<HTMLFormElement>(null);
  const skipRevokeConfirmRef = useRef(false);

  async function copy() {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-lg border border-hairline bg-surface-raised p-6">
      <h3 className="text-lg font-semibold text-ink-primary">
        See this in your own calendar
      </h3>

      {!feedUrl ? (
        <>
          <p className="mb-4 mt-1 max-w-2xl text-sm text-ink-muted">
            Makes a link you paste into Google, Apple, Outlook — whichever calendar
            you already use. Your jobs then show up beside everything else in your
            week, on your phone, without opening Aernova.
          </p>
          <form action={createCalendarFeedAction}>
            <SubmitButton
              pendingText="Making the link…"
              className="rounded-md bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active disabled:opacity-60"
            >
              Make the link
            </SubmitButton>
          </form>
        </>
      ) : (
        <>
          <p className="mb-4 mt-1 max-w-2xl text-sm text-ink-muted">
            In your calendar app, look for <em>Subscribe to calendar</em> or{" "}
            <em>Add by URL</em>, and paste this in.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              readOnly
              value={feedUrl}
              onFocus={(event) => event.currentTarget.select()}
              aria-label="Your calendar link"
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

          {/* Said before it matters, not after somebody has driven to the wrong
              address. Both facts are consequences of it being a subscription
              rather than an integration, and neither is ours to change. */}
          <ul className="mt-4 space-y-1.5 text-sm text-ink-muted">
            <li>
              It only goes one way. Your jobs appear in your calendar; nothing you
              put in your calendar comes back here.
            </li>
            <li>
              It isn&rsquo;t instant. Apple checks every few minutes, Google roughly
              twice a day. Aernova is always the one that&rsquo;s right.
            </li>
            <li>Anyone with this link can see your schedule. Send it like a password.</li>
          </ul>

          <form
            ref={revokeFormRef}
            action={revokeCalendarFeedAction}
            className="mt-4"
            onSubmit={(event) => {
              if (skipRevokeConfirmRef.current) {
                skipRevokeConfirmRef.current = false;
                return;
              }
              event.preventDefault();
              confirm.show({
                title: "Turn the link off?",
                description:
                  "Every calendar it was added to stops updating, including your own phone.",
                actionLabel: "Turn off",
                actionVariant: "destructive",
                onAction: () => {
                  confirm.hide();
                  skipRevokeConfirmRef.current = true;
                  revokeFormRef.current?.requestSubmit();
                },
              });
            }}
          >
            <SubmitButton
              pendingText="Turning off…"
              className="text-sm text-ink-muted underline underline-offset-4 transition hover:text-danger-fg"
            >
              Turn the link off
            </SubmitButton>
          </form>
        </>
      )}

      {confirm.element}
    </section>
  );
}
