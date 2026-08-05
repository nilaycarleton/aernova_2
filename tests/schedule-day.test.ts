import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dayToInstant,
  formatDayLong,
  formatDayShort,
  instantToDay,
  isSameDay,
  parseDayInput,
  shiftDays,
  toDayInput,
  weekOf,
} from "../lib/schedule/day.ts";

test("a booked day survives the round trip through storage", () => {
  const day = { year: 2026, month: 8, day: 4 };
  assert.deepEqual(instantToDay(dayToInstant(day)), day);
});

test("the stored instant is UTC midnight, not a local one", () => {
  // A local midnight would be a different *day* in UTC for most of the world,
  // and the visit would show up on Monday for a crew and Tuesday for the boss.
  assert.equal(dayToInstant({ year: 2026, month: 8, day: 4 }).toISOString(), "2026-08-04T00:00:00.000Z");
});

test("a day reads the same whatever timezone the reader is in", () => {
  // Formatting goes through UTC parts, so this holds even when the process
  // timezone is west of UTC, where local formatting would say Aug 3rd.
  const day = instantToDay(new Date("2026-08-04T00:00:00.000Z"));
  assert.equal(formatDayShort(day), "Tue 4 Aug");
  assert.equal(formatDayLong(day), "Tuesday 4 August 2026");
});

test("a date field's value parses, and nonsense does not", () => {
  assert.deepEqual(parseDayInput("2026-08-04"), { year: 2026, month: 8, day: 4 });
  assert.equal(parseDayInput(""), null);
  assert.equal(parseDayInput("04/08/2026"), null);
  assert.equal(parseDayInput("2026-13-01"), null);
});

test("the 31st of February is rejected, not rolled forward to March", () => {
  // JavaScript's own Date would happily make this March 3rd and book the crew
  // for a day nobody chose.
  assert.equal(parseDayInput("2026-02-31"), null);
  assert.equal(parseDayInput("2026-02-30"), null);
  assert.deepEqual(parseDayInput("2028-02-29"), { year: 2028, month: 2, day: 29 });
});

test("a day round-trips back into a date field", () => {
  assert.equal(toDayInput({ year: 2026, month: 8, day: 4 }), "2026-08-04");
  assert.equal(toDayInput({ year: 2026, month: 12, day: 9 }), "2026-12-09");
});

test("a week runs Sunday to Saturday and contains its anchor", () => {
  const week = weekOf({ year: 2026, month: 8, day: 4 });
  assert.equal(week.length, 7);
  assert.equal(formatDayShort(week[0]), "Sun 2 Aug");
  assert.equal(formatDayShort(week[6]), "Sat 8 Aug");
  assert.ok(week.some((day) => isSameDay(day, { year: 2026, month: 8, day: 4 })));
});

test("a week spanning a month boundary still holds seven days", () => {
  const week = weekOf({ year: 2026, month: 12, day: 31 });
  assert.equal(week.length, 7);
  assert.equal(formatDayShort(week[0]), "Sun 27 Dec");
  assert.equal(formatDayShort(week[6]), "Sat 2 Jan");
});

test("stepping a week back across the clocks changing lands on the same weekday", () => {
  // Canada's DST ends 2026-11-01. Elapsed-time arithmetic would land on the
  // Saturday and shift the whole grid by a day.
  const back = shiftDays({ year: 2026, month: 11, day: 3 }, -7);
  assert.deepEqual(back, { year: 2026, month: 10, day: 27 });
  assert.equal(formatDayShort(back), "Tue 27 Oct");
});
