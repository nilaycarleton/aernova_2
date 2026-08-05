"use server";

import path from "path";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { ActivityKind, CaptureSource, QuoteLineKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { storage } from "@/lib/storage";
import { isAiConfigured } from "@/lib/ai/client";
import { checkCaptureRateLimit, recordCaptureUsage } from "@/lib/ai/rate-limit";
import { draftJobFromPhoto, type CaptureDraft } from "@/lib/ai/capture";
import { validateNewJob } from "@/lib/job-validation";
import { createJobRecord } from "@/app/(dashboard)/jobs/new/actions";
import { withQuoteNumber } from "@/lib/quote/numbering";
import { computeTotals } from "@/lib/quote/totals";
import { defaultTaxRateFor } from "@/lib/quote/tax";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

const MAX_CAPTURE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type CaptureState = {
  error?: string;
  draft?: CaptureDraft;
  imageUrl?: string;
};

/**
 * Photo in, drafted job out — item 49. One action rather than an upload step
 * plus a separate read-it-back step: the file's bytes are already in memory
 * from the multipart post, so they go to Claude directly and to storage in
 * the same call, instead of uploading first and then having the server fetch
 * its own object back over `storage.getBytes()`.
 *
 * The upload happens regardless of what the model says — same "bytes go up
 * the moment they're picked" doctrine `uploadCompanyLogoAction` documents —
 * so a contractor who edits the draft and saves never loses the photo to a
 * second round trip.
 */
export async function captureFromPhotoAction(formData: FormData): Promise<CaptureState> {
  if (!isAiConfigured()) {
    return { error: "AI capture isn't set up in this environment yet." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose or take a photo first." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "That file isn't a photo Claude can read (JPEG, PNG or WebP)." };
  }
  if (file.size > MAX_CAPTURE_BYTES) {
    return { error: "That photo is too big. Try one taken at a smaller size." };
  }

  const { company, user } = await requireCapability("editJob");

  const limit = await checkCaptureRateLimit({ companyId: company.id, userId: user.id });
  if (!limit.allowed) {
    return { error: limit.message };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name).toLowerCase() || ".jpg";
  const { url } = await storage.put(
    `captures/${company.id}/${randomUUID()}${extension}`,
    bytes,
    file.type
  );

  await recordCaptureUsage({ companyId: company.id, userId: user.id });

  try {
    const draft = await draftJobFromPhoto({
      companyId: company.id,
      imageBase64: bytes.toString("base64"),
      mediaType: file.type as "image/jpeg" | "image/png" | "image/webp",
    });
    return { draft, imageUrl: url };
  } catch (error) {
    // The photo is already saved (`imageUrl` is returned either way), so a
    // failed draft doesn't cost the contractor the picture — the review step
    // just opens with everything blank instead of AI-suggested.
    return {
      error: error instanceof Error ? error.message : "Couldn't draft a job from that photo.",
      imageUrl: url,
    };
  }
}

export type CreateFromCaptureState = {
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

/**
 * The review step's Save. Reuses `createJobRecord` — the same client
 * resolution, property resolution and job numbering `/jobs/new` uses — so
 * this is never a third copy of that logic. What's specific to capture: the
 * photo becomes a `PhotoAsset` on the new job, and a matched service becomes
 * one draft `QuoteLineItem` on a new blank quote, the same shape
 * `createBlankQuoteAction` creates, just not empty.
 */
export async function createJobFromCaptureAction(
  _prevState: CreateFromCaptureState,
  formData: FormData
): Promise<CreateFromCaptureState> {
  const { company, user } = await requireCapability("editJob");

  const name = getString(formData, "name");
  const clientId = getString(formData, "clientId");
  const clientName = getString(formData, "clientName");
  const clientIsBusiness = getString(formData, "clientIsBusiness") === "true";
  const notes = getString(formData, "notes");
  const imageUrl = getString(formData, "imageUrl");
  const serviceId = getString(formData, "serviceId");

  const values = { name, clientName, notes };

  const fieldErrors = validateNewJob({ name, clientId, clientName });
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values };
  }

  const job = await createJobRecord({
    companyId: company.id,
    createdById: user.id,
    name,
    clientId,
    clientName,
    clientIsBusiness,
    clientEmail: "",
    clientPhone: "",
    leadSource: "",
    addressLine1: "",
    city: "",
    province: "",
    postalCode: "",
    notes,
    captureSource: CaptureSource.AI_CAPTURE,
  });

  if (imageUrl) {
    await prisma.photoAsset.create({
      data: { jobId: job.id, url: imageUrl, contentType: null },
    });
  }

  let quoteId: string | null = null;
  if (serviceId) {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, companyId: company.id, isActive: true },
    });
    if (service) {
      const taxRateId = await defaultTaxRateFor(company.id, job.propertyId);
      const line = {
        kind: QuoteLineKind.ITEM,
        name: service.name,
        description: service.description,
        quantity: 1,
        unit: service.unit,
        unitCostCents: service.unitCostCents,
        unitPriceCents: service.unitPriceCents,
      };
      const totals = computeTotals([line]);

      const quote = await withQuoteNumber(company.id, (quoteNumber) =>
        prisma.quote.create({
          data: {
            companyId: company.id,
            jobId: job.id,
            quoteNumber,
            title: `${job.name} – Quote`,
            status: "DRAFT",
            totalAmountCents: totals.totalCents,
            totalAmount: totals.totalCents / 100,
            taxRateId,
            scopeOfWork: JSON.stringify({ plainTextScope: "" }),
            lineItems: {
              create: {
                ...line,
                // A copy, not a link to today's price — the same convention
                // the catalog picker and templates both follow. serviceId is
                // kept only so job costing can still tell what the row was.
                serviceId: service.id,
                amountCents: totals.subtotalCents,
                sortOrder: 0,
                source: "manual",
                imageUrl: service.imageUrl,
              },
            },
          },
        })
      );
      quoteId = quote.id;

      await recordActivity({
        companyId: company.id,
        jobId: job.id,
        kind: ActivityKind.QUOTE_CREATED,
        actorUserId: user.id,
        meta: { quoteId: quote.id, amountCents: totals.totalCents },
      });
    }
  }

  redirect(quoteId ? `/jobs/${job.id}?tab=quote` : `/jobs/${job.id}`);
}
