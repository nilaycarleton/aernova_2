import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Just the two pages a crawler is actually welcome to index (see robots.ts).
 * `/` is excluded on purpose — it never renders anything, only redirects to
 * `/sign-in` or `/dashboard` — and every other route either requires a
 * session or is a homeowner's own unguessable share link.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
