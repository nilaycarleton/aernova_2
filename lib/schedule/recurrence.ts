/**
 * Turning "every second Tuesday until October" into dates on a calendar.
 *
 * Pure, and with no database in sight, for the same reason `lib/quote/totals.ts`
 * is: this is the arithmetic a crew's week is built out of, and it has to be
 * testable to the day. The action that writes `Visit` rows calls it; so will the
 * calendar, the horizon job, and anything that ever previews a schedule.
 *
 * **It works in wall-clock terms, never in elapsed time.** Adding seven days to
 * an instant is wrong twice a year: an 8am Tuesday mow becomes 7am or 9am the
 * week the clocks change, and stays wrong for the rest of the season. So the
 * expansion walks *calendar days* and re-attaches the time of day at the end.
 * The caller converts each (date, minutes) pair to an instant in the company's
 * own timezone — see the note on `Company.timeZone`.
 *
 * The horizon is not an optimisation. A lawn contract with no end date has
 * infinitely many occurrences; materialising them is impossible and pretending
 * otherwise is how a scheduler hangs. Visits exist as far ahead as somebody
 * needs to see, and the horizon moves forward as time passes.
 */

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY";

export type Recurrence = {
  frequency: Frequency;
  /** Every N periods. 2 + WEEKLY is fortnightly. */
  interval: number;
  /** WEEKLY only: 0=Sunday … 6=Saturday. Empty means "the start date's day". */
  byWeekday?: number[];
  /** Date-only, in the company's timezone. The time of day lives apart. */
  startDate: CalendarDate;
  /** Ends never (both null), on a date, or after N occurrences. */
  untilDate?: CalendarDate | null;
  count?: number | null;
};

/** A day on a wall calendar. No timezone, no time, no drift. */
export type CalendarDate = { year: number; month: number; day: number };

/** Anything past this is a runaway rule, not a schedule. */
const MAX_OCCURRENCES = 500;

/**
 * UTC, not local — same rule as `fromUtc` below, which this delegates to.
 * The one caller (`setRecurrenceAction`'s horizon) feeds it an absolute
 * instant (`Date.now() + N days`), and reading that back with local getters
 * makes the materialization cutoff depend on the server's `TZ`: near a UTC
 * day boundary, the local calendar day can land a day earlier or later than
 * the UTC one, silently shifting how far ahead visits get created.
 */
export function toCalendarDate(date: Date): CalendarDate {
  return fromUtc(date);
}

/** Compare two calendar days. Negative when `a` is earlier. */
export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

export function formatDateKey(date: CalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

// UTC internally purely as a calendar with no daylight saving in it — never as
// an instant. Nothing here is a moment in time; these are squares on a grid.
function toUtc(date: CalendarDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

function fromUtc(date: Date): CalendarDate {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function addDays(date: CalendarDate, days: number): CalendarDate {
  const stepped = toUtc(date);
  stepped.setUTCDate(stepped.getUTCDate() + days);
  return fromUtc(stepped);
}

/**
 * Add months, clamping to the end of a short month.
 *
 * The 31st of January plus one month is the 28th of February, not the 3rd of
 * March. JavaScript's own date arithmetic rolls over, which silently walks a
 * month-end schedule forward a few days at a time until it is in the wrong
 * month entirely.
 */
function addMonths(date: CalendarDate, months: number): CalendarDate {
  const total = date.year * 12 + (date.month - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day: Math.min(date.day, lastDay) };
}

function weekdayOf(date: CalendarDate): number {
  return toUtc(date).getUTCDay();
}

/** Back up to the Sunday that starts this date's week. */
function startOfWeek(date: CalendarDate): CalendarDate {
  return addDays(date, -weekdayOf(date));
}

/**
 * Every date this rule lands on, up to the horizon.
 *
 * `horizon` is inclusive and always applies: a rule that ends after 30
 * occurrences still only yields the ones that fall before it, so a caller can
 * generate a season at a time and come back for more.
 */
export function expandRecurrence(rule: Recurrence, horizon: CalendarDate): CalendarDate[] {
  const interval = Math.max(1, Math.floor(rule.interval || 1));
  const limit = rule.count && rule.count > 0 ? Math.min(rule.count, MAX_OCCURRENCES) : MAX_OCCURRENCES;
  const out: CalendarDate[] = [];

  const push = (date: CalendarDate): boolean => {
    if (compareDates(date, rule.startDate) < 0) return true;
    if (compareDates(date, horizon) > 0) return false;
    if (rule.untilDate && compareDates(date, rule.untilDate) > 0) return false;
    out.push(date);
    return out.length < limit;
  };

  if (rule.frequency === "DAILY") {
    let cursor = rule.startDate;
    while (compareDates(cursor, horizon) <= 0) {
      if (!push(cursor)) break;
      cursor = addDays(cursor, interval);
    }
    return out;
  }

  if (rule.frequency === "MONTHLY") {
    let cursor = rule.startDate;
    let step = 0;
    while (compareDates(cursor, horizon) <= 0) {
      if (!push(cursor)) break;
      step += interval;
      // Always re-derived from the *original* date, so a February clamp does
      // not permanently drag a 31st-of-the-month schedule down to the 28th.
      cursor = addMonths(rule.startDate, step);
    }
    return out;
  }

  // WEEKLY. Days are emitted in calendar order within each active week, so a
  // Monday-and-Thursday rule reads Mon, Thu, Mon, Thu — not every Monday first.
  const days = (rule.byWeekday?.length ? [...new Set(rule.byWeekday)] : [weekdayOf(rule.startDate)])
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
  if (days.length === 0) return out;

  let weekStart = startOfWeek(rule.startDate);
  outer: while (compareDates(weekStart, horizon) <= 0) {
    for (const day of days) {
      const date = addDays(weekStart, day);
      if (compareDates(date, rule.startDate) < 0) continue;
      if (compareDates(date, horizon) > 0) break outer;
      if (!push(date)) break outer;
    }
    weekStart = addDays(weekStart, 7 * interval);
  }
  return out;
}

/**
 * What is missing between the rule and what has already been booked.
 *
 * The generator never touches a visit that exists. A crew member who moved
 * Tuesday's mow to Wednesday because of rain has made a decision, and a
 * scheduler that "corrects" it overnight is a scheduler nobody trusts with
 * their week. Matching is by the occurrence's *slot*, not by its date, which is
 * why a moved visit still counts as done.
 */
export function missingOccurrences(
  rule: Recurrence,
  horizon: CalendarDate,
  existingOccurrenceKeys: Iterable<string>
): CalendarDate[] {
  const taken = new Set(existingOccurrenceKeys);
  return expandRecurrence(rule, horizon).filter((date) => !taken.has(formatDateKey(date)));
}
