import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { headers } from "next/headers";
import { SITE_URL } from "@/lib/site";
import { AstryxThemeProvider } from "@/components/astryx-theme-provider";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

const title = "Aernova";
const description = "Jobs, quotes and clients for trades contractors";

/**
 * IBM Plex Sans Variable — the Phase 0 typography comparison winner
 * (docs/phase-0/02-typography-comparison.md), self-hosted through next/font
 * so there is no runtime request to Google Fonts and no manual @import.
 *
 * `weight: "variable"` ships ONE variable file rather than several static
 * weight instances — the recommended next/font path for a variable font,
 * and the only way "IBM Plex Sans Variable" (the actual selected candidate)
 * is what ships. Per Next's own font docs, a Google variable font loads only
 * its `wght` axis by default unless an `axes` option is explicitly passed —
 * IBM Plex Sans's `wdth` (width) axis is therefore never requested. Aernova
 * only ever writes `font-weight: 400/500/600` in CSS (see the type-scale
 * section of docs/DESIGN.md); the variable file supports the fuller
 * 100–700 range Google ships, but nothing in this app invokes outside
 * 400–600.
 *
 * `display: "swap"` plus next/font's automatic fallback-metric adjustment
 * (`adjustFontFallback`, on by default) is the standard next/font pairing
 * for "no invisible text, no layout shift" — text paints immediately in a
 * metrics-matched system fallback, then swaps to Plex with no reflow.
 *
 * Applied via the CSS-variable method (`variable: "--font-plex"`) rather
 * than `className`, so `app/globals.css`'s `--font-sans` token — the one
 * semantic source Tailwind, Astryx, and bespoke CSS all read — is what
 * actually resolves the family, not a class fighting for specificity.
 */
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  // Root-level fallback so any shared link gets a real preview — routes with
  // their own noindex (see app/(public)/layout.tsx) inherit this too, which
  // is fine: it names the product, not the quote or invoice inside it.
  openGraph: {
    title,
    description,
    url: SITE_URL,
    siteName: title,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Set by proxy.ts's `contentSecurityPolicy: { strict: true }` — the CSP's
  // script-src only trusts scripts carrying this request's nonce, so the one
  // inline script below needs it too or the strict policy silently kills the
  // flash-prevention it exists for. Clerk's own scripts read this same header
  // internally; this is the one inline script this app writes itself.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <ClerkProvider>
      <html lang="en" className={ibmPlexSans.variable} suppressHydrationWarning>
        <head>
          {/* Replay an explicit light/dark choice before first paint so there is
              no flash. With no stored choice the attribute stays unset and CSS
              follows the OS (prefers-color-scheme). See theme-toggle.tsx. */}
          <script
            nonce={nonce}
            // React intentionally strips the `nonce` attribute from the DOM
            // right after hydration (so an injected script can't read and
            // reuse it) — a real, expected SSR/CSR mismatch on this one
            // attribute, the same reasoning the <html> tag above already
            // documents for the attribute this script itself sets.
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html:
                "try{var t=localStorage.getItem('aernova-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}",
            }}
          />
        </head>
        <body className="min-h-screen bg-ground text-ink-primary antialiased">
          <AstryxThemeProvider>
            <MotionProvider>
              {/* First focusable element on every route. Invisible until a
                  keyboard user tabs to it, then jumps straight past the sidebar/
                  header to `#main-content` — every nested layout's primary
                  content region carries that id (dashboard, public share pages,
                  the printable report, auth, terms, privacy, not-found). */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-hairline focus:bg-surface-sidebar focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink-primary focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-instrument"
              >
                Skip to content
              </a>
              {children}
            </MotionProvider>
          </AstryxThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}