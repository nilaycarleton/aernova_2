import Link from "next/link";
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";

const WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Billed in the last 30 days against the 30 days before that — a rolling
 * comparison, not calendar months. Matches `lib/date-range.ts`'s own stated
 * doctrine ("three windows, not six... a fourth option is a fourth decision
 * before any answer appears") rather than introducing a new calendar-month
 * boundary that would need to reckon with Company.timeZone to be correct.
 * "Revenue" means invoiced, same definition `/reports/revenue` uses — what
 * was billed, not what's actually landed (that's the Money Owed tile).
 */
export async function RevenueTrendSummary({ companyId }: { companyId: string }) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * MS_PER_DAY);
  const priorStart = new Date(now.getTime() - 2 * WINDOW_DAYS * MS_PER_DAY);

  const notDraftOrVoid = { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.VOID] };

  const [current, prior] = await Promise.all([
    prisma.invoice.aggregate({
      _sum: { totalAmountCents: true },
      where: { companyId, status: notDraftOrVoid, createdAt: { gte: windowStart } },
    }),
    prisma.invoice.aggregate({
      _sum: { totalAmountCents: true },
      where: { companyId, status: notDraftOrVoid, createdAt: { gte: priorStart, lt: windowStart } },
    }),
  ]);

  const currentCents = current._sum.totalAmountCents ?? 0;
  const priorCents = prior._sum.totalAmountCents ?? 0;

  return (
    <section className="min-w-0 rounded-2xl border border-hairline bg-surface-raised p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Revenue, last 30 days</p>

      {currentCents === 0 && priorCents === 0 ? (
        <p className="mt-2 text-2xl font-semibold text-ink-muted">Nothing billed yet</p>
      ) : (
        <>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-ink-primary">
            {formatMoney(currentCents)}
          </p>
          <p className="mt-2 text-sm text-ink-secondary">{trendLine(currentCents, priorCents)}</p>
        </>
      )}

      <Link
        href="/reports/revenue"
        className="mt-4 inline-block text-sm font-medium text-ink-primary underline underline-offset-4 transition hover:text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
      >
        See the full report
      </Link>
    </section>
  );
}

/**
 * Plain language, not a colored arrow — a revenue dip isn't an error state
 * (roofing is seasonal), so this stays in ordinary ink rather than borrowing
 * danger/confirm the way an actual wrong number would. Never divides by a
 * zero prior window.
 */
function trendLine(currentCents: number, priorCents: number): string {
  if (priorCents === 0) {
    return currentCents > 0 ? "Nothing billed in the 30 days before that" : "Nothing billed yet";
  }
  const change = Math.round(((currentCents - priorCents) / priorCents) * 100);
  if (change === 0) return "Even with the 30 days before that";
  return change > 0
    ? `Up ${change}% from the 30 days before that`
    : `Down ${Math.abs(change)}% from the 30 days before that`;
}
