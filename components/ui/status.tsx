import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Badge } from "@astryxdesign/core/Badge";
import { statusBadgeVariant, statusDotVariant, type StatusTone } from "@/lib/status-tone";

/**
 * The one semantic status presentation for the app — the severity-dot
 * pattern Phase 0 selected over colored left-border strips (see
 * docs/phase-0/04-decision-record.md; the pattern is never re-litigated per
 * component). A domain `*_STATUS_META` table (lib/job-status.ts,
 * lib/quote-status.ts, ...) decides a `tone` + `label` for its enum; this
 * component only knows how to show a tone, never the enum itself (Step 47).
 *
 * `variant="dot"` (default) is the attention-row treatment — a small tonal
 * dot plus text, for action-center rows, inline alerts, and DataRow
 * trailing status. `variant="solid"` is a compact filled pill for table
 * cells and list badges where a dot reads too quiet. Both are thin wraps of
 * Astryx StatusDot/Badge (Decision A) — the only Aernova-owned part is the
 * tone→variant mapping in lib/status-tone.ts.
 *
 * The dot is marked decorative: the adjacent visible text is always the
 * accessible name, so a screen reader doesn't hear the label twice (once
 * from StatusDot's own required `label`, once from the text run beside it).
 */
export function Status({
  tone,
  label,
  variant = "dot",
  pulsing = false,
}: {
  tone: StatusTone;
  /** Always visible text — color is never the only signal. */
  label: string;
  variant?: "dot" | "solid";
  /** Reserved for a genuinely live state (e.g. "Processing"); StatusDot itself respects reduced motion. */
  pulsing?: boolean;
}) {
  if (variant === "solid") {
    return <Badge variant={statusBadgeVariant(tone)} label={label} />;
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-secondary">
      <span aria-hidden="true">
        <StatusDot variant={statusDotVariant(tone)} label={label} isPulsing={pulsing} />
      </span>
      {label}
    </span>
  );
}
