import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  /**
   * `/projects` became `/jobs` when the domain model split. Permanent because
   * the old path is genuinely gone, and a contractor who bookmarked a job or
   * pasted its link into a text message should land on it rather than a 404 —
   * the link is how they find the work, not a convenience.
   */
  async redirects() {
    return [
      // Phase 2 gave /jobs a real index page, so the bare path finally points
      // at the noun it renamed to rather than at the dashboard.
      { source: "/projects", destination: "/jobs", permanent: true },
      { source: "/projects/:path*", destination: "/jobs/:path*", permanent: true },
      { source: "/api/projects/:path*", destination: "/api/jobs/:path*", permanent: true },
    ];
  },

  /**
   * The headers with no per-request value, so they belong here rather than in
   * `proxy.ts` alongside the CSP (which needs a fresh nonce every request and
   * so has to be set from middleware — see `clerkMiddleware`'s
   * `contentSecurityPolicy` option there). `frame-ancestors` in that CSP is
   * the modern equivalent of X-Frame-Options; this repeats it for browsers
   * that only understand the older header.
   *
   * Camera/microphone/geolocation are denied outright: photo capture goes
   * through the native `<input capture>` file picker (see
   * `inspection-photo-input.tsx`), never `navigator.mediaDevices`, so the app
   * has no legitimate use for the JS permission prompt either API would
   * trigger.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
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
