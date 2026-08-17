import Link from "next/link";
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageCapability } from "@/lib/auth";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobClient, jobIdentityInclude } from "@/lib/job-identity";
import { formatMoney } from "@/lib/money";
import { INVOICE_STATUS_FLOW, INVOICE_STATUS_META, UNPAID } from "@/lib/invoice/status";
import { sweepOverdueInvoices } from "@/lib/invoice/overdue";
import { DATE_RANGES, isRangeKey, rangeStart, type RangeKey } from "@/lib/date-range";
import { FilterPill } from "@/components/dashboard/filter-pill";
import { InvoicesTable, type InvoiceRow } from "@/components/dashboard/invoices-table";
import { PageHeader } from "@/components/ui/page-header";
import { NumericReadout } from "@/components/ui/numeric-readout";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Every invoice in one place.
 *
 * `/quotes` answers "what money is out there waiting on somebody else's
 * decision". This answers the more urgent version of the same question: **what
 * money have I earned and not been paid.** A contractor with nine invoices out
 * cannot hold which of them have gone quiet, and an unchased $8,000 balance is
 * the difference between making payroll and not.
 *
 * Two figures, not four: what is owed, in plain ink — a balance is a business
 * figure, never a measurement, so the Readout Rule keeps it off cyan rather
 * than putting it on. Overdue sits beside it in the danger tone because it is
 * a subset of that number and the part to act on today — everything else on
 * this page is navigation.
 */
export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; range?: string }>;
}) {
  const { status: statusParam, range: rangeParam } = await searchParams;
  const { company } = await requirePageCapability("viewMoney");

  // OVERDUE is the one status that goes stale with nothing but the clock, so it
  // is settled on the way in — see `lib/invoice/overdue.ts` for why this is a
  // sweep on an indexed query rather than a cron.
  await sweepOverdueInvoices(company.id);

  const range: RangeKey = isRangeKey(rangeParam) ? rangeParam : "12m";
  const since = rangeStart(range);

  const status = INVOICE_STATUS_FLOW.find((value) => value === statusParam) ?? null;

  const [invoices, inRange] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId: company.id,
        ...(since ? { createdAt: { gte: since } } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      include: { job: { include: jobIdentityInclude } },
    }),
    prisma.invoice.findMany({
      where: {
        companyId: company.id,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      select: { status: true, totalAmountCents: true, amountPaidCents: true },
    }),
  ]);

  // Computed over the date range but *not* the status filter. A figure that
  // changes when you filter to Paid would read $0.00 owing and mean nothing —
  // filtering narrows the list, it never rewrites the reading.
  const owing = inRange.filter((invoice) => UNPAID.includes(invoice.status));
  const owedCents = owing.reduce(
    (sum, invoice) => sum + (invoice.totalAmountCents - invoice.amountPaidCents),
    0
  );
  const late = inRange.filter((invoice) => invoice.status === InvoiceStatus.OVERDUE);
  const lateCents = late.reduce(
    (sum, invoice) => sum + (invoice.totalAmountCents - invoice.amountPaidCents),
    0
  );

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        eyebrow="Invoices"
        title="What you're owed"
        description={`Everything you've billed in the ${DATE_RANGES[range].label.toLowerCase()}, and what's come in against it.`}
      />

      <section className="grid gap-4 sm:grid-cols-2">
        {/* Was the one cyan figure on this surface, with a doc comment
            claiming the Readout Rule for it — backwards, same bug Phase 4
            found on the dashboard. Money is a business figure, not a
            measurement; NumericReadout's tone="default" is ordinary ink. */}
        <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <NumericReadout
            label="Still owed"
            value={formatMoney(owedCents)}
            detail={owing.length === 0 ? "Nothing outstanding." : `Across ${owing.length} ${owing.length === 1 ? "invoice" : "invoices"}.`}
            size="lg"
          />
        </div>

        <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">Past due</p>
          <p
            className={`mt-1 break-words text-2xl font-semibold tabular-nums ${
              late.length === 0 ? "text-ink-primary" : "text-danger-fg"
            }`}
          >
            {formatMoney(lateCents)}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {late.length === 0
              ? "Nothing late."
              : `${late.length} ${late.length === 1 ? "invoice is" : "invoices are"} past their due date.`}
          </p>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <FilterPill href={`/invoices?range=${range}`} active={status === null}>
          All
        </FilterPill>
        {INVOICE_STATUS_FLOW.map((value) => (
          <FilterPill
            key={value}
            href={`/invoices?range=${range}&status=${value}`}
            active={status === value}
          >
            {INVOICE_STATUS_META[value].label}
          </FilterPill>
        ))}

        <span className="ml-auto flex flex-wrap gap-2">
          {(Object.keys(DATE_RANGES) as RangeKey[]).map((key) => (
            <FilterPill
              key={key}
              href={`/invoices?range=${key}${status ? `&status=${status}` : ""}`}
              active={range === key}
            >
              {DATE_RANGES[key].label}
            </FilterPill>
          ))}
        </span>
      </section>

      {invoices.length === 0 ? (
        <EmptyState
          kind={status ? "filtered" : "first-use"}
          title={
            status
              ? `Nothing ${INVOICE_STATUS_META[status].label.toLowerCase()} in this period.`
              : "No invoices in this period yet."
          }
          description="An invoice is raised from an approved quote — open one and bill it there."
          action={
            <Link
              href="/quotes?status=APPROVED"
              className="inline-block rounded-xl bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              See your approved quotes
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-hairline bg-surface-raised">
          <InvoicesTable
            rows={invoices.map((invoice): InvoiceRow => {
              const client = jobClient(invoice.job);
              const address = formatAddress(jobAddress(invoice.job));
              const meta = INVOICE_STATUS_META[invoice.status];
              const owed = invoice.totalAmountCents - invoice.amountPaidCents;
              return {
                id: invoice.id,
                jobId: invoice.jobId,
                clientName: client.name,
                title: invoice.title,
                invoiceLabel: invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : "—",
                address: address ?? "—",
                dueLabel: invoice.dueAt
                  ? invoice.dueAt.toLocaleDateString("en-CA", { dateStyle: "medium" })
                  : "On receipt",
                statusLabel: meta.label,
                statusHint: meta.hint,
                statusBadgeClass: meta.badge,
                // What is left, not what was billed. The billed figure is on
                // the invoice; the one worth scanning a column of is the one
                // somebody still has to collect.
                owedLabel: formatMoney(Math.max(owed, 0)),
                isOwed: owed > 0,
              };
            })}
          />
        </div>
      )}
    </div>
  );
}
