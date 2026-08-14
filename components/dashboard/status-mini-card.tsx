import Link from "next/link";

/**
 * §16/§17/§25 Phase 7 — the generalized shape `JobStatusStepper` already
 * proved out (label/description/badge/next-action), sized down to sit
 * beside it rather than duplicate it. Purely presentational: every field is
 * a plain string handed in by a caller like `lib/job-mini-cards.ts` — this
 * component makes no decision about what state means, only how to show one.
 *
 * Deliberately not a config-driven Request/Quote/Job/Invoice engine (§17)
 * — a second one of these for a different domain is a second call site, not
 * a new capability this component needs.
 */
export function StatusMiniCard({
  eyebrow,
  label,
  description,
  badge,
  secondaryDetail,
  action,
}: {
  /** The domain this card reports on, e.g. "Sales" or "Financial". */
  eyebrow: string;
  /** The current state, in the trade's words — never a raw enum. */
  label: string;
  description: string;
  /** Tailwind classes for the state pill. */
  badge: string;
  secondaryDetail?: string | null;
  action?: { label: string; href: string } | null;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-hairline bg-surface-raised p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">{eyebrow}</p>

      <span
        className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge}`}
      >
        {label}
      </span>

      <p className="mt-2 text-sm leading-6 text-ink-secondary">{description}</p>

      {secondaryDetail ? (
        <p className="mt-2 text-lg font-semibold tabular-nums text-ink-primary">
          {secondaryDetail}
        </p>
      ) : null}

      {action ? (
        <Link
          href={action.href}
          className="mt-4 inline-flex rounded-xl border border-hairline bg-surface-raised px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        >
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}
