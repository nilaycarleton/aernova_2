/**
 * What is still owed, and whether it is late.
 *
 * The counterpart to `lib/quote/totals.ts`, and pure for the same reason: this
 * is the number a contractor chases somebody for, and the number a homeowner
 * checks against their bank. Rows in, figures out, no database in sight, so it
 * can be tested to the cent.
 *
 * The invoice's own money columns are never recomputed here. A quote's total
 * moves while it is being written; an invoice's total is what was billed, and
 * `lib/invoice/from-quote.ts` fixes it once at creation. This file only ever
 * subtracts payments from it.
 */
import { InvoiceStatus } from "@prisma/client";
import type { Cents } from "../money.ts";

/** The shape the balance needs. Deliberately narrower than the Prisma row. */
export type PaymentForBalance = { amountCents: number };

export type InvoiceBalance = {
  totalCents: Cents;
  paidCents: Cents;
  /**
   * Total less paid. **Can be negative**, and is left that way on purpose: a
   * homeowner who rounds $1,847.30 up to $1,850 is owed $2.70, and clamping
   * that to zero would quietly turn a credit the contractor has to settle into
   * an invoice that looks tidy.
   */
  balanceCents: Cents;
  isPaid: boolean;
  isOverdue: boolean;
  /** Whole days past due, or null when it isn't. Never negative. */
  overdueDays: number | null;
};

export function sumPayments(payments: PaymentForBalance[]): Cents {
  return payments.reduce((sum, payment) => sum + payment.amountCents, 0);
}

/**
 * A zero-total invoice counts as paid — there is nothing to collect, and an
 * invoice for $0.00 sitting in "awaiting payment" forever is a false alarm on a
 * list whose whole job is telling a contractor what to chase.
 */
export function invoiceBalance(
  totalCents: number,
  payments: PaymentForBalance[],
  options: {
    status?: InvoiceStatus;
    dueAt?: Date | null;
    now?: Date;
  } = {}
): InvoiceBalance {
  const paidCents = sumPayments(payments);
  const balanceCents = totalCents - paidCents;
  const isPaid = balanceCents <= 0;

  const { status, dueAt } = options;
  const now = options.now ?? new Date();

  // Three things have to be true before "late" is a fair word. There is money
  // outstanding; there is a date it was due by; and somebody was actually asked
  // for it — a draft nobody has sent is not late, it is unfinished, and a
  // product that scolds a contractor for their own unsent paperwork gets its
  // overdue list ignored.
  const wasAskedFor = status !== InvoiceStatus.DRAFT && status !== InvoiceStatus.VOID;
  const overdue = !isPaid && dueAt != null && now.getTime() > dueAt.getTime() && wasAskedFor;

  return {
    totalCents,
    paidCents,
    balanceCents,
    isPaid,
    isOverdue: overdue,
    overdueDays: overdue
      ? Math.floor((now.getTime() - dueAt!.getTime()) / 86_400_000)
      : null,
  };
}

/** The narrow shape `deriveInvoiceStatus` reads. */
export type InvoiceForStatus = {
  status: InvoiceStatus;
  totalAmountCents: number;
  dueAt: Date | null;
};

/**
 * The status column, recomputed from the money.
 *
 * Only DRAFT and VOID are ever a person's decision, and both of them win over
 * the arithmetic: a voided invoice does not become PAID because a payment was
 * recorded against it before it was cancelled, and a draft does not announce
 * itself as SENT because a deposit came in early. Everything else falls out of
 * what has been paid and when it was due, which is what keeps a status badge
 * from ever disagreeing with the figure printed beside it.
 *
 * Called on every write that could move the balance, and its result stored on
 * the row. `OVERDUE` is the one that also goes stale with nothing but the clock
 * — see `lib/invoice/overdue.ts` for the sweep that catches those.
 */
export function deriveInvoiceStatus(
  invoice: InvoiceForStatus,
  paidCents: number,
  now: Date = new Date()
): InvoiceStatus {
  if (invoice.status === InvoiceStatus.VOID) return InvoiceStatus.VOID;
  if (invoice.status === InvoiceStatus.DRAFT) return InvoiceStatus.DRAFT;

  if (paidCents >= invoice.totalAmountCents) return InvoiceStatus.PAID;

  // Late outranks part-paid. Half of a re-roof paid three weeks after the due
  // date is a phone call the contractor has to make, and a badge reading
  // "Part paid" does not prompt one.
  if (invoice.dueAt != null && now.getTime() > invoice.dueAt.getTime()) {
    return InvoiceStatus.OVERDUE;
  }

  if (paidCents > 0) return InvoiceStatus.PARTIALLY_PAID;

  return InvoiceStatus.SENT;
}
