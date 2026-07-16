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
      <html lang="en">
        <body className="min-h-screen bg-ground text-ink-primary antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}