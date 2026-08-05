import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { InvoiceStatus, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { InvoiceDrawForm } from "@/components/dashboard/invoice-draw-form";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobClient, jobIdentityInclude } from "@/lib/job-identity";
import { formatMoney, microsToPercent, toDollars } from "@/lib/money";
import { shareUrl as buildShareUrl } from "@/lib/share-token";
import { isEmailConfigured } from "@/lib/email";
import { canDeleteQuote } from "@/lib/quote-status";
import { QuoteBuilder } from "@/components/dashboard/quote-builder";
import { QuoteSharePanel } from "@/components/dashboard/quote-share-panel";
import { QuoteTemplatePanel } from "@/components/dashboard/quote-template-panel";
import { ConfirmSubmit } from "@/components/dashboard/confirm-submit";
import type { DraftLine } from "@/components/dashboard/quote-line-row";
import { deleteQuoteAction } from "./send-actions";

/**
 * A quote gets its own page.
 *
 * It used to be a card inside a tab inside a job workspace, which was fine
 * while a quote was one number and a paragraph. It is a document now — rows,
 * prose, terms, a decision about what the homeowner is allowed to see — and a
 * document composed in a panel three levels deep is a document nobody gets
 * right. This is also where `/quotes` will point when the fifth noun lands.
 */
export default async function QuoteBuilderPage({
  params,
}: {
  params: Promise<{ jobId: string; quoteId: string }>;
}) {
  const { jobId, quoteId } = await params;
  /**
   * `editQuote`, not just job access.
   *
   * This is the page the audit's own regression test caught, and it was the
   * worst of the lot: the builder renders cost, markup and margin on every
   * line. A crew member assigned to this roof passed the job check — they are
   * legitimately on the job — and would have been handed the contractor's
   * margins. Reaching a job and being allowed to price it are different
   * questions, and only one of them was being asked.
   */
  const { companyId, role } = await requireJobAccess(jobId, "editQuote");

  const [quote, job, taxRates, services] = await Promise.all([
    prisma.quote.findFirst({
      where: { id: quoteId, jobId, companyId },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.job.findFirst({ where: { id: jobId, companyId }, include: jobIdentityInclude }),
    prisma.taxRate.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
      select: { id: true, name: true, rateMicros: true },
    }),
    prisma.service.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        unit: true,
        unitPriceCents: true,
        unitCostCents: true,
        category: true,
        imageUrl: true,
      },
    }),
  ]);

  if (!quote || !job) notFound();

  // Only asked for once the quote is approved, because that is the only state
  // in which the answer can change anything on this page. A quote can now
  // carry more than one invoice — item 35's draws — so this is every live one,
  // not just the first.
  const invoices =
    quote.status === QuoteStatus.APPROVED
      ? await prisma.invoice.findMany({
          where: { quoteId: quote.id, companyId, status: { not: InvoiceStatus.VOID } },
          select: { id: true, invoiceNumber: true, title: true, totalAmountCents: true },
          orderBy: { createdAt: "asc" },
        })
      : [];
  const invoicedCents = invoices.reduce((sum, inv) => sum + inv.totalAmountCents, 0);
  const remainingCents = (quote.totalAmountCents ?? 0) - invoicedCents;

  // The origin comes off the request rather than an env var so the link a
  // roofer copies on a preview deployment points at that deployment. A quote
  // link that silently points at production is a link to a quote that isn't
  // there.
  const host = (await headers()).get("host") ?? "localhost:3000";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const day = (value: Date | null) =>
    value ? value.toLocaleDateString("en-CA", { dateStyle: "medium" }) : null;

  const lines: DraftLine[] = quote.lineItems.map((line) => ({
    key: line.id,
    id: line.id,
    serviceId: line.serviceId,
    imageUrl: line.imageUrl,
    kind: line.kind,
    name: line.name,
    description: line.description ?? "",
    quantityText: String(line.quantity),
    unit: line.unit,
    // Money arrives as cents and is handed to the form as dollars, because a
    // text field is where a person types — the two edges rule in lib/money.ts.
    unitCostText: line.unitCostCents == null ? "" : toDollars(line.unitCostCents).toFixed(2),
    unitPriceText: toDollars(line.unitPriceCents).toFixed(2),
    isOptional: line.isOptional,
    isAccepted: line.clientSelected,
    source: line.source,
  }));

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6">
      <QuoteSharePanel
        jobId={jobId}
        quoteId={quote.id}
        status={quote.status}
        sentAt={day(quote.sentAt)}
        viewedAt={day(quote.viewedAt)}
        shareUrl={quote.shareToken ? buildShareUrl("quote", quote.shareToken, origin) : null}
        approvedByHand={quote.approvedByUserId !== null}
        declineReason={quote.declineReason}
        declineNote={quote.declineNote}
        clientEmail={jobClient(job).email}
        emailConfigured={isEmailConfigured()}
      />

      {/* Only once they've said yes. An invoice offered beside an unanswered
          quote is an invitation to bill for work nobody agreed to, and the
          action refuses it anyway — a button that exists and then throws is
          worse than one that waits. */}
      {quote.status === QuoteStatus.APPROVED && can(role, "editInvoice") ? (
        <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <h3 className="text-lg font-semibold text-ink-primary">
            {invoices.length > 0 ? "Billed so far" : "Bill for it"}
          </h3>

          {invoices.length > 0 ? (
            <ul className="mb-5 mt-3 space-y-2">
              {invoices.map((inv) => (
                <li key={inv.id} className="flex items-baseline justify-between gap-4">
                  <Link
                    href={`/jobs/${jobId}/invoices/${inv.id}`}
                    className="text-sm font-medium text-ink-primary underline underline-offset-4 transition hover:text-ink-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                  >
                    {inv.invoiceNumber ? `Invoice #${inv.invoiceNumber}` : "Invoice"} — {inv.title}
                  </Link>
                  <span className="text-sm tabular-nums text-ink-secondary">
                    {formatMoney(inv.totalAmountCents)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              Copies these lines and this total onto an invoice — or bill a deposit first and the
              rest later (item 35). Anything they declined stays off it, and editing this quote
              afterwards won&rsquo;t change what they were billed.
            </p>
          )}

          {remainingCents > 0 ? (
            <InvoiceDrawForm
              jobId={jobId}
              quoteId={quote.id}
              remainingCents={remainingCents}
              isFirstDraw={invoices.length === 0}
            />
          ) : (
            <p className="text-sm text-ink-muted">This quote is fully invoiced.</p>
          )}
        </section>
      ) : null}

      <QuoteTemplatePanel
        jobId={jobId}
        quoteId={quote.id}
        defaultName={quote.title}
        lineCount={quote.lineItems.length}
      />

      <QuoteBuilder
        taxRates={taxRates}
        services={services}
        quote={{
          id: quote.id,
          jobId,
          quoteNumber: quote.quoteNumber,
          title: quote.title,
          status: quote.status,
          clientName: jobClient(job).name,
          address: formatAddress(jobAddress(job)),
          introTitle: quote.introTitle,
          introBody: quote.introBody,
          clientMessage: quote.clientMessage,
          contractText: quote.contractText,
          showQuantities: quote.showQuantities,
          showUnitPrices: quote.showUnitPrices,
          showLineItemTotals: quote.showLineItemTotals,
          showTotals: quote.showTotals,
          discountKind: quote.discountKind,
          discountValue:
            quote.discountKind === "PERCENT"
              ? String(microsToPercent(quote.discountPercentMicros ?? 0))
              : quote.discountCents == null
                ? ""
                : toDollars(quote.discountCents).toFixed(2),
          depositKind: quote.depositKind,
          depositValue:
            quote.depositKind === "PERCENT"
              ? String(microsToPercent(quote.depositPercentMicros ?? 0))
              : quote.depositCents == null
                ? ""
                : toDollars(quote.depositCents).toFixed(2),
          taxRateId: quote.taxRateId,
          lines,
        }}
      />

      {can(role, "deleteQuote") && canDeleteQuote(quote.status) ? (
        <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
          <form action={deleteQuoteAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="quoteId" value={quote.id} />
            <ConfirmSubmit
              pendingText="Deleting…"
              question={`Delete this quote${quote.quoteNumber ? ` (#${quote.quoteNumber})` : ""}? This cannot be undone.`}
              className="text-sm text-ink-muted underline underline-offset-4 transition hover:text-danger-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
            >
              Delete this quote
            </ConfirmSubmit>
          </form>
        </section>
      ) : null}
    </div>
  );
}
