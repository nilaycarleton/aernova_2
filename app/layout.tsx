import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aernova",
  description: "Roof measurement, inspection, and proposal platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Replay an explicit light/dark choice before first paint so there is
              no flash. With no stored choice the attribute stays unset and CSS
              follows the OS (prefers-color-scheme). See theme-toggle.tsx. */}
          <script
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