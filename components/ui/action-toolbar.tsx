import { Toolbar } from "@astryxdesign/core/Toolbar";
import type { ReactNode } from "react";

/**
 * The local page/section command row — Save, Send, Create, Mark complete,
 * More. A thin Aernova composition over Astryx Toolbar (Decision B): Toolbar
 * already provides the end-content slot, roving-tabindex keyboard nav, and a
 * size cascade to child Buttons; this only names the slot by role (primary
 * vs secondary) so a caller can't accidentally stack two dominant actions
 * next to each other.
 *
 * Encodes no domain logic (Step 7/50) — it accepts pre-built action elements
 * (a Button, a DropdownMenu "More" trigger) and decides no permission or
 * behavior itself. The caller's Button already carries pending/disabled
 * state.
 */
export function ActionToolbar({
  label,
  secondary,
  primary,
}: {
  /** Accessible name for the toolbar landmark. */
  label: string;
  /** Secondary/ghost actions — a "More" menu, a secondary edit action, etc. */
  secondary?: ReactNode;
  /** At most one dominant action. */
  primary?: ReactNode;
}) {
  return (
    <Toolbar
      label={label}
      variant="transparent"
      endContent={
        <div className="flex items-center gap-2">
          {secondary}
          {primary}
        </div>
      }
    />
  );
}
