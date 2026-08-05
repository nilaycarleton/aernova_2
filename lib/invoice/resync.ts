/**
 * Putting the invoice's cached money back in step with its payments.
 *
 * `Invoice.amountPaidCents` and `Invoice.status` are both caches — the
 * `InvoicePayment` rows are the truth, and `lib/invoice/balance.ts` is the
 * arithmetic. This is the one function allowed to write either of them, called
 * from inside the same transaction as whatever moved the money. One writer
 * means a status can never drift from the payments underneath it, which is the
 * failure a contractor would discover while arguing with a homeowner.
 *
 * Returns what it computed, so the caller can record the activity line without
 * a second read.
 */
import type { Prisma } from "@prisma/client";
import { InvoiceStatus } from "@prisma/client";
import { deriveInvoiceStatus, sumPayments } from "./balance.ts";

export type ResyncResult = {
  paidCents: number;
  balanceCents: number;
  status: InvoiceStatus;
  /** True when this write is the one that settled it. Fires once, ever. */
  justPaid: boolean;
};

export async function resyncInvoiceMoney(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  now: Date = new Date()
): Promise<ResyncResult> {
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: {
      status: true,
      totalAmountCents: true,
      dueAt: true,
      paidAt: true,
      payments: { select: { amountCents: true } },
    },
  });

  const paidCents = sumPayments(invoice.payments);
  const status = deriveInvoiceStatus(invoice, paidCents, now);
  // `paidAt` is set once and never moved. A homeowner who overpays and gets $2
  // refunded should not reset the date their roof was paid for, and a status
  // that walks back out of PAID has to leave the original date behind it.
  const justPaid = status === InvoiceStatus.PAID && invoice.paidAt === null;

  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaidCents: paidCents,
      status,
      ...(justPaid ? { paidAt: now } : {}),
    },
  });

  return {
    paidCents,
    balanceCents: invoice.totalAmountCents - paidCents,
    status,
    justPaid,
  };
}
