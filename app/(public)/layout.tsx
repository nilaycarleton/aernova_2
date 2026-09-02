import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Your quote",
  description: "A quote from your contractor",
  // Not indexable. A share token is unguessable, but a crawler that follows a
  // link from a forwarded email would put somebody's roof price in a search
  // result, and no amount of entropy protects against being published.
  robots: { index: false, follow: false },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // Same rule as the report group: nested under the root layout, so no <html>
  // or <body> of its own. `.surface-light` pins the paper surface regardless of
  // whatever theme the contractor happens to use — this is a document for
  // somebody who has never seen the app, and it should look like paper in every
  // case.
  return (
    <main id="main-content" tabIndex={-1} className="surface-light min-h-screen bg-paper text-paper-ink antialiased outline-none">
      {children}
    </main>
  );
}
