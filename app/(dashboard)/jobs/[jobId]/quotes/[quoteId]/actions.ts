"use server";

import { revalidatePath } from "next/cache";
import { AmountKind, QuoteLineKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { parseMoneyToCents, percentToMicros } from "@/lib/money";
import { computeTotals, type LineForTotals } from "@/lib/quote/totals";
import { isOwnStorageUrl } from "@/lib/storage";
import { checkAiRateLimit, recordAiUsage } from "@/lib/ai/rate-limit";
import { draftScopeOfWork, type ScopeDraft } from "@/lib/ai/scope-draft";

/** A photo URL is only kept if it is one we minted. See `isOwnStorageUrl`. */
function ownStorageUrl(value: string | null | undefined): string | null {
  const url = (value ?? "").trim();
  return url && isOwnStorageUrl(url) ? url : null;
}

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/**
 * One line as the builder posts it. Ids are optional: a row the user just added
 * has none yet, and a row whose id is absent from the payload was deleted.
 */
type IncomingLine = {
  id?: string;
  serviceId?: string | null;
  imageUrl?: string | null;
  kind?: string;
  name?: string;
  description?: string | null;
  quantity?: number;
  unit?: string;
  unitCostCents?: number | null;
  unitPriceCents?: number;
  isOptional?: boolean;
  source?: string;
};

export type SaveQuoteState = { error?: string; savedAt?: number };

/**
 * The whole document, saved at once.
 *
 * Not per-row autosave. A quote is a thing a contractor *composes* — moves a
 * line, changes a price, changes it back, decides the discount was a mistake —
 * and a surface that commits every keystroke turns "let me try something" into
 * a change to the number a homeowner may already be looking at. One Save, one
 * consistent document, one recomputed total.
 *
 * The client's numbers are never trusted. Line amounts and every total are
 * recomputed here from quantity and unit price, because the totals a homeowner
 * is shown and the total the contractor is owed have to come from the same
 * function, run somewhere a browser cannot reach.
 */
export async function saveQuoteAction(
  _prevState: SaveQuoteState,
  formData: FormData
): Promise<SaveQuoteState> {
  const jobId = getString(formData, "jobId");
  const quoteId = getString(formData, "quoteId");
  if (!jobId || !quoteId) throw new Error("Missing jobId or quoteId");

  const { companyId } = await requireJobAccess(jobId, "editQuote");

  const existing = await prisma.quote.findFirst({
    where: { id: quoteId, companyId },
    select: { id: true, status: true },
  });
  if (!existing) throw new Error("Quote not found");

  let lines: IncomingLine[];
  try {
    lines = JSON.parse(getString(formData, "lines") || "[]");
  } catch {
    return { error: "Something went wrong reading the line items. Nothing was saved." };
  }
  if (!Array.isArray(lines)) {
    return { error: "Something went wrong reading the line items. Nothing was saved." };
  }

  const title = getString(formData, "title");
  if (!title) return { error: "Give the quote a title before saving." };

  const quoteNumberRaw = getString(formData, "quoteNumber");
  const quoteNumber = quoteNumberRaw ? Number(quoteNumberRaw) : null;
  if (quoteNumber !== null && (!Number.isInteger(quoteNumber) || quoteNumber < 1)) {
    return { error: "A quote number is a whole number, like 14." };
  }

  // Discount and deposit share a shape: a kind and a value in the unit that
  // kind implies. Blank means "not set", which is not the same as zero.
  function readAmount(prefix: string): {
    kind: AmountKind | null;
    cents: number | null;
    micros: number | null;
    error?: string;
  } {
    const kindRaw = getString(formData, `${prefix}Kind`);
    const valueRaw = getString(formData, `${prefix}Value`);
    if (!kindRaw || !valueRaw) return { kind: null, cents: null, micros: null };

    if (kindRaw === "PERCENT") {
      const percent = Number(valueRaw.replace(/[%\s]/g, ""));
      if (!Number.isFinite(percent) || percent < 0) {
        return { kind: null, cents: null, micros: null, error: "Enter a percentage, like 10." };
      }
      return { kind: AmountKind.PERCENT, cents: null, micros: percentToMicros(percent) };
    }

    const { cents, error } = parseMoneyToCents(valueRaw);
    if (error) return { kind: null, cents: null, micros: null, error };
    return { kind: AmountKind.AMOUNT, cents: cents ?? 0, micros: null };
  }

  const discount = readAmount("discount");
  if (discount.error) return { error: `Discount: ${discount.error}` };
  const deposit = readAmount("deposit");
  if (deposit.error) return { error: `Deposit: ${deposit.error}` };

  const taxRateId = getString(formData, "taxRateId") || null;
  const taxRate = taxRateId
    ? await prisma.taxRate.findFirst({
        where: { id: taxRateId, companyId },
        select: { id: true, rateMicros: true },
      })
    : null;

  // Which price-list rows this company actually owns. A `serviceId` is only
  // ever a label for reporting, but a label pointing at another company's
  // catalog is a cross-tenant reference and there is no reason to store one.
  const requestedServiceIds = [
    ...new Set(lines.map((line) => line.serviceId).filter((id): id is string => Boolean(id))),
  ];
  const ownServiceIds = new Set(
    requestedServiceIds.length === 0
      ? []
      : (
          await prisma.service.findMany({
            where: { companyId, id: { in: requestedServiceIds } },
            select: { id: true },
          })
        ).map((service) => service.id)
  );

  const normalized = lines.map((line, index) => {
    const kind = line.kind === "TEXT" ? QuoteLineKind.TEXT : QuoteLineKind.ITEM;
    // Floored at zero, same reasoning as lib/quote/totals.ts: a negative
    // quantity or price here is what let a line item silently undercut a
    // quote's total below its real cost with no floor, unlike the discount
    // field a few screens over which has always been clamped.
    const quantity = Number.isFinite(line.quantity) ? Math.max(0, Number(line.quantity)) : 1;
    const unitPriceCents = Number.isFinite(line.unitPriceCents)
      ? Math.max(0, Math.round(Number(line.unitPriceCents)))
      : 0;
    const unitCostCents =
      line.unitCostCents == null || !Number.isFinite(line.unitCostCents)
        ? null
        : Math.max(0, Math.round(Number(line.unitCostCents)));

    return {
      id: line.id,
      serviceId: line.serviceId && ownServiceIds.has(line.serviceId) ? line.serviceId : null,
      // A paragraph has no photo; there is nothing on that row to picture.
      imageUrl: kind === QuoteLineKind.TEXT ? null : ownStorageUrl(line.imageUrl),
      kind,
      name: (line.name ?? "").trim(),
      description: line.description?.trim() || null,
      quantity: kind === QuoteLineKind.TEXT ? 0 : quantity,
      unit: (line.unit ?? "each").trim() || "each",
      unitCostCents: kind === QuoteLineKind.TEXT ? null : unitCostCents,
      unitPriceCents: kind === QuoteLineKind.TEXT ? 0 : unitPriceCents,
      amountCents:
        kind === QuoteLineKind.TEXT ? 0 : Math.round(unitPriceCents * quantity),
      isOptional: Boolean(line.isOptional),
      sortOrder: index,
      // A row the user has touched is theirs. Only rows that arrive still
      // flagged "auto" stay regenerable — see lib/quote/line-items.ts.
      source: line.source === "auto" ? "auto" : "manual",
    };
  });

  /**
   * Which extras the homeowner already ticked — read from the database, not
   * from the form. The builder does not send it and must not: this is the one
   * fact on a quote that belongs to the other party. It is read here so that
   * saving an approved quote recomputes the same total the homeowner agreed to
   * instead of quietly subtracting the extras they bought.
   */
  const accepted = new Set(
    (
      await prisma.quoteLineItem.findMany({
        where: { quoteId, clientSelected: true },
        select: { id: true },
      })
    ).map((line) => line.id)
  );

  const forTotals: LineForTotals[] = normalized.map((line) => ({
    kind: line.kind,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    unitCostCents: line.unitCostCents,
    isOptional: line.isOptional,
    isAccepted: line.id ? accepted.has(line.id) : false,
  }));

  const totals = computeTotals(forTotals, {
    discount:
      discount.kind === AmountKind.PERCENT
        ? { kind: "PERCENT", micros: discount.micros ?? 0 }
        : discount.kind === AmountKind.AMOUNT
          ? { kind: "AMOUNT", cents: discount.cents ?? 0 }
          : null,
    taxRateMicros: taxRate?.rateMicros ?? null,
    deposit:
      deposit.kind === AmountKind.PERCENT
        ? { kind: "PERCENT", micros: deposit.micros ?? 0 }
        : deposit.kind === AmountKind.AMOUNT
          ? { kind: "AMOUNT", cents: deposit.cents ?? 0 }
          : null,
  });

  const keptIds = normalized.map((line) => line.id).filter(Boolean) as string[];

  // One transaction: a quote whose rows saved but whose total didn't is a quote
  // that lies about itself, and this is the number a homeowner signs.
  await prisma.$transaction([
    prisma.quoteLineItem.deleteMany({
      where: { quoteId, ...(keptIds.length > 0 ? { id: { notIn: keptIds } } : {}) },
    }),
    ...normalized.map((line) =>
      line.id
        ? prisma.quoteLineItem.update({
            where: { id: line.id },
            data: { ...line, id: undefined },
          })
        : prisma.quoteLineItem.create({ data: { ...line, id: undefined, quoteId } })
    ),
    prisma.quote.update({
      where: { id: quoteId },
      data: {
        title,
        quoteNumber,
        introTitle: getString(formData, "introTitle") || null,
        introBody: getString(formData, "introBody") || null,
        clientMessage: getString(formData, "clientMessage") || null,
        contractText: getString(formData, "contractText") || null,
        showQuantities: formData.get("showQuantities") === "on",
        showUnitPrices: formData.get("showUnitPrices") === "on",
        showLineItemTotals: formData.get("showLineItemTotals") === "on",
        showTotals: formData.get("showTotals") === "on",
        discountKind: discount.kind,
        discountCents: discount.cents,
        discountPercentMicros: discount.micros,
        taxRateId: taxRate?.id ?? null,
        depositKind: deposit.kind,
        depositCents: deposit.cents,
        depositPercentMicros: deposit.micros,
        totalAmountCents: totals.totalCents,
        totalAmount: totals.totalCents / 100,
      },
    }),
  ]);

  revalidatePath(`/jobs/${jobId}/quotes/${quoteId}`);
  revalidatePath(`/jobs/${jobId}`);
  return { savedAt: Date.now() };
}

export type DraftScopeState = ScopeDraft | { error: string };

/**
 * Item 50. Fills the builder's Opening fields for review — nothing here
 * saves anything. `QuoteBuilder` calls this directly (plain arguments, not
 * FormData; `updateJobStatusAction` already establishes that a "use server"
 * function can take serializable arguments instead) and holds the result in
 * component state until the contractor presses the quote's own Save.
 *
 * Counted as "summary" against the existing `AiUsageEvent`/rate-limit
 * machinery — a one-shot generation, the same shape as the job's AI summary,
 * not a back-and-forth "chat" turn.
 */
export async function draftQuoteScopeAction(jobId: string, quoteId: string): Promise<DraftScopeState> {
  const { companyId, userId } = await requireJobAccess(jobId, "editQuote");

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, jobId, companyId },
    select: { id: true },
  });
  if (!quote) return { error: "Quote not found" };

  const limit = await checkAiRateLimit({ jobId, userId });
  if (!limit.allowed) return { error: limit.message };

  await recordAiUsage({ jobId, userId, kind: "summary" });

  try {
    return await draftScopeOfWork({ jobId, quoteId, companyId });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't draft an opening. Try again." };
  }
}
