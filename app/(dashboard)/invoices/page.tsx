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

/**
 * Every invoice in one place.
 *
 * `/quotes` answers "what money is out there waiting on somebody else's
 * decision". This answers the more urgent version of the same question: **what
 * money have I earned and not been paid.** A contractor with nine invoices out
 * cannot hold which of them have gone quiet, and an unchased $8,000 balance is
 * the difference between making payroll and not.
 *
 * Two figures, not four, and only one of them is cyan (the Readout Rule): what
 * is owed. Overdue sits beside it in the danger tone because it is a subset of
 * that number and the part to act on today — everything else on this page is
 * navigation.
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
      <header className="min-w-0">
        <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">Invoices</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink-primary">What you&rsquo;re owed</h2>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Everything you&rsquo;ve billed in the {DATE_RANGES[range].label.toLowerCase()}, and
          what&rsquo;s come in against it.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {/* The one cyan figure on this surface. */}
        <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Still owed</p>
          <p className="mt-2 break-words text-4xl font-semibold tabular-nums text-instrument-fg">
            {formatMoney(owedCents)}
          </p>
          <p className="mt-2 text-sm text-ink-secondary">
            {owing.length === 0
              ? "Nothing outstanding."
              : `Across ${owing.length} ${owing.length === 1 ? "invoice" : "invoices"}.`}
          </p>
        </div>

        <div className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Past due</p>
          <p
            className={`mt-2 break-words text-4xl font-semibold tabular-nums ${
              late.length === 0 ? "text-ink-primary" : "text-danger-fg"
            }`}
          >
            {formatMoney(lateCents)}
          </p>
          <p className="mt-2 text-sm text-ink-secondary">
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
        <div className="rounded-3xl border border-dashed border-hairline p-10 text-center">
          <p className="text-ink-secondary">
            {status
              ? `Nothing ${INVOICE_STATUS_META[status].label.toLowerCase()} in this period.`
              : "No invoices in this period yet."}
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            An invoice is raised from an approved quote — open one and bill it there.
          </p>
          <Link
            href="/quotes?status=APPROVED"
            className="mt-5 inline-block rounded-xl bg-ink-primary px-5 py-3 text-sm font-semibold text-ground transition hover:bg-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
          >
            See your approved quotes
          </Link>
        </div>
      ) : (
        /* Scrolls in its own box rather than pushing the page sideways. */
        <div className="overflow-x-auto rounded-3xl border border-hairline bg-surface-raised">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline">
                <Th>Client</Th>
                <Th>Invoice</Th>
                <Th>Where</Th>
                <Th>Due</Th>
                <Th>Standing</Th>
                <Th align="right">Owing</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const client = jobClient(invoice.job);
                const address = formatAddress(jobAddress(invoice.job));
                const meta = INVOICE_STATUS_META[invoice.status];
                const owed = invoice.totalAmountCents - invoice.amountPaidCents;
                return (
                  <tr key={invoice.id} className="border-b border-hairline last:border-b-0">
                    <td className="px-4 py-3">
                      {/* The whole row is about this invoice, so the link is on
                          the thing you'd point at: whose roof it is. */}
                      <Link
                        href={`/jobs/${invoice.jobId}/invoices/${invoice.id}`}
                        className="font-medium text-ink-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                      >
                        {client.name}
                      </Link>
                      <span className="mt-0.5 block text-xs text-ink-muted">{invoice.title}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-secondary">
                      {invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">{address ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-secondary">
                      {invoice.dueAt
                        ? invoice.dueAt.toLocaleDateString("en-CA", { dateStyle: "medium" })
                        : "On receipt"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        title={meta.hint}
                        className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-ink-primary">
                      {/* What is left, not what was billed. The billed figure
                          is on the invoice; the one worth scanning a column of
                          is the one somebody still has to collect. */}
                      {owed <= 0 ? (
                        <span className="text-ink-muted">{formatMoney(0)}</span>
                      ) : (
                        formatMoney(owed)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-muted ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}
