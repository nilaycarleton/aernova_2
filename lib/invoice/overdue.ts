/**
 * Catching the invoices that went late while nobody was looking.
 *
 * Every other status change in this product has an event behind it — somebody
 * sent something, somebody paid something. OVERDUE has no event. It happens
 * because a Tuesday turned into a Wednesday, which means the stored status is
 * the one column in the schema that can rot with nothing having been written.
 *
 * So it is swept rather than triggered. One `updateMany`, indexed on
 * `[companyId, dueAt]`, idempotent, run when somebody opens a surface that
 * shows invoice standing. That deliberately trades a background job for a
 * cheap query on a page a contractor opens a few times a day: the alternative
 * is a cron whose failure mode is silent and whose absence in local development
 * makes the whole status untestable by hand.
 *
 * `lib/invoice/balance.ts` derives the same answer purely, and is what anything
 * reading a single invoice should trust. This exists so the *list* can filter
 * and count in SQL without loading every invoice in the company.
 */
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Only SENT and PARTIALLY_PAID can go overdue. A draft was never asked for, a
 * paid one is settled, a void one is cancelled, and one already OVERDUE is
 * already right — narrowing the WHERE this far is what makes the sweep free on
 * the overwhelmingly common case where nothing has changed.
 *
 * `companyId` is optional so the same sweep serves two callers: a page scopes
 * it to the one company open on screen, and the reminder cron — which has no
 * single company in view, only a clock — sweeps every company in one query
 * rather than looping a `findMany` of companies first.
 */
export async function sweepOverdueInvoices(
  companyId?: string,
  now: Date = new Date()
): Promise<number> {
  const { count } = await prisma.invoice.updateMany({
    where: {
      ...(companyId ? { companyId } : {}),
      status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID] },
      dueAt: { not: null, lt: now },
    },
    data: { status: InvoiceStatus.OVERDUE },
  });
  return count;
}
