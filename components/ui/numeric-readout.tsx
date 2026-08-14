import { formatReadoutValue, isReadoutEmpty } from "@/lib/numeric-readout";

/**
 * The one shape for an operational number — a balance, a count, a
 * measurement. Presentation only (Step 48): formats thousands-grouping on a
 * plain number and renders a caller-formatted string verbatim, but never
 * computes money, margin, tax, or progress — those stay in lib/money.ts,
 * lib/quote/totals.ts, and friends.
 *
 * `tone="measurement"` is the one place this component may render Instrument
 * Cyan, and only because the caller is asserting the number IS a reading
 * (roof area, pitch, a measured distance) — never for money, counts, or
 * status totals (see docs/DESIGN.md's Readout Rule / The Action/Measurement
 * Distinction). Null/undefined always renders as a muted em dash regardless
 * of tone — a missing measurement isn't styled as an error.
 */
export function NumericReadout({
  label,
  value,
  unit,
  detail,
  tone = "default",
  size = "md",
}: {
  label: string;
  value: string | number | null | undefined;
  /** Appended after the value, e.g. "sq ft", "%". Omitted for empty values. */
  unit?: string;
  /** Supporting line below the value, e.g. "3 of 5 visits". */
  detail?: string;
  tone?: "default" | "measurement";
  size?: "sm" | "md" | "lg";
}) {
  const empty = isReadoutEmpty(value);
  const display = formatReadoutValue(value);

  const sizeClass = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl";
  const colorClass = empty
    ? "text-ink-muted"
    : tone === "measurement"
      ? "text-instrument-fg"
      : "text-ink-primary";

  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className={`mt-1 font-semibold tabular-nums ${sizeClass} ${colorClass}`}>
        {display}
        {!empty && unit ? (
          <span className="ml-1 text-sm font-normal text-ink-muted">{unit}</span>
        ) : null}
      </p>
      {detail ? <p className="mt-1 text-xs text-ink-muted">{detail}</p> : null}
    </div>
  );
}
