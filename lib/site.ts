/**
 * The one place the app's own public URL is named, so metadata, the manifest,
 * and robots/sitemap can't drift into naming three different origins.
 *
 * This is distinct from `shareUrl`'s `origin` (lib/share-token.ts), which is
 * read per-request from the request's own host header — right for a link
 * that must survive preview deploys and custom domains. Metadata is
 * generated at build time with no request in hand, so it needs a fixed,
 * known-in-advance value instead.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.aernova.ca").replace(/\/$/, "");
