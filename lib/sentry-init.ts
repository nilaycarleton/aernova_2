import * as Sentry from "@sentry/nextjs";

/**
 * Resolve the Sentry options from the environment.
 *
 * Split out from `initSentry` so the gating decision is a pure function and can
 * be tested without invoking the SDK. The invariants this encodes:
 *  - No DSN => disabled. The app must build and run fine before Sentry is set up.
 *  - Non-production => disabled. Local `next dev` crashes already surface in the
 *    terminal; reporting them burns the (limited) error quota.
 *  - `tracesSampleRate: 0` — performance tracing draws separate quota. Raise it
 *    once there's real traffic worth profiling.
 */
export function sentryOptions() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  return {
    dsn,
    enabled: Boolean(dsn) && process.env.NODE_ENV === "production",
    tracesSampleRate: 0,
    // Surfaces which deploy an error came from once a release/env is wired.
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    // Keep Sentry's own noise out of the app's logs.
    debug: false,
  };
}

/** Shared Sentry setup for all three runtimes (client, server, edge). */
export function initSentry() {
  Sentry.init(sentryOptions());
}
