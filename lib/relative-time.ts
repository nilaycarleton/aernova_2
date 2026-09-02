/**
 * "3 days ago", not "2026-07-24".
 *
 * Every question these columns answer is about how long it has been — a date
 * makes the reader do the subtraction, and a contractor scanning a list of
 * people waiting on them should not have to. The exact timestamp belongs in a
 * `title` attribute, for the one time somebody needs it.
 */

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const DAY = 24 * 60 * 60 * 1000;

/** Whole days between now and then; negative for the past. */
export function daysBetween(value: string | Date, now: Date = new Date()): number {
  return Math.round((new Date(value).getTime() - now.getTime()) / DAY);
}

/**
 * How long ago, in the coarsest unit that is still true. Days up to a month,
 * then months, then years — nobody needs "412 days ago".
 */
export function sinceLabel(value: string | Date, now: Date = new Date()): string {
  const days = daysBetween(value, now);
  if (days === 0) return "Today";
  if (Math.abs(days) < 30) return relative.format(days, "day");
  if (Math.abs(days) < 365) return relative.format(Math.round(days / 30), "month");
  return relative.format(Math.round(days / 365), "year");
}
