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
  // Route browser SDK requests through the app so ad blockers can't silently
  // drop client-side error reports.
  tunnelRoute: true,
});
