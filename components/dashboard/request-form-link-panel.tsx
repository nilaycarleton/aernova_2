"use client";

import { useState } from "react";

/**
 * Item 45's other half: where the link itself lives once someone needs to
 * paste it onto a website or a business card.
 *
 * Simpler than `CalendarFeedPanel` or the quote/invoice/hub share panels —
 * no "create the link" step, because there is nothing to mint. The credential
 * is `Company.slug`, permanent from the day the company signed up, so this
 * is only ever a copy box.
 */
export function RequestFormLinkPanel({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
      <h3 className="text-lg font-semibold text-ink-primary">Your request form</h3>
      <p className="mb-4 mt-1 text-sm text-ink-muted">
        Put this on your website or hand it out — anyone who opens it can ask for work without
        calling. It shows up on <span className="text-ink-secondary">Requests</span>, same as one
        you write down yourself.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Your request form link"
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

      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-block text-sm text-ink-secondary underline underline-offset-4 hover:text-ink-primary"
      >
        See what they see
      </a>
    </section>
  );
}
