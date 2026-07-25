import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

// Source maps upload only when a Sentry auth token + org/project are present,
// so builds without Sentry configured (local, CI, preview) succeed unchanged
// instead of failing on a missing token.
const hasSentryUpload = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Keep build output quiet unless we're actually uploading.
  silent: !hasSentryUpload,
  sourcemaps: { disable: !hasSentryUpload },
  // The check above can only prove the token is *present*, never that it is
  // still valid — a revoked or expired token passes it and then fails at upload
  // with a 401. Without a handler the plugin prints two full stack traces per
  // build, which reads like the build broke when it hasn't: the bundle is fine,
  // only the sourcemap upload was refused. Say that in one line instead, and
  // keep it actionable — nobody can guess "mint a new token" from a stack trace.
  errorHandler: (() => {
    let explained = false;
    return (err: Error) => {
      // Fires once per operation (release creation, then upload) and the upload
      // error embeds the whole sentry-cli invocation — echoing err.message
      // verbatim is what produced the wall. Take the first line only, and give
      // the cause once rather than repeating it per failure.
      const summary = (err.message || "unknown error").split("\n")[0].slice(0, 100);
      if (explained) {
        console.warn(`[sentry] Sourcemap upload skipped (${summary})`);
        return;
      }
      explained = true;
      console.warn(
        "[sentry] Sourcemap upload skipped — SENTRY_AUTH_TOKEN was rejected. The bundle " +
          "is unaffected; only Sentry stack traces stay minified. Issue a new token at " +
          "Sentry → Settings → Auth Tokens (scopes: project:releases, org:read) and set " +
          "SENTRY_AUTH_TOKEN in .env. To disable uploads cleanly instead, unset it."
      );
    };
  })(),
  // Route browser SDK requests through the app so ad blockers can't silently
  // drop client-side error reports.
  tunnelRoute: true,
});
