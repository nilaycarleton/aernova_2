import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CANADIAN_TIME_ZONES,
  formatTimeOfDay,
  isValidTimeZone,
  parseTimeInput,
  toTimeInput,
  utcToZoned,
  visitCalendarDay,
  zonedTimeToUtc,
} from "../lib/schedule/timezone.ts";

const VANCOUVER = "America/Vancouver";

test("an 8am Vancouver visit is 3pm UTC in the summer (PDT, UTC-7)", () => {
  const instant = zonedTimeToUtc({ year: 2026, month: 7, day: 14 }, 8 * 60, VANCOUVER);
  assert.equal(instant.toISOString(), "2026-07-14T15:00:00.000Z");
});

test("the same 8am is 4pm UTC in the winter (PST, UTC-8)", () => {
  const instant = zonedTimeToUtc({ year: 2026, month: 12, day: 14 }, 8 * 60, VANCOUVER);
  assert.equal(instant.toISOString(), "2026-12-14T16:00:00.000Z");
});

test("round-trips through storage and back to the same day and minute", () => {
  const date = { year: 2026, month: 3, day: 22 };
  const minutes = 9 * 60 + 30;
  const instant = zonedTimeToUtc(date, minutes, VANCOUVER);
  const back = utcToZoned(instant, VANCOUVER);
  assert.deepEqual(back.date, date);
  assert.equal(back.minutes, minutes);
});

test("an 8am booking stays 8am across the DST week, not shifted by an hour", () => {
  // Canada's DST ends 2026-11-01 — see tests/recurrence.test.ts. A booking
  // made for the Tuesday before and the Tuesday after must both read 8am
  // locally, even though the UTC offset changed under them.
  const before = zonedTimeToUtc({ year: 2026, month: 10, day: 27 }, 8 * 60, VANCOUVER);
  const after = zonedTimeToUtc({ year: 2026, month: 11, day: 3 }, 8 * 60, VANCOUVER);
  assert.equal(utcToZoned(before, VANCOUVER).minutes, 8 * 60);
  assert.equal(utcToZoned(after, VANCOUVER).minutes, 8 * 60);
});

test("a late Vancouver visit can be tomorrow in UTC without being tomorrow locally", () => {
  const instant = zonedTimeToUtc({ year: 2026, month: 7, day: 14 }, 23 * 60, VANCOUVER);
  assert.equal(instant.toISOString(), "2026-07-15T06:00:00.000Z");
  assert.deepEqual(visitCalendarDay({ startAt: instant, allDay: false }, VANCOUVER), {
    year: 2026,
    month: 7,
    day: 14,
  });
});

test("an all-day visit reads its UTC parts regardless of zone", () => {
  const instant = new Date(Date.UTC(2026, 6, 14));
  assert.deepEqual(visitCalendarDay({ startAt: instant, allDay: true }, VANCOUVER), {
    year: 2026,
    month: 7,
    day: 14,
  });
  // Even with no zone set at all.
  assert.deepEqual(visitCalendarDay({ startAt: instant, allDay: true }, null), {
    year: 2026,
    month: 7,
    day: 14,
  });
});

test("a timed visit falls back to its UTC day when no zone is set yet", () => {
  const instant = new Date(Date.UTC(2026, 6, 15, 6, 0));
  assert.deepEqual(visitCalendarDay({ startAt: instant, allDay: false }, null), {
    year: 2026,
    month: 7,
    day: 15,
  });
});

test("a real IANA zone is valid, junk is not", () => {
  assert.equal(isValidTimeZone("America/Vancouver"), true);
  assert.equal(isValidTimeZone("Nowhere/Fake"), false);
  assert.equal(isValidTimeZone(""), false);
});

test("every offered Canadian zone is one Intl actually recognises", () => {
  for (const zone of CANADIAN_TIME_ZONES) {
    assert.equal(isValidTimeZone(zone.value), true, zone.value);
  }
});

test("time input parses HH:MM to minutes and rejects junk", () => {
  assert.equal(parseTimeInput("08:00"), 480);
  assert.equal(parseTimeInput("23:59"), 1439);
  assert.equal(parseTimeInput("24:00"), null);
  assert.equal(parseTimeInput("not a time"), null);
});

test("minutes round-trip through the time input format", () => {
  assert.equal(toTimeInput(480), "08:00");
  assert.equal(toTimeInput(1439), "23:59");
});

test("time of day reads the way a contractor would say it", () => {
  assert.equal(formatTimeOfDay(0), "12am");
  assert.equal(formatTimeOfDay(9 * 60), "9am");
  assert.equal(formatTimeOfDay(9 * 60 + 30), "9:30am");
  assert.equal(formatTimeOfDay(13 * 60), "1pm");
});
