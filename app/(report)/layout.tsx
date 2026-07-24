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
  // The report is a printed document, not the app. It is nested under the root
  // layout (which already owns <html>/<body>), so it must NOT render its own —
  // that produced a nested-<html> hydration error. Instead it forces the light
  // paper surface on its subtree via `.surface-light`, regardless of app theme.
  return (
    <div className="surface-light min-h-screen bg-paper text-paper-ink antialiased">
      {children}
    </div>
  );
}