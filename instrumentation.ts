import * as Sentry from "@sentry/nextjs";
import { initSentry } from "@/lib/sentry-init";

// Runs once per server instance, before any request is handled (Next 16
// instrumentation contract). Covers both the Node.js and Edge runtimes — the
// Sentry config is identical for each, so there's nothing to branch on.
export function register() {
  initSentry();
}

// Reports errors thrown in Server Components, Route Handlers, and Server
// Actions. Without this, only client-side crashes would reach Sentry.
export const onRequestError = Sentry.captureRequestError;
