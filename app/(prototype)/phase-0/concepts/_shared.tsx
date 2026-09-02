import Link from "next/link";

export function ConceptHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mx-auto max-w-[1400px] px-4 pt-8 pb-6 md:px-6">
      <Link href="/phase-0/concepts" className="text-xs text-ink-muted hover:text-ink-primary">
        &larr; All concepts
      </Link>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-muted">{eyebrow}</p>
      <h1 className="mt-1 text-xl font-semibold text-ink-primary">{title}</h1>
      <p className="mt-2 max-w-[70ch] text-sm text-ink-secondary">{description}</p>
    </header>
  );
}
