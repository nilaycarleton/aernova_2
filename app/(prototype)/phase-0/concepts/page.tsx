import Link from "next/link";

const CONCEPTS = [
  {
    href: "/phase-0/concepts/a",
    name: "A — Ledger",
    summary: "Maximum density, table-first, icon-only nav rail. Built for fast multi-row scanning.",
  },
  {
    href: "/phase-0/concepts/b",
    name: "B — Workbench",
    summary: "Stable split pane with a persistent inspector, grouped labeled nav. Built for the job workspace.",
  },
  {
    href: "/phase-0/concepts/c",
    name: "C — Dossier",
    summary: "Document-like grouped sections, generous rhythm, top nav. Built for a slower, higher-stakes read.",
  },
];

export default function ConceptsIndexPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1000px] px-4 py-10 outline-none md:px-6">
      <Link href="/phase-0" className="text-xs text-ink-muted hover:text-ink-primary">
        &larr; Phase 0
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-ink-primary">Visual concept seeds</h1>
      <p className="mt-2 max-w-[70ch] text-sm text-ink-secondary">
        Three directions inside the approved Precision Workshop envelope, all obeying the same
        constraints (85/15 calm-precision balance, no nested cards, cyan reserved for measurement,
        dark-first with a complete light mode). They differ in density, containment, and navigation
        treatment — not in unrelated branding. See{" "}
        <code>docs/phase-0/03-concept-seeds.md</code> for the full strengths/weaknesses writeup and
        the selected direction.
      </p>
      <ul className="mt-8 space-y-3">
        {CONCEPTS.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="block rounded-lg border border-hairline p-4 transition-colors hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              <span className="block font-medium text-ink-primary">{c.name}</span>
              <span className="mt-1 block text-sm text-ink-secondary">{c.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
