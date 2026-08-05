import assert from "node:assert/strict";
import { test } from "node:test";
import { InvoiceStatus } from "@prisma/client";
import { needsReminder, REMINDER_INTERVAL_DAYS } from "../lib/invoice/reminders.ts";

const NOW = new Date("2026-08-02T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

test("a draft or sent-on-time invoice is never reminded", () => {
  for (const status of [InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.PAID, InvoiceStatus.VOID]) {
    assert.equal(needsReminder({ status, lastReminderSentAt: null }, NOW), false, status);
  }
});

test("a fresh overdue invoice with no reminder yet is eligible immediately", () => {
  assert.equal(
    needsReminder({ status: InvoiceStatus.OVERDUE, lastReminderSentAt: null }, NOW),
    true
  );
});

test("an overdue invoice reminded yesterday is not reminded again today", () => {
  const yesterday = new Date(NOW.getTime() - DAY_MS);
  assert.equal(
    needsReminder({ status: InvoiceStatus.OVERDUE, lastReminderSentAt: yesterday }, NOW),
    false
  );
});

test("exactly one interval later, it's eligible again", () => {
  const exactlyOneIntervalAgo = new Date(NOW.getTime() - REMINDER_INTERVAL_DAYS * DAY_MS);
  assert.equal(
    needsReminder({ status: InvoiceStatus.OVERDUE, lastReminderSentAt: exactlyOneIntervalAgo }, NOW),
    true
  );
});

test("a day short of the interval is not eligible yet", () => {
  const almost = new Date(NOW.getTime() - (REMINDER_INTERVAL_DAYS * DAY_MS - DAY_MS));
  assert.equal(
    needsReminder({ status: InvoiceStatus.OVERDUE, lastReminderSentAt: almost }, NOW),
    false
  );
});
