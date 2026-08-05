/**
 * Item 38's other half: deciding which overdue invoices get nagged today.
 *
 * Pure, like the rest of `lib/invoice/`, so the spacing rule can be tested
 * without a cron or a clock nobody controls. Only OVERDUE is ever eligible —
 * a `SENT` invoice three days from its due date is not late, it is on time,
 * and reminding somebody about money that isn't due yet reads as dunning
 * rather than billing.
 */
import { InvoiceStatus } from "@prisma/client";

/** A week between reminders. Often enough to matter, rarely enough not to nag. */
export const REMINDER_INTERVAL_DAYS = 7;

export type InvoiceForReminder = {
  status: InvoiceStatus;
  lastReminderSentAt: Date | null;
};

export function needsReminder(invoice: InvoiceForReminder, now: Date = new Date()): boolean {
  if (invoice.status !== InvoiceStatus.OVERDUE) return false;
  if (!invoice.lastReminderSentAt) return true;
  const msSinceLast = now.getTime() - invoice.lastReminderSentAt.getTime();
  return msSinceLast >= REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
}
