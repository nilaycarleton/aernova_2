"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ActivityKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { withQuoteNumber } from "@/lib/quote/numbering";
import { defaultTaxRateFor } from "@/lib/quote/tax";
import { computeTotals } from "@/lib/quote/totals";
import { applyTemplateLines, type CatalogPrice } from "@/lib/quote/templates";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/** Jobber caps this at 30. A list you have to scroll is a list you don't read. */
const MAX_TEMPLATES = 30;

export type TemplateState = { error?: string; savedName?: string };

/**
 * Keep this quote to write the next one with.
 *
 * A template is made *from a quote that worked*, not typed into a settings form
 * on a rainy afternoon — the roofer builds one good re-roof quote and the
 * twelfth takes a minute. Everything travels except the three things that are
 * about this job and not about how this contractor sells: the discount they
 * negotiated, the tax rate the property's province decided, and the client.
 */
export async function saveQuoteAsTemplateAction(
  _prevState: TemplateState,
  formData: FormData
): Promise<TemplateState> {
  const jobId = getString(formData, "jobId");
  const quoteId = getString(formData, "quoteId");
  const name = getString(formData, "name");
  if (!jobId || !quoteId) throw new Error("Missing jobId or quoteId");

  const { companyId } = await requireJobAccess(jobId, "editQuote");
  if (!name) return { error: "Give the template a name you'll recognise later." };

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, companyId },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!quote) return { error: "That quote is no longer available." };

  const count = await prisma.quoteTemplate.count({ where: { companyId } });
  if (count >= MAX_TEMPLATES) {
    return {
      error: `You already have ${MAX_TEMPLATES} templates. Delete one you don't use before saving another.`,
    };
  }

  // A name collision is a rename, not an error: somebody saving "Full re-roof"
  // twice means the second one is the better version of the first.
  const existing = await prisma.quoteTemplate.findFirst({
    where: { companyId, name },
    select: { id: true },
  });
  if (existing) {
    await prisma.quoteTemplate.delete({ where: { id: existing.id } });
  }

  await prisma.quoteTemplate.create({
    data: {
      companyId,
      name,
      quoteTitle: quote.title,
      introTitle: quote.introTitle,
      introBody: quote.introBody,
      clientMessage: quote.clientMessage,
      contractText: quote.contractText,
      showQuantities: quote.showQuantities,
      showUnitPrices: quote.showUnitPrices,
      showLineItemTotals: quote.showLineItemTotals,
      showTotals: quote.showTotals,
      depositKind: quote.depositKind,
      depositCents: quote.depositCents,
      depositPercentMicros: quote.depositPercentMicros,
      lineItems: {
        create: quote.lineItems.map((line, index) => ({
          serviceId: line.serviceId,
          kind: line.kind,
          name: line.name,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unitCostCents: line.unitCostCents,
          unitPriceCents: line.unitPriceCents,
          // The offer travels; whether one homeowner took it does not.
          isOptional: line.isOptional,
          imageUrl: line.imageUrl,
          sortOrder: index,
        })),
      },
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/quotes/${quoteId}`);
  return { savedName: name };
}

/**
 * Start a quote from one.
 *
 * The tax rate is *not* taken from the template — it comes from this property's
 * province, every time. A template carrying Ontario's HST onto an Alberta roof
 * is a wrong invoice, and it would be wrong quietly.
 */
export async function createQuoteFromTemplateAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const templateId = getString(formData, "templateId");
  if (!jobId || !templateId) throw new Error("Missing jobId or templateId");

  const { companyId, userId } = await requireJobAccess(jobId, "editQuote");

  const [job, template] = await Promise.all([
    prisma.job.findFirst({ where: { id: jobId, companyId } }),
    prisma.quoteTemplate.findFirst({
      where: { id: templateId, companyId },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  if (!job) throw new Error("Job not found");
  if (!template) throw new Error("That template is no longer available.");

  // Today's prices for anything still linked to the price list.
  const serviceIds = template.lineItems
    .map((line) => line.serviceId)
    .filter((id): id is string => Boolean(id));
  const catalog = new Map<string, CatalogPrice>(
    serviceIds.length === 0
      ? []
      : (
          await prisma.service.findMany({
            where: { companyId, id: { in: serviceIds }, isActive: true },
            select: { id: true, unit: true, unitPriceCents: true, unitCostCents: true },
          })
        ).map((service) => [service.id, service])
  );

  const lines = applyTemplateLines(
    template.lineItems.map((line) => ({
      serviceId: line.serviceId,
      kind: line.kind,
      name: line.name,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitCostCents: line.unitCostCents,
      unitPriceCents: line.unitPriceCents,
      isOptional: line.isOptional,
      imageUrl: line.imageUrl,
    })),
    catalog
  );

  const taxRateId = await defaultTaxRateFor(companyId, job.propertyId);
  const taxRate = taxRateId
    ? await prisma.taxRate.findUnique({ where: { id: taxRateId }, select: { rateMicros: true } })
    : null;

  const totals = computeTotals(lines, {
    taxRateMicros: taxRate?.rateMicros ?? null,
    deposit:
      template.depositKind === "PERCENT"
        ? { kind: "PERCENT", micros: template.depositPercentMicros ?? 0 }
        : template.depositKind === "AMOUNT"
          ? { kind: "AMOUNT", cents: template.depositCents ?? 0 }
          : null,
  });

  const quote = await withQuoteNumber(companyId, (quoteNumber) =>
    prisma.quote.create({
      data: {
        companyId,
        jobId: job.id,
        quoteNumber,
        // The job's own name wins over the template's title. "Full re-roof" is
        // what the template is called; "36 Wetherby" is whose roof this is.
        title: template.quoteTitle?.trim() || `${job.name} – Quote`,
        status: "DRAFT",
        introTitle: template.introTitle,
        introBody: template.introBody,
        clientMessage: template.clientMessage,
        contractText: template.contractText,
        showQuantities: template.showQuantities,
        showUnitPrices: template.showUnitPrices,
        showLineItemTotals: template.showLineItemTotals,
        showTotals: template.showTotals,
        depositKind: template.depositKind,
        depositCents: template.depositCents,
        depositPercentMicros: template.depositPercentMicros,
        taxRateId,
        totalAmountCents: totals.totalCents,
        totalAmount: totals.totalCents / 100,
        scopeOfWork: JSON.stringify({ plainTextScope: "" }),
        lineItems: { create: lines },
      },
    })
  );

  await recordActivity({
    companyId,
    jobId: job.id,
    kind: ActivityKind.QUOTE_CREATED,
    actorUserId: userId,
    meta: { quoteId: quote.id, amountCents: quote.totalAmountCents ?? undefined },
  });

  redirect(`/jobs/${job.id}/quotes/${quote.id}`);
}

/**
 * Deleting a template touches no quote. Every quote made from one is already a
 * copy, so this removes a shortcut and never a document.
 */
export async function deleteQuoteTemplateAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const templateId = getString(formData, "templateId");
  if (!jobId || !templateId) throw new Error("Missing jobId or templateId");

  const { companyId } = await requireJobAccess(jobId, "editQuote");
  await prisma.quoteTemplate.deleteMany({ where: { id: templateId, companyId } });

  revalidatePath(`/jobs/${jobId}`);
}
