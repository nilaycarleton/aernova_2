"use client";

import { useState } from "react";

/**
 * The link, and the one instruction that matters.
 *
 * There is no Send button, and that is the same decision the quote share panel
 * made: we cannot send a text message, so pretending to would be the worst lie
 * this screen could tell somebody waiting for their new hire to turn up. What
 * it does is the honest half — hand over a URL the boss pastes into whatever he
 * already uses to talk to his crew.
 */
export function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        aria-label="The invite link"
        className="min-w-0 flex-1 rounded-lg border border-hairline bg-ground/50 px-3 py-2 text-xs text-ink-secondary"
      />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="shrink-0 rounded-lg border border-hairline bg-surface-raised px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
