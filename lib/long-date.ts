/**
 * docs/AERNOVA_PROJECT_WORKFLOW.md §14.4/§20/§25 Phase 10 — the date format
 * meant to "outlive the transaction that created it": a long month name, a
 * day, a full year, never a time of day, never a relative phrasing like
 * "3 days ago." A relative date reads fine the week it's written and stops
 * meaning anything the moment the page is reopened years later on a
 * warranty claim.
 *
 * Every call site that needs this format routes through this one function
 * — including on the public warranty page — so a future locale system only
 * ever has to change what's passed as `locale` here, never rewrite how each
 * caller formats a date by hand. `locale` defaults to English today because
 * v1 ships English long dates only (Assumption 13); nothing about the
 * implementation hardcodes that as a ceiling.
 */
export function longDate(value: Date | string | null | undefined, locale = "en-US"): string | null {
  if (!value) return null;
  // A bare "YYYY-MM-DD" string (e.g. a date-input value) has no time
  // component and parses as UTC midnight — formatting it in a
  // negative-UTC-offset local timezone would roll it back a calendar day.
  // It names a day, not an instant, so it's shown as written, in UTC.
  const dateOnly = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(dateOnly ? { timeZone: "UTC" } : {}),
  }).format(date);
}
