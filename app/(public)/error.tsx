"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Without this, a thrown error on a public document (invoice pay, quote
 * approve, warranty confirm) fell through to `app/global-error.tsx` — a
 * dashboard-styled crash screen with the raw error message, shown to a
 * homeowner who has never seen the app and has no account to sign into.
 * This one stays on paper and never assumes a company/account exists.
 */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="mx-auto max-w-xl rounded-xl border border-paper-rule bg-paper-document p-8 text-center">
        <h1 className="text-xl font-semibold text-paper-ink">Something went wrong</h1>
        <p className="mt-3 text-sm text-paper-ink-muted">
          {error.message || "That didn't go through. Try again, or reach out to whoever sent you this link."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg border border-paper-rule bg-paper-inset px-4 py-2 text-sm font-medium text-paper-ink transition hover:bg-paper-rule"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
