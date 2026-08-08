import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { headers } from "next/headers";
import { SITE_URL } from "@/lib/site";
import { AstryxThemeProvider } from "@/components/astryx-theme-provider";
import "./globals.css";

const title = "Aernova";
const description = "Jobs, quotes and clients for trades contractors";

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
      <html lang="en" suppressHydrationWarning>
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
          </AstryxThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}