/**
 * Item 43: deciding which quotes have gone quiet.
 *
 * Pure, like `lib/invoice/reminders.ts`, so the spacing rule can be tested
 * without a cron or a clock nobody controls. Only `SENT` or `VIEWED` are ever
 * eligible — the ball has to actually be in the homeowner's court. A `DRAFT`
 * has nobody to nag, and `APPROVED`/`REJECTED`/`CHANGES_REQUESTED`/`EXPIRED`
 * are all already answered in one way or another; reminding on an answered
 * quote would read as not having listened.
 *
 * Two gaps, not one, because a quote and an overdue invoice start from
 * different footing. An invoice's `OVERDUE` status already *means* "late" —
 * the day it becomes eligible is the day it's overdue. A quote's `SENT`
 * status means nothing about lateness on its own; it means "sent a minute
 * ago" just as often as "sent two weeks ago." So the first nudge waits out
 * `QUOTE_QUIET_DAYS` from `sentAt` — long enough that silence reads as
 * silence, not as someone still deciding — and only after that does the
 * familiar `QUOTE_REMINDER_INTERVAL_DAYS` cadence from
 * `lib/invoice/reminders.ts` take over.
 */
import { QuoteStatus } from "@prisma/client";

/** Days of silence from the first send before the first nudge goes out. */
export const QUOTE_QUIET_DAYS = 3;

/** Same cadence as `lib/invoice/reminders.ts` once nudging has started. */
export const QUOTE_REMINDER_INTERVAL_DAYS = 7;

export type QuoteForReminder = {
  status: QuoteStatus;
  sentAt: Date | null;
  lastReminderSentAt: Date | null;
};

export function needsQuoteReminder(quote: QuoteForReminder, now: Date = new Date()): boolean {
  if (quote.status !== QuoteStatus.SENT && quote.status !== QuoteStatus.VIEWED) return false;
  // Never actually sent (shouldn't happen for SENT/VIEWED, but a quote with
  // no sentAt has no "how long has it been" to measure against).
  if (!quote.sentAt) return false;

  const since = quote.lastReminderSentAt ?? quote.sentAt;
  const gateDays = quote.lastReminderSentAt ? QUOTE_REMINDER_INTERVAL_DAYS : QUOTE_QUIET_DAYS;
  const msSince = now.getTime() - since.getTime();
  return msSince >= gateDays * 24 * 60 * 60 * 1000;
}
