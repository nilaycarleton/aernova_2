import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCalendar, escapeText, foldLine, type IcsEvent } from "../lib/schedule/ics.ts";

const AT = new Date("2026-07-30T12:00:00.000Z");

function event(over: Partial<IcsEvent> = {}): IcsEvent {
  return {
    uid: "visit_abc",
    start: { year: 2026, month: 8, day: 4 },
    summary: "36 Wetherby",
    updatedAt: AT,
    ...over,
  };
}

test("a comma survives, because it is a list separator in iCalendar", () => {
  // Unescaped, "Smith, J." becomes two values and half of it disappears off
  // the crew's phone.
  assert.equal(escapeText("36 Wetherby, Toronto, ON"), "36 Wetherby\\, Toronto\\, ON");
});

test("a backslash is escaped first, or it escapes the escapes", () => {
  assert.equal(escapeText("a\\b;c"), "a\\\\b\\;c");
});

test("a newline becomes the two-character escape, never a real break", () => {
  // A raw newline inside a value ends the property and corrupts everything
  // after it in the file.
  assert.equal(escapeText("line one\nline two"), "line one\\nline two");
  assert.equal(escapeText("crlf\r\nhere"), "crlf\\nhere");
});

test("a short line is left alone", () => {
  assert.equal(foldLine("SUMMARY:36 Wetherby"), "SUMMARY:36 Wetherby");
});

test("a long line folds with a leading space on every continuation", () => {
  const folded = foldLine("DESCRIPTION:" + "x".repeat(200));
  const parts = folded.split("\r\n");
  assert.ok(parts.length > 1, "it folded");
  assert.ok(parts.slice(1).every((part) => part.startsWith(" ")), "continuations are indented");
  // Unfolding is: remove every CRLF *and the single space that follows it*.
  assert.equal(folded.replace(/\r\n /g, ""), "DESCRIPTION:" + "x".repeat(200));
});

test("folding counts octets, not characters", () => {
  // An address pasted from Word carries en-dashes and accents. Folding on
  // character count splits a multi-byte character and produces mojibake.
  const line = "LOCATION:" + "é".repeat(60);
  for (const part of foldLine(line).split("\r\n")) {
    assert.ok(new TextEncoder().encode(part).length <= 75, `"${part.slice(0, 12)}…" is within 75 octets`);
  }
  assert.ok(!foldLine(line).includes("�"), "no replacement characters");
});

test("an all-day visit ends the following day, because DTEND is exclusive", () => {
  // Set DTEND to the same day and a good half of calendar apps render a
  // zero-length event that simply never appears.
  const ics = buildCalendar({ name: "Aernova", events: [event()] });
  assert.match(ics, /DTSTART;VALUE=DATE:20260804/);
  assert.match(ics, /DTEND;VALUE=DATE:20260805/);
});

test("a visit on the last day of a month rolls the end into the next", () => {
  const ics = buildCalendar({ name: "Aernova", events: [event({ start: { year: 2026, month: 8, day: 31 } })] });
  assert.match(ics, /DTSTART;VALUE=DATE:20260831/);
  assert.match(ics, /DTEND;VALUE=DATE:20260901/);
});

test("the file is CRLF throughout and closes its blocks", () => {
  const ics = buildCalendar({ name: "Aernova", events: [event()] });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 1);
  assert.equal((ics.match(/END:VEVENT/g) ?? []).length, 1);
  assert.ok(!/[^\r]\n/.test(ics), "every LF is preceded by a CR");
});

test("it publishes rather than invites", () => {
  // METHOD:REQUEST would sprout Accept/Decline buttons on a crew's phone for
  // work they are not being asked to agree to.
  const ics = buildCalendar({ name: "Aernova", events: [event()] });
  assert.match(ics, /METHOD:PUBLISH/);
  assert.ok(!ics.includes("METHOD:REQUEST"));
});

test("a cancelled visit is published as cancelled, not dropped", () => {
  // Dropping it leaves the old event sitting on a crew's phone forever.
  const ics = buildCalendar({ name: "Aernova", events: [event({ cancelled: true })] });
  assert.match(ics, /STATUS:CANCELLED/);
});

test("location and description are optional and omitted when absent", () => {
  const ics = buildCalendar({ name: "Aernova", events: [event({ location: null, description: null })] });
  assert.ok(!ics.includes("LOCATION:"));
  assert.ok(!ics.includes("DESCRIPTION:"));
});

test("an empty schedule is still a valid calendar", () => {
  // A contractor with a quiet week must get an empty calendar, not a 500 —
  // the subscription has to survive the gaps or it stops updating.
  const ics = buildCalendar({ name: "Aernova", events: [] });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.ok(!ics.includes("BEGIN:VEVENT"));
});

test("the calendar's own name is escaped too", () => {
  const ics = buildCalendar({ name: "Bell, Roofing & Co", events: [] });
  assert.match(ics, /X-WR-CALNAME:Bell\\, Roofing & Co/);
});
