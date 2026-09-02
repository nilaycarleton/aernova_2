import type { ReactNode } from "react";

/**
 * Document-mode primitives — the print-safe paper surface, never the app
 * theme (see app/globals.css's `.surface-light` and docs/DESIGN.md's
 * "Company branding on every paper surface"). Not wired into the actual
 * public routes yet — Phase 6 migrates q/i/co/w. The duplication audit
 * found those four token-gated pages independently hand-typing the same
 * heading/section/rule/totals shapes (and the invoice page re-implementing
 * its own totals `<dl>` instead of reusing the quote page's); this is the
 * shared shape, built alongside the two pieces that are already genuinely
 * reused as-is (components/public/document-brand.tsx,
 * components/public/quote-totals.tsx) rather than replacing them.
 *
 * Paper tokens only (`--color-paper-*`) — read via inline `style` since
 * Tailwind has no generated utility for them. No Prisma, no domain status
 * enums, no permission checks (Step 47/50).
 */

export function DocumentSurface({ children }: { children: ReactNode }) {
  return (
    <div
      className="surface-light rounded-md border border-hairline p-6 sm:p-10"
      style={{ background: "var(--color-paper-document)" }}
    >
      {children}
    </div>
  );
}

export function DocumentHeader({
  eyebrow,
  title,
  headingLevel = 1,
}: {
  eyebrow?: string;
  title: string;
  /** The public document routes (Phase 6) render this as the page's sole h1. Anywhere it's embedded alongside another heading outline — like this lab — pass a lower level so the two don't collide. @default 1 */
  headingLevel?: 1 | 2 | 3;
}) {
  const Heading = headingLevel === 1 ? "h1" : headingLevel === 2 ? "h2" : "h3";
  return (
    <div>
      {eyebrow ? (
        <p
          className="text-xs uppercase tracking-[0.16em]"
          style={{ color: "var(--color-paper-ink-faint)" }}
        >
          {eyebrow}
        </p>
      ) : null}
      <Heading className="mt-1 text-2xl font-semibold" style={{ color: "var(--color-paper-ink)" }}>
        {title}
      </Heading>
    </div>
  );
}

export function DocumentSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      {title ? (
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--color-paper-ink-strong)" }}
        >
          {title}
        </h2>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function DocumentMeta({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label}>
          <dt style={{ color: "var(--color-paper-ink-faint)" }}>{item.label}</dt>
          <dd style={{ color: "var(--color-paper-ink-body)" }}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DocumentRule({ strong = false }: { strong?: boolean }) {
  return (
    <hr
      className={strong ? "border-t-2" : "border-t"}
      style={{
        borderColor: strong ? "var(--color-paper-rule-strong)" : "var(--color-paper-rule)",
      }}
    />
  );
}

/** Matches components/public/quote-totals.tsx's own `TotalRow` shape — build the invoice page's equivalent against this instead of a third copy, when that route migrates. */
export function DocumentTotalRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt
        className={emphasis ? "font-medium" : ""}
        style={{ color: emphasis ? "var(--color-paper-ink-strong)" : "var(--color-paper-ink-muted)" }}
      >
        {label}
      </dt>
      <dd
        className={`tabular-nums ${emphasis ? "font-medium" : ""}`}
        style={{ color: emphasis ? "var(--color-paper-ink-strong)" : "var(--color-paper-ink-body)" }}
      >
        {value}
      </dd>
    </div>
  );
}

export function DocumentFooter({ children }: { children: ReactNode }) {
  return (
    <p className="mt-10 text-xs" style={{ color: "var(--color-paper-ink-faint)" }}>
      {children}
    </p>
  );
}
