import Link from "next/link";

const LINKS = [
  { href: "/phase-0/prototype", name: "Interactive prototype", summary: "Shell, dashboard, jobs, job workspace, role-adaptive nav, mobile sheet." },
  { href: "/phase-0/concepts", name: "Visual concept seeds", summary: "Three directions inside Precision Workshop — Ledger, Workbench, Dossier." },
  { href: "/phase-0/typography", name: "Typography comparison", summary: "System stack vs. IBM Plex Sans, Source Sans 3, and Geist on real content." },
];

export default function Phase0IndexPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[900px] px-4 py-10 outline-none md:px-6">
      <h1 className="text-xl font-semibold text-ink-primary">Phase 0 — Precision Workshop</h1>
      <p className="mt-2 max-w-[70ch] text-sm text-ink-secondary">
        Decisions, baseline, and concept validation for the Premium UI Redesign
        (<code>docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_REDESIGN_PLAN.md</code>). This route tree is prototype-only — nothing
        here is wired to real data, business actions, or the production shell. Written artifacts
        (baseline report, brief, typography and concept writeups, decision record) live under{" "}
        <code>docs/phase-0/</code>.
      </p>
      <ul className="mt-8 space-y-3">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block rounded-lg border border-hairline p-4 transition-colors hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              <span className="block font-medium text-ink-primary">{l.name}</span>
              <span className="mt-1 block text-sm text-ink-secondary">{l.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
