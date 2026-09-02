"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateRoofingReport } from "@/lib/report-generator";
import { requireJobAccess } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { ActivityKind } from "@prisma/client";
import { defaultPricingTemplate } from "@/lib/pricing-template";
import { withQuoteNumber } from "@/lib/quote/numbering";
import { toQuoteLines } from "@/lib/quote/line-items";
import { computeTotals } from "@/lib/quote/totals";
import { defaultTaxRateFor } from "@/lib/quote/tax";

/**
 * A quote with nothing in it yet.
 *
 * Measuring a roof is the *fast* way to a quote, never the price of admission:
 * a repair, a chimney flashing, a call-out fee are all real quotes that no
 * amount of photogrammetry helps with, and a roofer who can't write one down
 * has to leave the product to do their job. So this exists beside
 * `generateQuoteAction` rather than inside it — a blank draft the editor
 * below the card can fill in by hand, priced at nothing until someone says
 * otherwise.
 *
 * It deliberately does not run `generateRoofingReport()` with no measurements.
 * That returns a full report of zeroes — 0 sq ft, 0 squares, a $0 total under
 * a "based on 0 sq ft of roof" line — which reads as a broken quote rather
 * than an empty one.
 */
export async function createBlankQuoteAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "").trim();

  if (!jobId) {
    throw new Error("Missing jobId");
  }
  const { companyId, userId } = await requireJobAccess(jobId, "editQuote");

  const job = await prisma.job.findUnique({ where: { id: jobId } });

  if (!job) {
    throw new Error("Job not found");
  }

  const taxRateId = await defaultTaxRateFor(companyId, job.propertyId);

  const quote = await withQuoteNumber(companyId, (quoteNumber) =>
    prisma.quote.create({
      data: {
        companyId,
        jobId: job.id,
        quoteNumber,
        title: `${job.name} – Quote`,
        status: "DRAFT",
        totalAmountCents: 0,
        totalAmount: 0,
        taxRateId,
        scopeOfWork: JSON.stringify({ plainTextScope: "" }),
      },
    })
  );

  await recordActivity({
    companyId,
    jobId: job.id,
    kind: ActivityKind.QUOTE_CREATED,
    actorUserId: userId,
    meta: { quoteId: quote.id, amountCents: 0 },
  });

  redirect(`/jobs/${job.id}/quotes/${quote.id}`);
}

export async function generateQuoteAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "").trim();

  if (!jobId) {
    throw new Error("Missing jobId");
  }
  const { companyId, userId } = await requireJobAccess(jobId, "editQuote");

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      measurements: true,
      sections: true,
    },
  });

  if (!job) {
    throw new Error("Job not found");
  }

  const report = generateRoofingReport(job, job.measurements, job.sections);

  // The template's single bottom-line markup is pushed down into every row —
  // see lib/quote/line-items.ts. The subtotal is unchanged; what changes is
  // that the margin on the shingles is now separable from the margin on the
  // labour, which is the whole reason the builder shows cost per line.
  const lines = toQuoteLines(report.lineItems, defaultPricingTemplate.markupPercent);
  const taxRateId = await defaultTaxRateFor(companyId, job.propertyId);
  const taxRate = taxRateId
    ? await prisma.taxRate.findUnique({ where: { id: taxRateId }, select: { rateMicros: true } })
    : null;

  const totals = computeTotals(lines, { taxRateMicros: taxRate?.rateMicros ?? null });

  const quote = await withQuoteNumber(companyId, (quoteNumber) =>
    prisma.quote.create({
      data: {
        companyId,
        jobId: job.id,
        quoteNumber,
        title: report.title,
        status: "DRAFT",
        taxRateId,
        // Dual-written while the float column is being retired: cents is the
        // column every reader uses, the float is kept so a rollback still has a
        // total to show. Drop `totalAmount` once this has been through a release.
        totalAmountCents: totals.totalCents,
        totalAmount: totals.totalCents / 100,
        // What stays in the blob is the *derivation* — the roof figures and the
        // prose the pipeline produced. The document itself is rows now.
        scopeOfWork: JSON.stringify({
          summary: report.summary,
          sections: report.sections,
          plainTextScope: report.scopeOfWork,
        }),
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
