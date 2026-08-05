import assert from "node:assert/strict";
import { test } from "node:test";
import { InvoiceStatus } from "@prisma/client";
import {
  deriveInvoiceStatus,
  invoiceBalance,
  sumPayments,
} from "../lib/invoice/balance.ts";

const MARCH = new Date("2026-03-01T12:00:00Z");
const APRIL = new Date("2026-04-01T12:00:00Z");
const MAY = new Date("2026-05-01T12:00:00Z");

// A $7,500 re-roof plus 13% HST, invoiced 50/50 — the shape the plan names.
const TOTAL = 847_500;

test("payments sum and subtract to the cent", () => {
  assert.equal(sumPayments([]), 0);
  const b = invoiceBalance(TOTAL, [{ amountCents: 423_750 }]);
  assert.equal(b.paidCents, 423_750);
  assert.equal(b.balanceCents, 423_750, "half of $8,475.00");
  assert.equal(b.isPaid, false);
});

test("two partial payments settle it", () => {
  const b = invoiceBalance(TOTAL, [{ amountCents: 423_750 }, { amountCents: 423_750 }]);
  assert.equal(b.balanceCents, 0);
  assert.equal(b.isPaid, true);
});

test("an overpayment leaves a negative balance rather than a tidy zero", () => {
  // $1,847.30 rounded up to $1,850 at the kitchen table. The contractor owes
  // $2.70 back, and an invoice that clamped this to zero would hide that.
  const b = invoiceBalance(184_730, [{ amountCents: 185_000 }]);
  assert.equal(b.balanceCents, -270);
  assert.equal(b.isPaid, true);
});

test("a zero-total invoice is paid, not perpetually awaiting payment", () => {
  const b = invoiceBalance(0, []);
  assert.equal(b.isPaid, true);
  assert.equal(b.isOverdue, false);
});

test("late means owing, past due, and actually sent", () => {
  const sent = { status: InvoiceStatus.SENT, dueAt: MARCH, now: APRIL };
  assert.equal(invoiceBalance(TOTAL, [], sent).isOverdue, true);
  assert.equal(invoiceBalance(TOTAL, [], sent).overdueDays, 31);

  // Paid in full — not late, whatever the date says.
  assert.equal(
    invoiceBalance(TOTAL, [{ amountCents: TOTAL }], sent).isOverdue,
    false
  );

  // No due date is not the same as due immediately.
  assert.equal(
    invoiceBalance(TOTAL, [], { ...sent, dueAt: null }).isOverdue,
    false
  );

  // A draft nobody sent is unfinished paperwork, never late.
  assert.equal(
    invoiceBalance(TOTAL, [], { ...sent, status: InvoiceStatus.DRAFT }).isOverdue,
    false
  );

  // Still inside the term.
  assert.equal(
    invoiceBalance(TOTAL, [], { status: InvoiceStatus.SENT, dueAt: MAY, now: APRIL })
      .isOverdue,
    false
  );
});

test("overdueDays is null when it isn't late, never a negative number", () => {
  const b = invoiceBalance(TOTAL, [], {
    status: InvoiceStatus.SENT,
    dueAt: MAY,
    now: APRIL,
  });
  assert.equal(b.overdueDays, null);
});

const sentInvoice = { status: InvoiceStatus.SENT, totalAmountCents: TOTAL, dueAt: MARCH };

test("a person's DRAFT and VOID outrank the arithmetic", () => {
  assert.equal(
    deriveInvoiceStatus({ ...sentInvoice, status: InvoiceStatus.DRAFT }, TOTAL, APRIL),
    InvoiceStatus.DRAFT,
    "a deposit taken early does not send an unfinished invoice"
  );
  assert.equal(
    deriveInvoiceStatus({ ...sentInvoice, status: InvoiceStatus.VOID }, TOTAL, APRIL),
    InvoiceStatus.VOID,
    "a cancelled invoice does not become paid"
  );
});

test("paid in full beats late", () => {
  assert.equal(deriveInvoiceStatus(sentInvoice, TOTAL, APRIL), InvoiceStatus.PAID);
  assert.equal(
    deriveInvoiceStatus(sentInvoice, TOTAL + 500, APRIL),
    InvoiceStatus.PAID,
    "an overpayment is still paid"
  );
});

test("late beats part paid — the late half is the half to act on", () => {
  assert.equal(
    deriveInvoiceStatus(sentInvoice, 423_750, APRIL),
    InvoiceStatus.OVERDUE
  );
  assert.equal(
    deriveInvoiceStatus({ ...sentInvoice, dueAt: MAY }, 423_750, APRIL),
    InvoiceStatus.PARTIALLY_PAID
  );
});

test("nothing paid, nothing late, is still awaiting payment", () => {
  assert.equal(
    deriveInvoiceStatus({ ...sentInvoice, dueAt: null }, 0, APRIL),
    InvoiceStatus.SENT
  );
});
