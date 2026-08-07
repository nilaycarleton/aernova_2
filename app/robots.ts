import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Everything behind Clerk (the dashboard, jobs, quotes) has nothing to gain
 * from being crawled and a session wall to show a bot that tries anyway.
 * The homeowner-facing share links (`/q/…`, `/i/…`, `/hub/…`, `/request/…`,
 * `/calendar/…`) already carry their own `robots: noindex` (see
 * `app/(public)/layout.tsx`) because an unguessable token is not the same
 * thing as "fine to publish" — this disallow is the second, redundant layer
 * for crawlers that ignore the meta tag. `/terms` and `/privacy` are the only
 * pages here with real content worth indexing, so they're named explicitly:
 * the longest matching rule wins, so `Allow: /terms` overrides `Disallow: /`
 * for that path per RFC 9309, the same as every major crawler's own docs
 * describe it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/terms", "/privacy"],
      disallow: ["/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
