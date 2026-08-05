/**
 * A booked day, with no clock on it.
 *
 * Visits are all-day for now, and that is a decision rather than a shortcut.
 * `Company.timeZone` is unset — nobody has been asked for it — and a visit with
 * a *time* on it cannot be stored correctly without one: a crew shown 7am for
 * an 8am start because the server runs in UTC arrives an hour late, and the
 * mistake is invisible until the clocks change. "We're doing the Wetherby roof
 * Tuesday" is also how most of this work is actually scheduled.
 *
 * So a booking is a square on a calendar. It is stored as UTC midnight of that
 * square and read back out of the UTC parts — never through a local-time
 * conversion, which is the only way a date can survive a round trip unshifted.
 * When times land, `startMinutes` joins this and the zone comes from the
 * company.
 */
import type { CalendarDate } from "./recurrence.ts";

// Re-exported so callers that only think in days don't have to reach into the
// recurrence module for the type of the thing they are holding.
export type { CalendarDate };

/** The instant that stands for a calendar square. Never a local midnight. */
export function dayToInstant(date: CalendarDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

/** And back, without ever touching the server's timezone. */
export function instantToDay(instant: Date): CalendarDate {
  return {
    year: instant.getUTCFullYear(),
    month: instant.getUTCMonth() + 1,
    day: instant.getUTCDate(),
  };
}

/** "2026-08-04" → a calendar square. Null for anything that isn't one. */
export function parseDayInput(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  // Rejects the 31st of February rather than silently accepting March 3rd.
  if (candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return null;
  return { year, month, day };
}

/** What an `<input type="date">` wants back. */
export function toDayInput(date: CalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function weekdayName(date: CalendarDate): string {
  return WEEKDAYS[dayToInstant(date).getUTCDay()];
}

/** "Tue 4 Aug". Formatted from UTC parts so it cannot drift by a day. */
export function formatDayShort(date: CalendarDate): string {
  return `${weekdayName(date).slice(0, 3)} ${date.day} ${MONTHS[date.month - 1].slice(0, 3)}`;
}

export function formatDayLong(date: CalendarDate): string {
  return `${weekdayName(date)} ${date.day} ${MONTHS[date.month - 1]} ${date.year}`;
}

/** The Sunday-to-Saturday week containing this day. */
export function weekOf(date: CalendarDate): CalendarDate[] {
  const start = dayToInstant(date);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + index);
    return instantToDay(day);
  });
}

/** The month's name and year, for a heading. */
export function formatMonth(date: CalendarDate): string {
  return `${MONTHS[date.month - 1]} ${date.year}`;
}

export function shiftMonths(date: CalendarDate, months: number): CalendarDate {
  const total = date.year * 12 + (date.month - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day: Math.min(date.day, lastDay) };
}

/**
 * The whole-weeks grid a month view is drawn on — 35 or 42 squares, starting on
 * a Sunday, with the neighbouring months' tail and head included.
 *
 * Those neighbour days are part of the grid rather than blanks because a job on
 * the 1st of next month is a job you need to see while looking at the end of
 * this one. They are dimmed in the view, not omitted.
 */
export function monthGrid(date: CalendarDate): CalendarDate[] {
  const first = { year: date.year, month: date.month, day: 1 };
  const lastDay = new Date(Date.UTC(date.year, date.month, 0)).getUTCDate();
  const last = { year: date.year, month: date.month, day: lastDay };

  const start = dayToInstant(first);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const end = dayToInstant(last);
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  const out: CalendarDate[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    out.push(instantToDay(cursor));
  }
  return out;
}

export function shiftDays(date: CalendarDate, days: number): CalendarDate {
  const stepped = dayToInstant(date);
  stepped.setUTCDate(stepped.getUTCDate() + days);
  return instantToDay(stepped);
}

/**
 * Today, as a calendar square in the viewer's own reckoning.
 *
 * This is the one place a local timezone is legitimately consulted: "is this
 * square today" is a question about the person looking, not about the data.
 */
export function todayIn(now: Date = new Date()): CalendarDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

export function isSameDay(a: CalendarDate, b: CalendarDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}
