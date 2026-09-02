import type { MetadataRoute } from "next";

/**
 * `start_url` is `/today`, not `/`, on purpose. `/` only ever redirects
 * (see app/page.tsx), and the home-screen icon this manifest exists for is
 * squarely for the crew — `/today` is "the one screen a crew member actually
 * lives in" (see its own doc comment). Office/admin installs still land
 * somewhere real, since `/today` resolves for every role, just scoped by
 * `lib/permissions.ts`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aernova",
    short_name: "Aernova",
    description: "Jobs, quotes and clients for trades contractors",
    start_url: "/today",
    display: "standalone",
    background_color: "#01051a",
    theme_color: "#01051a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
