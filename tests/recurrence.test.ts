import assert from "node:assert/strict";
import { test } from "node:test";
import {
  expandRecurrence,
  formatDateKey,
  missingOccurrences,
  toCalendarDate,
  type CalendarDate,
  type Recurrence,
} from "../lib/schedule/recurrence.ts";

const d = (iso: string): CalendarDate => {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
};
const keys = (dates: CalendarDate[]) => dates.map(formatDateKey);

function rule(over: Partial<Recurrence> = {}): Recurrence {
  return { frequency: "WEEKLY", interval: 1, startDate: d("2026-05-05"), ...over };
}

test("weekly repeats on the start date's own weekday", () => {
  // 2026-05-05 is a Tuesday.
  const out = expandRecurrence(rule(), d("2026-06-02"));
  assert.deepEqual(keys(out), [
    "2026-05-05", "2026-05-12", "2026-05-19", "2026-05-26", "2026-06-02",
  ]);
});

test("fortnightly skips a week", () => {
  const out = expandRecurrence(rule({ interval: 2 }), d("2026-06-16"));
  assert.deepEqual(keys(out), ["2026-05-05", "2026-05-19", "2026-06-02", "2026-06-16"]);
});

test("two days a week come out in calendar order, not grouped by day", () => {
  // Monday and Thursday. Reading Mon, Mon, Mon, Thu, Thu, Thu would be useless
  // to somebody looking at their week.
  const out = expandRecurrence(
    rule({ startDate: d("2026-05-04"), byWeekday: [1, 4] }),
    d("2026-05-18")
  );
  assert.deepEqual(keys(out), [
    "2026-05-04", "2026-05-07", "2026-05-11", "2026-05-14", "2026-05-18",
  ]);
});

test("an 8am mow stays on the same weekday across the clocks changing", () => {
  // Canada's DST ends 2026-11-01. Stepping by elapsed time would slide this
  // schedule by an hour and, near midnight, by a whole day.
  const out = expandRecurrence(
    rule({ startDate: d("2026-10-20") }),
    d("2026-11-17")
  );
  assert.deepEqual(keys(out), [
    "2026-10-20", "2026-10-27", "2026-11-03", "2026-11-10", "2026-11-17",
  ]);
});

test("the horizon caps a schedule that never ends", () => {
  const out = expandRecurrence(rule(), d("2026-05-19"));
  assert.equal(out.length, 3);
});

test("an end date is inclusive and stops it", () => {
  const out = expandRecurrence(rule({ untilDate: d("2026-05-19") }), d("2026-12-31"));
  assert.deepEqual(keys(out), ["2026-05-05", "2026-05-12", "2026-05-19"]);
});

test("a count stops it after N, however far the horizon is", () => {
  const out = expandRecurrence(rule({ count: 26 }), d("2027-12-31"));
  assert.equal(out.length, 26, "a 26-visit lawn contract is 26 visits");
  assert.equal(formatDateKey(out[25]), "2026-10-27");
});

test("a rule with no end still cannot run away", () => {
  const out = expandRecurrence(rule({ frequency: "DAILY" }), d("2036-01-01"));
  assert.equal(out.length, 500, "capped rather than hanging");
});

test("month-end does not walk forward through February", () => {
  // Jan 31 + 1 month is Feb 28, and the *next* one is Mar 31 — not Mar 28.
  // Re-deriving from the original date is what keeps it on the month end.
  const out = expandRecurrence(
    rule({ frequency: "MONTHLY", startDate: d("2026-01-31") }),
    d("2026-05-31")
  );
  assert.deepEqual(keys(out), [
    "2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31",
  ]);
});

test("a leap year gets its 29th", () => {
  const out = expandRecurrence(
    rule({ frequency: "MONTHLY", startDate: d("2028-01-31"), count: 2 }),
    d("2028-12-31")
  );
  assert.deepEqual(keys(out), ["2028-01-31", "2028-02-29"]);
});

test("daily every third day", () => {
  const out = expandRecurrence(
    rule({ frequency: "DAILY", interval: 3 }),
    d("2026-05-14")
  );
  assert.deepEqual(keys(out), ["2026-05-05", "2026-05-08", "2026-05-11", "2026-05-14"]);
});

test("nothing is emitted before the start date", () => {
  const out = expandRecurrence(rule({ byWeekday: [0, 1, 2, 3, 4, 5, 6] }), d("2026-05-07"));
  assert.deepEqual(keys(out), ["2026-05-05", "2026-05-06", "2026-05-07"]);
});

test("visits already booked are left alone", () => {
  // The crew moved one and finished another. Regenerating over either would
  // overwrite a decision a person made.
  const missing = missingOccurrences(rule(), d("2026-05-26"), [
    "2026-05-05",
    "2026-05-12",
  ]);
  assert.deepEqual(keys(missing), ["2026-05-19", "2026-05-26"]);
});

test("an interval of zero or nonsense degrades to every period", () => {
  const out = expandRecurrence(rule({ interval: 0 }), d("2026-05-19"));
  assert.deepEqual(keys(out), ["2026-05-05", "2026-05-12", "2026-05-19"]);
});

test("a horizon before the start yields nothing", () => {
  assert.deepEqual(expandRecurrence(rule(), d("2026-01-01")), []);
});

test("toCalendarDate reads UTC fields, not the host's local time", () => {
  // 00:30 UTC. A local-getters implementation would read this back as the
  // *previous* calendar day on any host west of UTC (America/Toronto, where
  // this repo's tests actually run, included) — exactly the off-by-one this
  // fixes in setRecurrenceAction's horizon, which feeds this an absolute
  // instant (Date.now() + N days) with no timezone context at all.
  assert.deepEqual(toCalendarDate(new Date(Date.UTC(2026, 5, 15, 0, 30))), {
    year: 2026,
    month: 6,
    day: 15,
  });
  // And the boundary the other way: 23:30 UTC is already tomorrow east of UTC.
  assert.deepEqual(toCalendarDate(new Date(Date.UTC(2026, 5, 15, 23, 30))), {
    year: 2026,
    month: 6,
    day: 15,
  });
});
