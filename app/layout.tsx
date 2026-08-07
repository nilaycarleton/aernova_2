import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aernova",
  description: "Jobs, quotes and clients for trades contractors",
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
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}