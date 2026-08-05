"use server";

import { ActivityKind, InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

/**
 * They opened it.
 *
 * `status: SENT` in the WHERE rather than just `viewedAt: null` — the same
 * guard `markQuoteViewed` carries, for the same reason: a homeowner who pays
 * and then re-opens the link to check must not have that fact overwritten by
 * the act of reading it again. Only an invoice sitting in "awaiting payment"
 * has anywhere to move.
 *
 * There is no matching status for "part paid and viewed again", and there does
 * not need to be. The question this answers is only ever asked once — *have
 * they even seen it* — and it is asked on the day the contractor is deciding
 * whether to chase the link or chase the money.
 */
export async function markInvoiceViewed(invoiceId: string): Promise<void> {
  const updated = await prisma.invoice.updateMany({
    where: { id: invoiceId, viewedAt: null, status: InvoiceStatus.SENT },
    data: { viewedAt: new Date() },
  });
  if (updated.count === 0) return;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { companyId: true, jobId: true, invoiceNumber: true },
  });
  if (!invoice) return;

  await recordActivity({
    companyId: invoice.companyId,
    jobId: invoice.jobId,
    kind: ActivityKind.INVOICE_VIEWED,
    actorLabel: "The client",
    meta: { invoiceId, invoiceNumber: invoice.invoiceNumber ?? undefined },
  });
}
