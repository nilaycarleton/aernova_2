/**
 * The schedule, as a calendar app wants to read it.
 *
 * RFC 5545. Pure text in, pure text out, so the fiddly parts — escaping,
 * folding, all-day date semantics — are testable without a request.
 *
 * The reason this exists at all is a negative finding from Jobber's own docs
 * (PLAN-CRM.md item 34): their "calendar integration" is not an integration.
 * No Google OAuth, no Calendar API, no per-provider code. One feed at an
 * unguessable URL, and the contractor subscribes to it from whatever app they
 * already use. Google, Apple, Outlook, Thunderbird — same URL for all of them.
 */

/** An all-day visit, ready to become one VEVENT. */
export type IcsEvent = {
  /** Stable and globally unique. A visit's id; never regenerated. */
  uid: string;
  /** The day it happens, as `{year, month, day}` in the company's reckoning. */
  start: { year: number; month: number; day: number };
  summary: string;
  location?: string | null;
  description?: string | null;
  /** Cancelled visits are published as cancelled, not silently dropped. */
  cancelled?: boolean;
  /** Last change, so a re-subscribing app can tell what moved. */
  updatedAt: Date;
};

/**
 * Escape a value for a text field.
 *
 * Backslash first, or every escape this function adds gets escaped again. A
 * comma is a list separator in iCalendar, so "Smith, J." unescaped becomes two
 * values and half the address vanishes from the crew's phone.
 */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold a line to 75 octets, continuations indented by one space.
 *
 * Counted in **octets, not characters** — an address with an accent or a dash
 * a client pasted in from Word is multi-byte, and folding on character count
 * splits it mid-codepoint and produces mojibake on the phone. The fold never
 * lands inside a character for the same reason.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const out: string[] = [];
  let current = "";
  let bytes = 0;
  // A continuation line's leading space costs one of its 75 octets.
  let limit = 75;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      out.push(current);
      current = char;
      bytes = size;
      limit = 74;
    } else {
      current += char;
      bytes += size;
    }
  }
  if (current) out.push(current);
  return out.join("\r\n ");
}

function dateValue(date: { year: number; month: number; day: number }): string {
  return `${date.year}${String(date.month).padStart(2, "0")}${String(date.day).padStart(2, "0")}`;
}

function timestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function addDay(date: { year: number; month: number; day: number }) {
  const stepped = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
  return {
    year: stepped.getUTCFullYear(),
    month: stepped.getUTCMonth() + 1,
    day: stepped.getUTCDate(),
  };
}

export function buildCalendar(options: {
  /** Shown as the calendar's name in the app that subscribes to it. */
  name: string;
  events: IcsEvent[];
}): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aernova//Schedule//EN",
    "CALSCALE:GREGORIAN",
    // Publish, not request: nobody is being invited and there is nothing to
    // RSVP to. A crew's calendar should never sprout Accept/Decline buttons.
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(options.name)}`,
    // A hint, not a promise. Google honours its own cadence regardless (~12h),
    // Apple as often as every 5 minutes — see PLAN-CRM item 34.
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];

  for (const event of options.events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${timestamp(event.updatedAt)}`,
      // All-day. DTEND is *exclusive* in iCalendar, so a one-day visit ends the
      // following day — set it to the same day and half the calendar apps
      // render a zero-length event that never appears.
      `DTSTART;VALUE=DATE:${dateValue(event.start)}`,
      `DTEND;VALUE=DATE:${dateValue(addDay(event.start))}`,
      `SUMMARY:${escapeText(event.summary)}`
    );
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.cancelled) lines.push("STATUS:CANCELLED");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  // CRLF throughout, per the spec. Outlook in particular is unforgiving here.
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
