"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side render errors in this segment never reach instrumentation's
    // onRequestError, so report them here. Server-rendered errors arrive via
    // both paths; Sentry dedupes them by digest.
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-hairline bg-surface-raised p-8 text-center">
      <h2 className="text-xl font-semibold text-ink-primary">Something went wrong</h2>
      <p className="mt-3 text-sm text-ink-muted">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-ink-muted">Reference: {error.digest}</p>
      )}
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl border border-hairline bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/30"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="rounded-xl border border-hairline bg-surface-raised px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
