import type { Metadata } from "next";
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
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}