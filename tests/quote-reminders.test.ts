import assert from "node:assert/strict";
import { test } from "node:test";
import { QuoteStatus } from "@prisma/client";
import {
  needsQuoteReminder,
  QUOTE_QUIET_DAYS,
  QUOTE_REMINDER_INTERVAL_DAYS,
} from "../lib/quote/reminders.ts";

const NOW = new Date("2026-08-03T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

test("a quote that isn't SENT or VIEWED is never reminded", () => {
  for (const status of [
    QuoteStatus.DRAFT,
    QuoteStatus.CHANGES_REQUESTED,
    QuoteStatus.APPROVED,
    QuoteStatus.REJECTED,
    QuoteStatus.EXPIRED,
  ]) {
    assert.equal(
      needsQuoteReminder({ status, sentAt: new Date(NOW.getTime() - 30 * DAY_MS), lastReminderSentAt: null }, NOW),
      false,
      status
    );
  }
});

test("a SENT quote with no sentAt at all is never reminded", () => {
  assert.equal(
    needsQuoteReminder({ status: QuoteStatus.SENT, sentAt: null, lastReminderSentAt: null }, NOW),
    false
  );
});

test("a quote sent a day ago is too fresh for the first nudge", () => {
  const yesterday = new Date(NOW.getTime() - DAY_MS);
  assert.equal(
    needsQuoteReminder({ status: QuoteStatus.SENT, sentAt: yesterday, lastReminderSentAt: null }, NOW),
    false
  );
});

test("exactly QUOTE_QUIET_DAYS after sending, the first nudge is eligible", () => {
  const exactlyQuietDaysAgo = new Date(NOW.getTime() - QUOTE_QUIET_DAYS * DAY_MS);
  assert.equal(
    needsQuoteReminder(
      { status: QuoteStatus.SENT, sentAt: exactlyQuietDaysAgo, lastReminderSentAt: null },
      NOW
    ),
    true
  );
});

test("a VIEWED quote is eligible on the same schedule as SENT", () => {
  const exactlyQuietDaysAgo = new Date(NOW.getTime() - QUOTE_QUIET_DAYS * DAY_MS);
  assert.equal(
    needsQuoteReminder(
      { status: QuoteStatus.VIEWED, sentAt: exactlyQuietDaysAgo, lastReminderSentAt: null },
      NOW
    ),
    true
  );
});

test("nudged yesterday is not nudged again today", () => {
  const longAgo = new Date(NOW.getTime() - 30 * DAY_MS);
  const yesterday = new Date(NOW.getTime() - DAY_MS);
  assert.equal(
    needsQuoteReminder(
      { status: QuoteStatus.SENT, sentAt: longAgo, lastReminderSentAt: yesterday },
      NOW
    ),
    false
  );
});

test("exactly one interval after the last nudge, it's eligible again", () => {
  const longAgo = new Date(NOW.getTime() - 60 * DAY_MS);
  const exactlyOneIntervalAgo = new Date(NOW.getTime() - QUOTE_REMINDER_INTERVAL_DAYS * DAY_MS);
  assert.equal(
    needsQuoteReminder(
      { status: QuoteStatus.SENT, sentAt: longAgo, lastReminderSentAt: exactlyOneIntervalAgo },
      NOW
    ),
    true
  );
});

test("a day short of the interval since the last nudge is not eligible yet", () => {
  const longAgo = new Date(NOW.getTime() - 60 * DAY_MS);
  const almost = new Date(NOW.getTime() - (QUOTE_REMINDER_INTERVAL_DAYS * DAY_MS - DAY_MS));
  assert.equal(
    needsQuoteReminder(
      { status: QuoteStatus.SENT, sentAt: longAgo, lastReminderSentAt: almost },
      NOW
    ),
    false
  );
});
