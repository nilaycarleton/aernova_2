/**
 * Semantic tone → Astryx variant mapping for the shared Status primitive
 * (components/ui/status.tsx). One place that knows Astryx's own variant
 * names, so a domain `*_STATUS_META` table (lib/job-status.ts,
 * lib/quote-status.ts, ...) only ever has to pick a `tone`, never an Astryx
 * enum. Pure and JSX-free so it's independently testable — see
 * tests/status-tone.test.ts.
 */
export type StatusTone = "neutral" | "info" | "success" | "caution" | "danger";

export type StatusDotVariant = "neutral" | "accent" | "success" | "warning" | "error";
export type StatusBadgeVariant = "neutral" | "info" | "success" | "warning" | "error";

/** StatusDot has no "info" variant of its own; "accent" is its closest structural-emphasis analog. */
const DOT_VARIANT: Record<StatusTone, StatusDotVariant> = {
  neutral: "neutral",
  info: "accent",
  success: "success",
  caution: "warning",
  danger: "error",
};

/** Badge's variant map already names "info" directly — a straight rename, not a substitution. */
const BADGE_VARIANT: Record<StatusTone, StatusBadgeVariant> = {
  neutral: "neutral",
  info: "info",
  success: "success",
  caution: "warning",
  danger: "error",
};

export function statusDotVariant(tone: StatusTone): StatusDotVariant {
  return DOT_VARIANT[tone];
}

export function statusBadgeVariant(tone: StatusTone): StatusBadgeVariant {
  return BADGE_VARIANT[tone];
}
