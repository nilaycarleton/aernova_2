import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobClient, jobIdentityInclude } from "@/lib/job-identity";
import { formatMoney, microsToPercent } from "@/lib/money";
import { shareUrl as buildShareUrl } from "@/lib/share-token";
import { isEmailConfigured } from "@/lib/email";
import { invoiceBalance } from "@/lib/invoice/balance";
import { INVOICE_STATUS_META } from "@/lib/invoice/status";
import { invoiceSendGaps } from "@/lib/invoice/gaps";
import { hasBillingOverride } from "@/lib/invoice/billing-address";
import { PageHeader } from "@/components/ui/page-header";
import { InvoiceSharePanel } from "@/components/dashboard/invoice-share-panel";
import { InvoicePayments } from "@/components/dashboard/invoice-payments";
import { InvoiceBillingAddress } from "@/components/dashboard/invoice-billing-address";
import { AddOnOverrideForm } from "@/components/dashboard/addon-override-form";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { ConfirmSubmit } from "@/components/dashboard/confirm-submit";
import { addOnReviewOverrideReasonLabel } from "@/lib/format";
import { deleteInvoiceAction, updateInvoiceDueDateAction, voidInvoiceAction } from "./actions";

/**
 * One invoice, and everything you'd do to it.
 *
 * Not a builder. A quote is composed — rows argued over, prose written, a
 * decision about what the homeowner may see — and it earned an editor. An
 * invoice is the quote's arithmetic, already agreed, turned into a demand for
 * money; the things a contractor actually does to one are send it, get paid,
 * move the due date, and occasionally cancel it. So this page is a document and
 * three panels, not a form.
 */
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ jobId: string; invoiceId: string }>;
}) {
  const { jobId, invoiceId } = await params;
  // `viewMoney`, not merely job access. An invoice is money end to end, and a
  // crew member legitimately on this roof has no business reading it — the same
  // hole the quote builder's own guard was tightened to close.
  const { companyId, role } = await requireJobAccess(jobId, "viewMoney");

  const [invoice, job, company] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id: invoiceId, jobId, companyId },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        payments: { orderBy: { paidAt: "desc" } },
        taxRate: true,
        quote: { select: { id: true, quoteNumber: true } },
      },
    }),
    prisma.job.findFirst({ where: { id: jobId, companyId }, include: jobIdentityInclude }),
    prisma.company.findUnique({ where: { id: companyId }, select: { businessNumber: true } }),
  ]);

  if (!invoice || !job) notFound();

  // The origin comes off the request rather than an env var, so a link copied
  // on a preview deployment points at that deployment — the same reasoning the
  // quote page documents.
  const host = (await headers()).get("host") ?? "localhost:3000";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  const client = jobClient(job);
  const address = formatAddress(jobAddress(job));
  const property = jobAddress(job);
  const propertyFields = {
    addressLine1: property.addressLine1 ?? "",
    // Only `Property` carries a unit/suite; the deprecated job columns never
    // had one, so a job still on the fallback path has nothing to prefill.
    addressLine2: job.property?.addressLine2 ?? "",
    city: property.city ?? "",
    province: property.province ?? "",
    postalCode: property.postalCode ?? "",
  };
  const billingOverride = hasBillingOverride(invoice)
    ? {
        addressLine1: invoice.billingAddressLine1 ?? "",
        addressLine2: invoice.billingAddressLine2 ?? "",
        city: invoice.billingCity ?? "",
        province: invoice.billingProvince ?? "",
        postalCode: invoice.billingPostalCode ?? "",
      }
    : null;
  const day = (value: Date | null) =>
    value ? value.toLocaleDateString("en-CA", { dateStyle: "medium" }) : null;
  const dateInput = (value: Date | null) =>
    value ? value.toISOString().slice(0, 10) : "";

  const balance = invoiceBalance(invoice.totalAmountCents, invoice.payments, {
    status: invoice.status,
    dueAt: invoice.dueAt,
  });
  const meta = INVOICE_STATUS_META[invoice.status];

  const gaps = invoiceSendGaps({
    chargesTax: invoice.taxCents > 0,
    hasBusinessNumber: Boolean(company?.businessNumber?.trim()),
    hasLines: invoice.lineItems.length > 0,
  });

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6">
      <div className="min-w-0 space-y-3">
        <Link
          href={`/jobs/${jobId}`}
          className="text-sm text-ink-muted underline underline-offset-4 transition hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        >
          ← Back to the job
        </Link>

        <PageHeader
          title={invoice.invoiceNumber ? `Invoice #${invoice.invoiceNumber}` : "Invoice"}
          description={`${invoice.title} · ${client.name}${address ? ` · ${address}` : ""}`}
          status={
            <span
              title={meta.hint}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${meta.badge}`}
            >
              {meta.label}
            </span>
          }
        />

        {balance.isOverdue ? (
          <p className="text-sm text-danger-fg">
            {balance.overdueDays === 0
              ? "Due today, and still owing."
              : `${balance.overdueDays} ${balance.overdueDays === 1 ? "day" : "days"} past due.`}
          </p>
        ) : null}
      </div>

      {/* What is stopping it going out, said on the record rather than as a
          wall in front of a button. Required to advance, not to exist. */}
      {gaps.length > 0 && invoice.status === InvoiceStatus.DRAFT ? (
        <section className="rounded-3xl border border-caution/30 bg-caution/5 p-6">
          <h3 className="text-sm font-semibold text-caution-fg">
            Before this can go out
          </h3>
          <ul className="mt-3 space-y-2">
            {gaps.map((gap) => (
              <li key={gap.id} className="text-sm text-ink-secondary">
                <span className="font-medium text-ink-primary">{gap.need}</span> — {gap.because}
                {gap.href ? (
                  <>
                    {" "}
                    <Link
                      href={gap.href}
                      className="underline underline-offset-4 transition hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                    >
                      Add it
                    </Link>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* §19.2 — this invoice can't reach SENT on its own; it needs the
          homeowner's own look first, or a named office override. */}
      {invoice.requiresHomeownerReview && !invoice.homeownerReviewConfirmedAt ? (
        <section className="rounded-3xl border border-caution/30 bg-caution/5 p-6">
          <h3 className="text-sm font-semibold text-caution-fg">Needs homeowner review</h3>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            This is additional work at or above your review threshold. Share the link below so the
            homeowner can look it over first — it can&rsquo;t go out as a bill until they confirm,
            unless you record an override.
          </p>
          {can(role, "editInvoice") ? (
            <AddOnOverrideForm jobId={jobId} invoiceId={invoice.id} />
          ) : null}
        </section>
      ) : invoice.overrideReason ? (
        <p className="text-sm text-ink-muted">
          Homeowner review was skipped — {addOnReviewOverrideReasonLabel(invoice.overrideReason).toLowerCase()}
          {invoice.overrideNote ? `: "${invoice.overrideNote}"` : ""}.
        </p>
      ) : invoice.homeownerReviewConfirmedAt ? (
        <p className="text-sm text-ink-muted">
          The homeowner confirmed they reviewed this on{" "}
          {invoice.homeownerReviewConfirmedAt.toLocaleDateString("en-CA", { dateStyle: "medium" })}.
        </p>
      ) : null}

      {can(role, "sendInvoice") ? (
        <InvoiceSharePanel
          jobId={jobId}
          invoiceId={invoice.id}
          status={invoice.status}
          sentAt={day(invoice.sentAt)}
          viewedAt={day(invoice.viewedAt)}
          shareUrl={
            invoice.shareToken ? buildShareUrl("invoice", invoice.shareToken, origin) : null
          }
          clientEmail={client.email}
          emailConfigured={isEmailConfigured()}
          hasPayments={invoice.payments.length > 0}
        />
      ) : null}

      <InvoicePayments
        jobId={jobId}
        invoiceId={invoice.id}
        totalCents={invoice.totalAmountCents}
        paidCents={balance.paidCents}
        balanceCents={balance.balanceCents}
        canRecord={can(role, "recordPayment")}
        isVoid={invoice.status === InvoiceStatus.VOID}
        payments={invoice.payments.map((payment) => ({
          id: payment.id,
          amountCents: payment.amountCents,
          method: payment.method,
          paidAt: payment.paidAt.toLocaleDateString("en-CA", { dateStyle: "medium" }),
          reference: payment.reference,
          notes: payment.notes,
        }))}
      />

      <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h3 className="text-lg font-semibold text-ink-primary">What they were billed for</h3>
          {invoice.quote ? (
            <Link
              href={`/jobs/${jobId}/quotes/${invoice.quote.id}`}
              className="text-sm text-ink-secondary underline underline-offset-4 transition hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              {invoice.quote.quoteNumber
                ? `From quote #${invoice.quote.quoteNumber}`
                : "From the quote"}
            </Link>
          ) : null}
        </div>

        {/* Scrolls in its own box rather than pushing the page sideways. */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline">
                <th scope="col" className="pb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Item
                </th>
                <th scope="col" className="pb-2 pl-4 text-right text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Qty
                </th>
                <th scope="col" className="pb-2 pl-4 text-right text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Each
                </th>
                <th scope="col" className="pb-2 pl-4 text-right text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((line) =>
                line.kind === "TEXT" ? (
                  <tr key={line.id}>
                    <td colSpan={4} className="border-b border-hairline py-3 text-sm leading-6 text-ink-secondary">
                      {line.description || line.name}
                    </td>
                  </tr>
                ) : (
                  <tr key={line.id} className="border-b border-hairline align-top last:border-b-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-ink-primary">{line.name}</p>
                      {line.description ? (
                        <p className="mt-1 max-w-prose text-xs leading-6 text-ink-muted">
                          {line.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 pl-4 text-right tabular-nums text-ink-secondary">
                      {line.quantity} {line.unit}
                    </td>
                    <td className="py-3 pl-4 text-right tabular-nums text-ink-secondary">
                      {formatMoney(line.unitPriceCents)}
                    </td>
                    <td className="py-3 pl-4 text-right font-medium tabular-nums text-ink-primary">
                      {formatMoney(line.amountCents)}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <dl className="mt-5 ml-auto max-w-xs space-y-2 border-t border-hairline pt-4">
          <Row label="Subtotal" value={formatMoney(invoice.subtotalCents)} />
          {invoice.discountCents > 0 ? (
            <Row label="Discount" value={`− ${formatMoney(invoice.discountCents)}`} />
          ) : null}
          {invoice.taxRate ? (
            <Row
              label={`${invoice.taxRate.name} (${microsToPercent(invoice.taxRate.rateMicros)}%)`}
              value={formatMoney(invoice.taxCents)}
            />
          ) : null}
          <div className="flex items-baseline justify-between gap-4 border-t border-hairline pt-2">
            <dt className="text-sm font-medium text-ink-primary">Total</dt>
            <dd className="text-base font-semibold tabular-nums text-ink-primary">
              {formatMoney(invoice.totalAmountCents)}
            </dd>
          </div>
        </dl>
      </section>

      {can(role, "editInvoice") && invoice.status !== InvoiceStatus.VOID ? (
        <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <h3 className="text-lg font-semibold text-ink-primary">Billing address</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Where this invoice is billed, if that isn&rsquo;t the property itself — a landlord
            or a property manager, most often.
          </p>
          <div className="mt-4">
            <InvoiceBillingAddress
              jobId={jobId}
              invoiceId={invoice.id}
              property={propertyFields}
              propertyFormatted={address}
              override={billingOverride}
            />
          </div>
        </section>
      ) : null}

      {can(role, "editInvoice") && invoice.status !== InvoiceStatus.VOID ? (
        <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <h3 className="text-lg font-semibold text-ink-primary">Terms</h3>

          <form
            action={updateInvoiceDueDateAction}
            className="mt-4 flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-secondary">Due by</span>
              <input
                type="date"
                name="dueAt"
                defaultValue={dateInput(invoice.dueAt)}
                className="rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
              />
            </label>
            <SubmitButton
              pendingText="Saving…"
              className="rounded-xl border border-hairline px-4 py-2.5 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
            >
              Save
            </SubmitButton>
            <p className="w-full text-xs text-ink-muted">
              Clear it and this invoice is never marked late — that&rsquo;s &ldquo;due on
              receipt, and I&rsquo;m not chasing it&rdquo;.
            </p>
          </form>

          {invoice.payments.length === 0 ? (
            <form action={voidInvoiceAction} className="mt-5 border-t border-hairline pt-4">
              <input type="hidden" name="jobId" value={jobId} />
              <input type="hidden" name="invoiceId" value={invoice.id} />
              {/* A cancelled invoice keeps its number, so the sequence has no
                  holes for an accountant to ask about later — which is also
                  why this is worth asking about before it happens. */}
              <ConfirmSubmit
                pendingText="Cancelling…"
                question="Cancel this invoice? It keeps its number and stays on the record, but the link stops working and you'll need to raise a new one to bill for the work."
                className="text-sm text-ink-muted underline underline-offset-4 transition hover:text-danger-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
              >
                Cancel this invoice
              </ConfirmSubmit>
            </form>
          ) : null}
        </section>
      ) : null}

      {/* Independent of the Terms section above, which hides once VOID — a
          delete option must still reach a cancelled invoice, only ever a
          draft or an already-voided one, never anything with a number a
          homeowner has actually seen. */}
      {can(role, "deleteInvoice") &&
      (invoice.status === InvoiceStatus.DRAFT || invoice.status === InvoiceStatus.VOID) ? (
        <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <form action={deleteInvoiceAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <ConfirmSubmit
              pendingText="Deleting…"
              question={`Delete this invoice${invoice.invoiceNumber ? ` (#${invoice.invoiceNumber})` : ""} for good? This cannot be undone.`}
              className="text-sm text-ink-muted underline underline-offset-4 transition hover:text-danger-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              Delete this invoice
            </ConfirmSubmit>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm tabular-nums text-ink-secondary">{value}</dd>
    </div>
  );
}
