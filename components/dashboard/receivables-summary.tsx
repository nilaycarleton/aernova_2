import Link from "next/link";
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { agedReceivables } from "@/lib/reports/aged-receivables";
import { formatMoney } from "@/lib/money";

/**
 * What's owed, and how late it is — item 47's `/reports/aged-receivables`
 * math, read for a dashboard glance rather than the full report page. A
 * quoted job is hoped-for money; an overdue invoice is money already earned
 * and unpaid, which is why this sits beside the open-quote-value readout
 * rather than folded into "revenue" somewhere.
 *
 * `payments` is a single synthetic row carrying the invoice's own cached
 * `amountPaidCents` rather than a join to InvoicePayment — agedReceivables()
 * only ever sums the array, so one row totaling the same cents is exact, and
 * cheaper than loading every payment in the company to add them back up.
 */
export async function ReceivablesSummary({ companyId }: { companyId: string }) {
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.VOID] },
    },
    select: { totalAmountCents: true, amountPaidCents: true, status: true, dueAt: true },
  });

  const { rows, totalCents } = agedReceivables(
    invoices.map((invoice) => ({
      totalAmountCents: invoice.totalAmountCents,
      payments: [{ amountCents: invoice.amountPaidCents }],
      status: invoice.status,
      dueAt: invoice.dueAt,
    }))
  );

  const overdueCents = totalCents - (rows.find((row) => row.key === "current")?.cents ?? 0);

  return (
    <section className="min-w-0 rounded-lg border border-hairline bg-surface-raised p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Money owed</p>

      {totalCents === 0 ? (
        <p className="mt-2 text-2xl font-semibold text-ink-muted">Nothing outstanding</p>
      ) : (
        <>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-ink-primary">
            {formatMoney(totalCents)}
          </p>
          <p className="mt-2 text-sm text-ink-secondary">
            {overdueCents > 0 ? (
              <span className="text-caution-fg">{formatMoney(overdueCents)} overdue</span>
            ) : (
              "None of it overdue yet"
            )}
          </p>
        </>
      )}

      <Link
        href="/reports/aged-receivables"
        className="mt-4 inline-block text-sm font-medium text-ink-primary underline underline-offset-4 transition hover:text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
      >
        See the full breakdown
      </Link>
    </section>
  );
}
