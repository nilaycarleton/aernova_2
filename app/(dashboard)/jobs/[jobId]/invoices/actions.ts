"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ActivityKind, InvoiceStatus, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { withSequentialNumber } from "@/lib/sequential-number";
import { amountInput, type DiscountInput } from "@/lib/quote/totals";
import { invoiceFromQuote, invoiceTitleFromQuote, type InvoiceLineDraft } from "@/lib/invoice/from-quote";
import { resolveDraw } from "@/lib/invoice/draw";
import { dueDateFrom } from "@/lib/invoice/terms";
import { parseMoneyToCents, percentToMicros } from "@/lib/money";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/** What the form typed in, read back as the shape `resolveDraw` wants. Null on anything unreadable. */
function drawAmountInput(formData: FormData): DiscountInput {
  if (getString(formData, "amountKind") === "PERCENT") {
    const percent = Number(getString(formData, "amountValue"));
    if (!Number.isFinite(percent) || percent <= 0) return null;
    return { kind: "PERCENT", micros: percentToMicros(percent) };
  }
  const { cents } = parseMoneyToCents(getString(formData, "amountValue"));
  return cents == null ? null : { kind: "AMOUNT", cents };
}

/**
 * Turn an approved quote into a bill — the whole thing, itemized, or the next
 * draw of it.
 *
 * A full first invoice still runs through `lib/invoice/from-quote.ts`, which
 * decides which lines cross and what the totals are, frozen onto the invoice
 * so a quote edited next week can't silently change what a homeowner was
 * already asked to pay. A draw is simpler on purpose: one line for the amount
 * asked for. A deposit or a progress payment is not a re-itemization of the
 * job — it's a portion of money owed against it, and trying to prorate every
 * line item's own discount and tax across it is a fight not worth having when
 * the deposit itself is already "a share of what they'll actually be billed,
 * tax included" (see `Quote.depositCents`).
 *
 * Item 35, the ad hoc version: no schedule defined up front — a contractor
 * just says how much this time, as many times as the job needs. Whether that
 * "how much" is real is `lib/invoice/draw.ts`'s job: greater than zero, and no
 * more than the quote has left. That check is also this action's duplicate
 * guard now that more than one live invoice against a quote is the normal
 * case rather than a mistake — hitting "bill the full remaining balance"
 * twice fails the second time because nothing is left to bill, and a repeated
 * custom draw is caught the same way.
 *
 * A cancelled invoice does not count against the balance. Voiding and
 * re-raising is exactly how a contractor fixes a bill they got wrong.
 */
export async function createInvoiceFromQuoteAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const quoteId = getString(formData, "quoteId");
  if (!jobId || !quoteId) throw new Error("Missing jobId or quoteId");

  const { companyId, userId } = await requireJobAccess(jobId, "editInvoice");

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, jobId, companyId },
    include: { lineItems: { orderBy: { sortOrder: "asc" } }, taxRate: true },
  });
  if (!quote) throw new Error("Quote not found");

  // Only an approved quote. Billing for work nobody agreed to is not a feature,
  // and `markQuoteApprovedAction` already exists for the yes that came over the
  // phone — so this is never the thing standing between a contractor and their
  // money, only between them and a mistake.
  if (quote.status !== QuoteStatus.APPROVED) {
    throw new Error("That quote hasn't been approved yet.");
  }

  const priorInvoices = await prisma.invoice.findMany({
    where: { quoteId: quote.id, companyId, status: { not: InvoiceStatus.VOID } },
    select: { totalAmountCents: true },
  });
  const quoteTotalCents = quote.totalAmountCents ?? 0;
  const remainingCents =
    quoteTotalCents - priorInvoices.reduce((sum, inv) => sum + inv.totalAmountCents, 0);

  const mode = getString(formData, "mode") === "partial" ? "partial" : "full";

  let lineItems: InvoiceLineDraft[];
  let subtotalCents: number;
  let discountCents: number;
  let taxCents: number;
  let totalAmountCents: number;
  let taxRateId: string | null;

  if (mode === "full" && priorInvoices.length === 0) {
    // The first invoice against this quote, itemized in full — the same shape
    // this action had before draws existed.
    const draft = invoiceFromQuote(
      quote.lineItems.map((line) => ({
        kind: line.kind,
        group: line.group,
        name: line.name,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unitPriceCents: line.unitPriceCents,
        sortOrder: line.sortOrder,
        isOptional: line.isOptional,
        clientSelected: line.clientSelected,
      })),
      {
        discount: amountInput({
          kind: quote.discountKind,
          cents: quote.discountCents,
          percentMicros: quote.discountPercentMicros,
        }),
        taxRateMicros: quote.taxRate?.rateMicros ?? null,
      }
    );
    lineItems = draft.lineItems;
    subtotalCents = draft.subtotalCents;
    discountCents = draft.discountCents;
    taxCents = draft.taxCents;
    totalAmountCents = draft.totalAmountCents;
    taxRateId = quote.taxRateId;
  } else {
    // A draw against a quote that already has money billed against it (or the
    // first draw of what will become several): one line, no itemization.
    if (remainingCents <= 0) {
      throw new Error("This quote has already been fully invoiced.");
    }

    let amountCents: number;
    let label: string;

    if (mode === "partial") {
      const result = resolveDraw(drawAmountInput(formData), quoteTotalCents, remainingCents);
      if (!result.ok) throw new Error(result.error);
      amountCents = result.amountCents;
      label = getString(formData, "label") || "Deposit";
    } else {
      amountCents = remainingCents;
      label = getString(formData, "label") || "Balance due";
    }

    lineItems = [
      {
        kind: "ITEM",
        group: "Payment",
        name: label,
        description: null,
        quantity: 1,
        unit: "each",
        unitPriceCents: amountCents,
        amountCents,
        sortOrder: 0,
      },
    ];
    subtotalCents = amountCents;
    discountCents = 0;
    taxCents = 0;
    totalAmountCents = amountCents;
    taxRateId = null;
  }

  const issuedAt = new Date();

  const invoice = await withSequentialNumber(
    "invoiceNumber",
    async () =>
      (await prisma.invoice.aggregate({ where: { companyId }, _max: { invoiceNumber: true } }))
        ._max.invoiceNumber,
    (invoiceNumber) =>
      prisma.invoice.create({
        data: {
          companyId,
          jobId,
          quoteId: quote.id,
          invoiceNumber,
          title: invoiceTitleFromQuote(quote.title),
          status: InvoiceStatus.DRAFT,
          subtotalCents,
          discountCents,
          taxCents,
          totalAmountCents,
          taxRateId,
          issuedAt,
          dueAt: dueDateFrom(issuedAt),
          clientMessage: quote.clientMessage,
          lineItems: { create: lineItems },
        },
        select: { id: true, invoiceNumber: true, totalAmountCents: true },
      })
  );

  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.INVOICE_CREATED,
    actorUserId: userId,
    meta: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber ?? undefined,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber ?? undefined,
      amountCents: invoice.totalAmountCents,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/invoices");
  redirect(`/jobs/${jobId}/invoices/${invoice.id}`);
}
