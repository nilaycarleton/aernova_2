import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageCapability } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { ReportsNav } from "@/components/dashboard/reports-nav";
import { agedReceivables } from "@/lib/reports/aged-receivables";

/**
 * Item 47: what is owed right now, and how late it is. Unlike `/reports` and
 * `/reports/revenue`, this page has no date-range filter — an overdue
 * invoice from eight months ago is still money outstanding today, and a
 * range that hid it would be a range that lies about what's owed.
 *
 * DRAFT and VOID are excluded before this page's own arithmetic ever sees
 * them, same filter `/reports/revenue` applies to the same statuses — a
 * draft nobody has sent is not a receivable, and a voided invoice was
 * withdrawn, not left unpaid.
 */
export default async function AgedReceivablesPage() {
  const { company } = await requirePageCapability("viewMoney");

  const invoices = await prisma.invoice.findMany({
    where: { companyId: company.id, status: { notIn: ["DRAFT", "VOID"] } },
    select: {
      totalAmountCents: true,
      status: true,
      dueAt: true,
      payments: { select: { amountCents: true } },
    },
  });

  const { rows, totalCents } = agedReceivables(invoices);
  const hasAnyOutstanding = totalCents > 0;

  return (
    <div className="min-w-0 space-y-8">
      <header className="min-w-0">
        <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">Reports</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink-primary">Aged receivables</h2>
        <p className="mt-2 max-w-2xl text-ink-muted">
          What&rsquo;s still owed across every sent invoice, and how long it&rsquo;s been waiting.
        </p>
      </header>

      <ReportsNav current="/reports/aged-receivables" />

      {!hasAnyOutstanding ? (
        <div className="rounded-3xl border border-dashed border-hairline p-10 text-center">
          <p className="text-ink-secondary">Nothing outstanding right now.</p>
          <Link
            href="/invoices"
            className="mt-5 inline-block rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            See invoices
          </Link>
        </div>
      ) : (
        <>
          <section className="rounded-3xl border border-hairline bg-surface-raised p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Outstanding</p>
            <p className="mt-2 text-5xl font-semibold tabular-nums text-instrument-fg">
              {formatMoney(totalCents)}
            </p>
          </section>

          <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
            <h3 className="text-lg font-semibold text-ink-primary">By age</h3>
            <ul className="mt-4 divide-y divide-hairline">
              {rows.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span
                    className={`text-sm ${row.key === "60+" && row.count > 0 ? "text-danger-fg" : "text-ink-primary"}`}
                  >
                    {row.label}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-ink-secondary">
                    {formatMoney(row.cents)}
                    {row.count > 0 ? ` · ${row.count} ${row.count === 1 ? "invoice" : "invoices"}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
