import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Aernova Report",
  description: "Printable roofing report",
};

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}