/**
 * Pure display formatting for the shared NumericReadout primitive
 * (components/ui/numeric-readout.tsx). Grouping only, never money, margin,
 * tax, or progress math (Step 48) — those stay in lib/money.ts,
 * lib/quote/totals.ts, and friends, which usually hand this component an
 * already-formatted string. The plain-number path exists for counts with no
 * dedicated formatter of their own ("37 jobs", "3 overdue").
 */
export function formatReadoutValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value.trim().length > 0 ? value : "—";
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US");
}

export function isReadoutEmpty(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return !Number.isFinite(value);
  return value.trim().length === 0;
}
