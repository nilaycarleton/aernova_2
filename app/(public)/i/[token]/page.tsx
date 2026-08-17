import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jobAddress, jobClient, jobIdentityInclude } from "@/lib/job-identity";
import { formatMoney, microsToPercent } from "@/lib/money";
import { isWellFormedShareToken } from "@/lib/share-token";
import { invoiceBalance } from "@/lib/invoice/balance";
import { paymentMethodLabel } from "@/lib/invoice/payment-methods";
import { effectiveBillingAddress, formatBillingAddress } from "@/lib/invoice/billing-address";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { DocumentBrand } from "@/components/public/document-brand";
import {
  DocumentSurface,
  DocumentHeader,
  DocumentMeta,
  DocumentRule,
  DocumentTotalRow,
} from "@/components/ui/document";
import { confirmAdditionalWorkReviewAction, markInvoiceViewed } from "./actions";
import { createStripeCheckoutAction } from "./pay-actions";

// The group layout says "Your quote", which is the wrong tab title for a bill.
export const metadata: Metadata = {
  title: "Your invoice",
  description: "An invoice from your contractor",
  robots: { index: false, follow: false },
};

/**
 * The invoice, as the homeowner receives it.
 *
 * Built from the `paper-*` tokens like the quote, and for the same reason: this
 * is a document. It gets printed, forwarded to a spouse, and handed to an
 * accountant, and it should read as a piece of paper rather than as a screen.
 *
 * The difference from the quote page is that there is **nothing to decide**. A
 * quote is a form wearing a document's clothes — extras to tick, an Approve
 * button. An invoice is settled: what is left is to see what is owed and how to
 * pay it. So there is no interactive island here at all, which is also why
 * every figure can be read straight off the stored columns.
 *
 * What is deliberately absent: any way to pay. Phase 5b puts a Stripe button
 * here; until then a homeowner pays their contractor the way they always have,
 * and a payment page that cannot take a payment would be worse than none.
 */
export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { token } = await params;
  const { paid } = await searchParams;
  if (!isWellFormedShareToken(token)) notFound();

  const invoice = await prisma.invoice.findFirst({
    where: { shareToken: token },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "asc" } },
      taxRate: true,
      company: true,
      job: { include: jobIdentityInclude },
    },
  });

  // A cancelled invoice's token is cleared, so this is belt and braces — but a
  // homeowner must never be shown a demand for money that was withdrawn.
  if (!invoice || invoice.status === InvoiceStatus.VOID) notFound();

  await markInvoiceViewed(token);

  const client = jobClient(invoice.job);
  const billTo = formatBillingAddress(effectiveBillingAddress(invoice, jobAddress(invoice.job)));
  const balance = invoiceBalance(invoice.totalAmountCents, invoice.payments, {
    status: invoice.status,
    dueAt: invoice.dueAt,
  });

  const longDate = (value: Date | null) =>
    value ? value.toLocaleDateString("en-CA", { dateStyle: "long" }) : null;

  // §19.2 — an at/above-threshold Additional Work invoice, shared before it
  // can send. Still DRAFT under the hood until this is true or an office
  // override clears it (see shareInvoiceAction's own branching).
  const pendingReview = invoice.requiresHomeownerReview && !invoice.homeownerReviewConfirmedAt;

  const metaItems = [
    {
      label: "Billed to",
      value: (
        <>
          {client.name}
          {billTo ? (
            <>
              <br />
              {billTo}
            </>
          ) : null}
        </>
      ),
    },
    ...(longDate(invoice.issuedAt) ? [{ label: "Issued", value: longDate(invoice.issuedAt) as string }] : []),
    ...(longDate(invoice.dueAt) ? [{ label: "Due", value: longDate(invoice.dueAt) as string }] : []),
  ];

  return (
    <div className="min-h-screen bg-paper px-4 py-8 text-paper-ink-body sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <DocumentSurface>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              {/* The contractor's identity, never ours. A homeowner is doing
                  business with the roofer; Aernova is not a party to it. */}
              <DocumentBrand name={invoice.company.name} logoUrl={invoice.company.logoUrl} />
              {invoice.company.phone ? (
                <p className="mt-0.5 text-sm text-paper-ink-muted">{invoice.company.phone}</p>
              ) : null}
              {invoice.company.businessNumber ? (
                <p className="mt-0.5 text-sm text-paper-ink-faint">
                  Business no. {invoice.company.businessNumber}
                </p>
              ) : null}
            </div>

            {balance.isPaid ? (
              <span className="shrink-0 rounded-full bg-confirm/15 px-3 py-1 text-xs font-medium text-confirm-fg">
                Paid in full
              </span>
            ) : balance.isOverdue ? (
              <span className="shrink-0 rounded-full bg-danger/15 px-3 py-1 text-xs font-medium text-danger-fg">
                Past due
              </span>
            ) : pendingReview ? (
              <span className="shrink-0 rounded-full bg-caution/15 px-3 py-1 text-xs font-medium text-caution-fg">
                Please review
              </span>
            ) : null}
          </header>

          {pendingReview ? (
            <p className="mt-6 rounded-xl bg-caution/10 px-4 py-3 text-sm leading-6 text-paper-ink-body">
              This is additional work beyond what was originally quoted. Have a look below, then
              confirm you&rsquo;ve reviewed it — that&rsquo;s what lets it go out as a bill.
            </p>
          ) : null}

          <div className="mt-8">
            <DocumentHeader
              eyebrow={invoice.invoiceNumber ? `Invoice #${invoice.invoiceNumber}` : "Invoice"}
              title={invoice.title}
            />
          </div>

          <div className="mt-6 border-y border-paper-rule py-6">
            <DocumentMeta items={metaItems} />
          </div>

          {invoice.clientMessage ? (
            <p className="mt-8 max-w-prose text-sm leading-6 text-paper-ink-body">
              {invoice.clientMessage}
            </p>
          ) : null}

          <section className="mt-8">
            {/* Scrolls inside its own box rather than pushing the page
                sideways. A homeowner reading this on a phone must never get a
                horizontal scrollbar on the whole document. */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-paper-rule">
                    <th scope="col" className="pb-2 font-semibold text-paper-ink">
                      What was done
                    </th>
                    <th scope="col" className="pb-2 pl-4 text-right font-semibold text-paper-ink">
                      Qty
                    </th>
                    <th scope="col" className="pb-2 pl-4 text-right font-semibold text-paper-ink">
                      Each
                    </th>
                    <th scope="col" className="pb-2 pl-4 text-right font-semibold text-paper-ink">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((line) =>
                    line.kind === "TEXT" ? (
                      <tr key={line.id}>
                        <td
                          colSpan={4}
                          className="border-b border-paper py-4 text-sm leading-6 text-paper-ink-body"
                        >
                          {line.description || line.name}
                        </td>
                      </tr>
                    ) : (
                      <tr key={line.id} className="border-b border-paper align-top">
                        <td className="py-4 pr-4">
                          <p className="font-medium text-paper-ink-strong">{line.name}</p>
                          {line.description ? (
                            <p className="mt-1.5 max-w-prose text-sm leading-6 text-paper-ink-muted">
                              {line.description}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-4 pl-4 text-right tabular-nums text-paper-ink-body">
                          {line.quantity} {line.unit}
                        </td>
                        <td className="py-4 pl-4 text-right tabular-nums text-paper-ink-body">
                          {formatMoney(line.unitPriceCents)}
                        </td>
                        <td className="py-4 pl-4 text-right font-medium tabular-nums text-paper-ink-strong">
                          {formatMoney(line.amountCents)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8 flex justify-end">
            <dl className="w-full max-w-xs space-y-2">
              <DocumentTotalRow label="Subtotal" value={formatMoney(invoice.subtotalCents)} />
              {invoice.discountCents > 0 ? (
                <DocumentTotalRow label="Discount" value={`− ${formatMoney(invoice.discountCents)}`} />
              ) : null}
              {invoice.taxRate ? (
                <DocumentTotalRow
                  label={`${invoice.taxRate.name} (${microsToPercent(invoice.taxRate.rateMicros)}%)`}
                  value={formatMoney(invoice.taxCents)}
                />
              ) : null}

              <div className="pt-1">
                <DocumentRule />
                <div className="pt-2">
                  <DocumentTotalRow label="Total" value={formatMoney(invoice.totalAmountCents)} emphasis />
                </div>
              </div>

              {/* Every payment, listed. A homeowner who paid a deposit in March
                  should be able to see it on the document rather than take the
                  balance on faith — this is the number they will check against
                  their own bank statement. */}
              {invoice.payments.map((payment) => (
                <DocumentTotalRow
                  key={payment.id}
                  label={`Paid ${payment.paidAt.toLocaleDateString("en-CA", {
                    dateStyle: "medium",
                  })} · ${paymentMethodLabel(payment.method).toLowerCase()}`}
                  value={`− ${formatMoney(payment.amountCents)}`}
                />
              ))}

              {invoice.payments.length > 0 ? (
                <div className="pt-1">
                  <DocumentRule strong />
                  <div className="pt-2">
                    <DocumentTotalRow
                      label={balance.balanceCents < 0 ? "Overpaid by" : "Still owing"}
                      value={formatMoney(Math.abs(balance.balanceCents))}
                      emphasis
                    />
                  </div>
                </div>
              ) : null}
            </dl>
          </section>

          {paid === "1" && !balance.isPaid ? (
            // Stripe only redirects here after the checkout session actually
            // completed, so this is honest even if the webhook that updates
            // the figures above hasn't landed yet — a homeowner refreshing a
            // second later will see the real balance.
            <p className="mt-6 rounded-xl bg-confirm/10 px-4 py-3 text-sm text-confirm-fg">
              Payment received — thanks! This page will catch up in a moment.
            </p>
          ) : null}

          {pendingReview ? (
            // Nothing to pay yet — this hasn't reached SENT. Confirming is
            // what gets it there; see confirmAdditionalWorkReviewAction.
            <form action={confirmAdditionalWorkReviewAction} className="mt-6 border-t border-paper-rule pt-6 print:hidden">
              <input type="hidden" name="token" value={token} />
              <SubmitButton
                pendingText="Confirming…"
                className="w-full rounded-xl bg-action px-6 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60 sm:w-auto"
              >
                I&rsquo;ve reviewed this
              </SubmitButton>
            </form>
          ) : !balance.isPaid && invoice.company.stripeChargesEnabled ? (
            <form action={createStripeCheckoutAction} className="mt-6 flex justify-end print:hidden">
              <input type="hidden" name="token" value={token} />
              <SubmitButton
                pendingText="Opening…"
                className="rounded-xl bg-action px-6 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
              >
                Pay {formatMoney(Math.abs(balance.balanceCents))} online
              </SubmitButton>
            </form>
          ) : null}

          <p className="mt-10 border-t border-paper-rule pt-6 text-sm leading-6 text-paper-ink-muted">
            {balance.isPaid
              ? "Thanks — this is settled in full. Keep this for your records."
              : `Please settle this with ${invoice.company.name} directly${
                  invoice.company.phone ? ` — ${invoice.company.phone}` : ""
                }${invoice.company.email ? `, ${invoice.company.email}` : ""}.`}
          </p>
        </DocumentSurface>
      </div>
    </div>
  );
}
