"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Catches errors thrown in the root layout itself. Must render its own
// <html>/<body> because it replaces the root layout when it fires.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // React render crashes never reach instrumentation's onRequestError, so this
  // boundary is the only place they can be reported from.
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="mt-3 text-sm text-slate-400">
              {error.message || "An unexpected error occurred."}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 rounded-xl border border-white/10 bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/30"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
