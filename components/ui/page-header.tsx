import type { ElementType, ReactNode } from "react";

/**
 * Page-level identity INSIDE route content — "what am I working on here,"
 * not "where am I" (that's Phase 2's TopNav, see
 * components/dashboard/shell/shell-chrome.tsx). The duplication audit found
 * ~15 independent hand-typed title/description/action rows across routes
 * (invoices, quotes, jobs, requests, clients, reports, settings, ...); this
 * is the one shape they converge on.
 *
 * `headingLevel` mirrors the fix Phase 3 applied to `DocumentHeader` for the
 * identical problem: every route under the authenticated shell already has
 * TopNav's own `<h1>` (the route title). Phase 4 wires this component into
 * routes that render inside that shell, so it renders `<h2>` by default at
 * those call sites to avoid a second `<h1>` — pass `headingLevel={1}`
 * explicitly for a future standalone use outside the shell.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  status,
  primaryAction,
  secondaryActions,
  headingLevel = 2,
}: {
  /** Small label above the title — job number + address, a breadcrumb-ish context. */
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  /** A Status element, when the page itself carries one state worth surfacing here. */
  status?: ReactNode;
  /** At most one dominant action — a second "primary" competes with it; use secondaryActions instead. */
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  /** Defaults to 2 — TopNav already owns the page's `<h1>`. Pass 1 only when no shell heading exists. */
  headingLevel?: 1 | 2 | 3;
}) {
  const Heading = `h${headingLevel}` as ElementType;
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">{eyebrow}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <Heading className="text-2xl font-semibold text-balance text-ink-primary">{title}</Heading>
          {status}
        </div>
        {description ? (
          <p className="mt-2 max-w-[65ch] text-sm text-ink-secondary">{description}</p>
        ) : null}
      </div>

      {primaryAction || secondaryActions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {secondaryActions}
          {primaryAction}
        </div>
      ) : null}
    </div>
  );
}
