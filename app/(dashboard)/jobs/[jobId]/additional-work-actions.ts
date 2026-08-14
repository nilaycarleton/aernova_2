"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ActivityKind, AddOnReviewOverrideReason, InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { withSequentialNumber } from "@/lib/sequential-number";
import { dueDateFrom } from "@/lib/invoice/terms";
import { defaultTaxRateFor } from "@/lib/quote/tax";
import { lineTotalCents } from "@/lib/quote/totals";
import { taxOnCents } from "@/lib/money";
import { overrideNoteError } from "@/lib/invoice/addon-override";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/** §14.2/§19.2 — the v1 default, used whenever `Company.billableAddOnThresholdCents` is unset. */
const V1_DEFAULT_THRESHOLD_CENTS = 50000;

type IncomingLine = {
  name?: string;
  description?: string | null;
  quantity?: number;
  unit?: string;
  unitPriceCents?: number;
};

export type CreateDirectInvoiceState = { error?: string };

/**
 * A job that was never quoted, billed anyway — §19.2's whole reason for
 * existing. `quoteId: null` is what already made this representable
 * (`Invoice.quoteId` has been nullable since Phase 5); this is the entry
 * point onto that shape the rest of the product never used.
 *
 * The threshold gate lives here, at the one place a direct invoice comes
 * into being, and is read once: `Company.billableAddOnThresholdCents` at
 * this exact moment, never re-read later (§23 — a threshold change must
 * never retroactively change what an already-created invoice needs).
 */
export async function createDirectInvoiceAction(
  _prevState: CreateDirectInvoiceState,
  formData: FormData
): Promise<CreateDirectInvoiceState> {
  const jobId = getString(formData, "jobId");
  if (!jobId) throw new Error("Missing jobId");

  const { companyId, userId } = await requireJobAccess(jobId, "editInvoice");

  const title = getString(formData, "title") || "Additional work";

  let lines: IncomingLine[];
  try {
    lines = JSON.parse(getString(formData, "lines") || "[]");
  } catch {
    return { error: "Something went wrong reading the line items." };
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    return { error: "Add at least one line to bill for." };
  }

  const normalized = lines.map((line, index) => {
    const quantity = Number.isFinite(line.quantity) ? Math.max(0, Number(line.quantity)) : 1;
    const unitPriceCents = Number.isFinite(line.unitPriceCents)
      ? Math.max(0, Math.round(Number(line.unitPriceCents)))
      : 0;
    return {
      kind: "ITEM" as const,
      group: "Additional work",
      name: (line.name ?? "").trim(),
      description: line.description?.trim() || null,
      quantity,
      unit: (line.unit ?? "each").trim() || "each",
      unitPriceCents,
      amountCents: lineTotalCents({ quantity, unitPriceCents }),
      sortOrder: index,
    };
  });
  if (normalized.some((line) => !line.name)) {
    return { error: "Every line needs a name." };
  }

  const subtotalCents = normalized.reduce((sum, line) => sum + line.amountCents, 0);

  const job = await prisma.job.findFirst({ where: { id: jobId, companyId }, select: { propertyId: true } });
  if (!job) throw new Error("Job not found");

  const taxRateId = await defaultTaxRateFor(companyId, job.propertyId);
  const taxRate = taxRateId
    ? await prisma.taxRate.findUnique({ where: { id: taxRateId }, select: { rateMicros: true } })
    : null;
  const taxCents = taxRate ? taxOnCents(subtotalCents, taxRate.rateMicros) : 0;
  const totalAmountCents = subtotalCents + taxCents;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { billableAddOnThresholdCents: true },
  });
  const threshold = company?.billableAddOnThresholdCents ?? V1_DEFAULT_THRESHOLD_CENTS;
  const atOrAboveThreshold = totalAmountCents >= threshold;

  // The override picklist only exists on the form once the threshold is hit
  // — below it, these read as unset regardless of what's posted.
  const overrideReasonRaw = getString(formData, "overrideReason");
  const overrideReason: AddOnReviewOverrideReason | null =
    atOrAboveThreshold && Object.values(AddOnReviewOverrideReason).includes(overrideReasonRaw as AddOnReviewOverrideReason)
      ? (overrideReasonRaw as AddOnReviewOverrideReason)
      : null;
  const overrideNote = getString(formData, "overrideNote");

  if (atOrAboveThreshold && overrideReasonRaw && !overrideReason) {
    return { error: "Pick a valid reason." };
  }
  if (overrideReason) {
    const noteError = overrideNoteError(overrideReason, overrideNote);
    if (noteError) return { error: noteError };
  }

  // The default path: shared to the homeowner before it can send. Only
  // false when below threshold (no review needed at all) or when the
  // office recorded a named override right here at creation.
  const requiresHomeownerReview = atOrAboveThreshold && !overrideReason;

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
          quoteId: null,
          invoiceNumber,
          title,
          status: InvoiceStatus.DRAFT,
          subtotalCents,
          discountCents: 0,
          taxCents,
          totalAmountCents,
          taxRateId,
          issuedAt,
          dueAt: dueDateFrom(issuedAt),
          requiresHomeownerReview,
          overrideReason: overrideReason ?? undefined,
          overrideNote: overrideReason ? overrideNote || null : null,
          overriddenByUserId: overrideReason ? userId : null,
          overriddenAt: overrideReason ? new Date() : null,
          lineItems: { create: normalized },
        },
        select: { id: true, invoiceNumber: true, totalAmountCents: true },
      })
  );

  if (overrideReason) {
    await recordActivity({
      companyId,
      jobId,
      kind: ActivityKind.ADDITIONAL_WORK_OFFICE_OVERRIDE,
      actorUserId: userId,
      meta: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber ?? undefined,
        amountCents: invoice.totalAmountCents,
        reason: overrideReason,
        note: overrideNote || undefined,
      },
    });
  } else if (!atOrAboveThreshold) {
    await recordActivity({
      companyId,
      jobId,
      kind: ActivityKind.ADDITIONAL_WORK_INVOICED,
      actorUserId: userId,
      meta: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber ?? undefined,
        amountCents: invoice.totalAmountCents,
      },
    });
  }
  // atOrAboveThreshold && !overrideReason: nothing to log yet — the first
  // real event is ADDITIONAL_WORK_HOMEOWNER_REVIEW_SENT, once it's actually
  // shared (see the branching in invoices/[invoiceId]/actions.ts).

  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}/invoices/${invoice.id}`);
}

export type RecordOverrideState = { error?: string; recordedAt?: number };

/**
 * The fallback, recorded after the fact — for a review-pending invoice
 * where homeowner contact turned out to be missing, the yes already came in
 * some other way, or the owner is intentionally stepping around their own
 * process. Never a bare confirm: a reason is required, gated to the same
 * `editInvoice` capability (office-tier, OWNER/ADMIN only) that creating a
 * direct invoice already requires.
 */
export async function recordAddOnReviewOverrideAction(
  _prevState: RecordOverrideState,
  formData: FormData
): Promise<RecordOverrideState> {
  const jobId = getString(formData, "jobId");
  const invoiceId = getString(formData, "invoiceId");
  const overrideReason = getString(formData, "overrideReason") as AddOnReviewOverrideReason;
  const overrideNote = getString(formData, "overrideNote");
  if (!jobId || !invoiceId) throw new Error("Missing jobId or invoiceId");

  const { companyId, userId } = await requireJobAccess(jobId, "editInvoice");

  if (!Object.values(AddOnReviewOverrideReason).includes(overrideReason)) {
    return { error: "Pick a reason." };
  }
  const noteError = overrideNoteError(overrideReason, overrideNote);
  if (noteError) return { error: noteError };

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, jobId, companyId },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmountCents: true,
      requiresHomeownerReview: true,
      homeownerReviewConfirmedAt: true,
    },
  });
  if (!invoice) throw new Error("Invoice not found");
  if (!invoice.requiresHomeownerReview || invoice.homeownerReviewConfirmedAt) {
    return { error: "This invoice doesn't need a review override." };
  }

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      requiresHomeownerReview: false,
      overrideReason,
      overrideNote: overrideNote || null,
      overriddenByUserId: userId,
      overriddenAt: new Date(),
    },
  });

  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.ADDITIONAL_WORK_OFFICE_OVERRIDE,
    actorUserId: userId,
    meta: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber ?? undefined,
      amountCents: invoice.totalAmountCents,
      reason: overrideReason,
      note: overrideNote || undefined,
    },
  });

  revalidatePath(`/jobs/${jobId}/invoices/${invoiceId}`);
  return { recordedAt: Date.now() };
}
