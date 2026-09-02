/**
 * Where a wall-clock time and an IANA zone become a real instant, and back.
 *
 * `lib/schedule/day.ts` is deliberately zone-agnostic — "no timezone, no time,
 * no drift" — because an all-day visit is stored as UTC midnight of a square
 * and that square means the same thing everywhere. A *timed* visit is
 * different: "8am" only means something once you know whose 8am. This file is
 * where that question gets answered, and only this file — `recurrence.ts` says
 * as much in its own header: "the caller converts each (date, minutes) pair to
 * an instant in the company's own timezone."
 *
 * No date library. `Intl.DateTimeFormat` already knows every IANA zone's rules
 * including DST, and the conversion is the standard two-pass trick: guess the
 * instant as if the wall-clock values were UTC, read back what that instant
 * actually reads as in the target zone, and correct by the difference. One
 * correction pass is enough outside the one hour a year a clock changes; a
 * second pass over the corrected instant is what keeps it exact through that
 * hour too.
 */
import type { CalendarDate } from "./day.ts";
import { dayToInstant, instantToDay } from "./day.ts";

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** How far the zone's local clock reads ahead of UTC, at this instant. */
function offsetMinutesAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
  return (asUtc - instant.getTime()) / 60_000;
}

/** Minutes since midnight → the instant that is that wall-clock time in `timeZone`. */
export function zonedTimeToUtc(date: CalendarDate, minutes: number, timeZone: string): Date {
  const naive = new Date(dayToInstant(date).getTime() + minutes * 60_000);
  const firstPass = new Date(naive.getTime() - offsetMinutesAt(naive, timeZone) * 60_000);
  // Correcting again against the *result* is what keeps this exact across a
  // DST transition, where the first pass's offset can be an hour off.
  const secondOffset = offsetMinutesAt(firstPass, timeZone);
  return new Date(naive.getTime() - secondOffset * 60_000);
}

/** The reverse: an instant → the day and minutes-since-midnight it reads as in `timeZone`. */
export function utcToZoned(instant: Date, timeZone: string): { date: CalendarDate; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    date: { year: get("year"), month: get("month"), day: get("day") },
    minutes: (get("hour") % 24) * 60 + get("minute"),
  };
}

/**
 * Which calendar square a visit belongs on.
 *
 * An all-day visit is stored as UTC midnight of its square, so reading the UTC
 * parts back out is exact everywhere — that is the whole point of storing it
 * that way, and no zone is consulted. A *timed* visit is a real instant, and a
 * late one can cross midnight in the company's zone without crossing it in
 * UTC (an 11pm Vancouver visit is already tomorrow in UTC) — so it needs the
 * zone to land on the day a person there would call it. Without a zone yet
 * set, a timed visit falls back to its UTC day rather than guessing one.
 */
export function visitCalendarDay(
  visit: { startAt: Date; allDay: boolean },
  timeZone: string | null
): CalendarDate {
  if (visit.allDay || !timeZone) return instantToDay(visit.startAt);
  return utcToZoned(visit.startAt, timeZone).date;
}

/** "08:00" → 480. Null for anything that isn't `HH:MM`. */
export function parseTimeInput(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;
  return hours * 60 + mins;
}

/** 480 → "08:00", what an `<input type="time">` wants back. */
export function toTimeInput(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/** 570 → "9:30am". For display, never for storage or comparison. */
export function formatTimeOfDay(minutes: number): string {
  const hours24 = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const period = hours24 < 12 ? "am" : "pm";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return mins === 0 ? `${hours12}${period}` : `${hours12}:${String(mins).padStart(2, "0")}${period}`;
}

/**
 * A short list, on purpose. Aernova's contractors are Canadian (see
 * PRODUCT.md) and a raw dropdown of Intl's ~400 IANA zones is exactly the
 * exposed-parameter-panel PRODUCT.md names as the anti-reference. One entry
 * per Canadian time zone, named the way a contractor would say it rather than
 * by its representative city.
 */
export const CANADIAN_TIME_ZONES: { value: string; label: string }[] = [
  { value: "America/St_Johns", label: "Newfoundland Time" },
  { value: "America/Halifax", label: "Atlantic Time" },
  { value: "America/Toronto", label: "Eastern Time" },
  { value: "America/Winnipeg", label: "Central Time" },
  { value: "America/Regina", label: "Saskatchewan (no clock change)" },
  { value: "America/Edmonton", label: "Mountain Time" },
  { value: "America/Vancouver", label: "Pacific Time" },
];
