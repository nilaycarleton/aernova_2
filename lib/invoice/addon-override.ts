/**
 * §19.2's override-note rule, in one place so the server action that enforces
 * it and the textarea's live counter read the exact same numbers.
 *
 * Only `OWNER_OVERRIDE` is constrained: the other two reasons
 * (`HOMEOWNER_CONTACT_MISSING`, `VERBAL_APPROVAL`) are self-explanatory, so
 * their note stays optional and unconstrained. `OWNER_OVERRIDE` alone doesn't
 * explain itself, which is why it — and only it — needs a real explanation:
 * 20-500 characters, enforced here rather than as a DB `CHECK` constraint,
 * since this is a business rule that might reasonably change without a
 * migration (see the `overrideNote` schema comment).
 */
export const OVERRIDE_NOTE_MIN = 20;
export const OVERRIDE_NOTE_MAX = 500;

export const OVERRIDE_NOTE_VALIDATION_MESSAGE =
  "Please explain why homeowner review is being skipped. Enter 20-500 characters.";

/** Reused by the action (throws) and the form (renders inline) — same rule, one place. */
export function overrideNoteError(reason: string, note: string): string | null {
  if (reason !== "OWNER_OVERRIDE") return null;
  const length = note.trim().length;
  if (length < OVERRIDE_NOTE_MIN || length > OVERRIDE_NOTE_MAX) {
    return OVERRIDE_NOTE_VALIDATION_MESSAGE;
  }
  return null;
}

/**
 * The two-state counter (decision 37): below the floor it counts *up* toward
 * 20 ("more characters required" — an empty field reading "500 characters
 * remaining" would look like plenty of room, not "you haven't started");
 * from 20 on, it counts *down* toward the ceiling, the ordinary convention.
 * The switch happens the instant the 20th character is typed, no
 * intermediate state.
 */
export function overrideNoteCounterText(length: number): string {
  if (length < OVERRIDE_NOTE_MIN) {
    const remaining = OVERRIDE_NOTE_MIN - length;
    return `${remaining} more character${remaining === 1 ? "" : "s"} required`;
  }
  const remaining = OVERRIDE_NOTE_MAX - length;
  return `${remaining} character${remaining === 1 ? "" : "s"} remaining`;
}
