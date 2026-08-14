/**
 * The two-state character-counter doctrine already proven by
 * lib/invoice/addon-override.ts's `overrideNoteCounterText` (the
 * OWNER_OVERRIDE note field): below a required minimum, count *up* toward
 * it ("more characters required" — an empty field reading "500 characters
 * remaining" looks like plenty of room, not "you haven't started"); at or
 * above the minimum, count *down* toward the ceiling, the ordinary
 * convention. Generalized here (Premium UI Redesign Phase 3) so the next
 * character-limited field doesn't re-derive it from scratch.
 *
 * `addon-override.ts` keeps its own copy rather than being refactored to
 * call this — Phase 3 doesn't alter existing server-action-adjacent copy
 * (Step 46) purely for reuse's sake. New fields should reach for this one.
 */
export function characterCounterText(length: number, min: number, max: number): string {
  if (length < min) {
    const remaining = min - length;
    return `${remaining} more character${remaining === 1 ? "" : "s"} required`;
  }
  const remaining = max - length;
  return `${remaining} character${remaining === 1 ? "" : "s"} remaining`;
}

export type CounterState = "under" | "in-range" | "over";

export function characterCounterState(length: number, min: number, max: number): CounterState {
  if (length < min) return "under";
  if (length > max) return "over";
  return "in-range";
}
