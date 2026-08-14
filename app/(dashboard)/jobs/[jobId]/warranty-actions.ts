"use server";

import { revalidatePath } from "next/cache";
import { ActivityKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability, requireJobAccess } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { generateShareToken } from "@/lib/share-token";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobClient, jobIdentityInclude } from "@/lib/job-identity";
import { canSendWarranty, isWarrantyEditable, buildCompanyInfoSnapshot, buildCustomerInfoSnapshot } from "@/lib/warranty";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

const LOCKED_MESSAGE =
  "This warranty has been confirmed by the homeowner and can't be edited. Aernova doesn't yet support creating a corrected version in this release — if something needs to change, contact support.";

/**
 * §14.4/§20/§25 Phase 10 — a job-specific draft, copied from a template's
 * text (never a live join — see `WarrantyTemplate`'s own doctrine comment)
 * plus a real snapshot of Company/Client/Property, exactly the same
 * "pre-filled, then reviewed, not a live join" pattern `Quote` already
 * uses. `@@unique([jobId])` means a second warranty for the same job isn't
 * representable — checked explicitly so the error reads as a real answer,
 * not a raw constraint violation.
 */
export type CreateWarrantyState = { error?: string };

export async function createWarrantyFromTemplateAction(
  _prevState: CreateWarrantyState,
  formData: FormData
): Promise<CreateWarrantyState> {
  const jobId = getString(formData, "jobId");
  const templateId = getString(formData, "templateId");
  if (!jobId || !templateId) throw new Error("Missing jobId or templateId");

  const { companyId } = await requireJobAccess(jobId, "editJob");

  const existing = await prisma.warranty.findUnique({ where: { jobId }, select: { id: true } });
  if (existing) return { error: "This job already has a warranty." };

  const template = await prisma.warrantyTemplate.findFirst({
    where: { id: templateId, OR: [{ companyId: null }, { companyId }] },
  });
  if (!template) return { error: "That template isn't available." };

  const [job, company] = await Promise.all([
    prisma.job.findFirst({ where: { id: jobId, companyId }, include: jobIdentityInclude }),
    prisma.company.findUnique({ where: { id: companyId } }),
  ]);
  if (!job || !company) throw new Error("Job not found");

  const client = jobClient(job);

  await prisma.warranty.create({
    data: {
      companyId,
      jobId,
      templateId: template.id,
      termMonths: template.termMonths,
      startsAt: new Date(),
      coverageNotes: template.coverageNotes,
      exclusions: template.exclusions,
      companyInfoSnapshot: buildCompanyInfoSnapshot(company),
      customerInfoSnapshot: buildCustomerInfoSnapshot(client),
      propertyAddressSnapshot: formatAddress(jobAddress(job)) ?? "",
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  return {};
}

export type SaveWarrantyDraftState = { error?: string; savedAt?: number };

/**
 * The office's edit path — term, start date, coverage, exclusions, and the
 * three snapshots, all editable right up until a homeowner confirms. Any
 * edit to a warranty that had already moved past DRAFT drops it back to
 * DRAFT (the review that already happened was a review of the *old*
 * wording, not this one) and, if it had ever actually gone out
 * (`sentAt` set), bumps `version` — the field's own doctrine comment: "Bumped
 * whenever the office edits and re-sends an already-sent Warranty." A
 * homeowner who already opened the old link is reading superseded text
 * either way; the version bump is what lets a support conversation tell
 * the two apart.
 */
export async function saveWarrantyDraftAction(
  _prevState: SaveWarrantyDraftState,
  formData: FormData
): Promise<SaveWarrantyDraftState> {
  const jobId = getString(formData, "jobId");
  const warrantyId = getString(formData, "warrantyId");
  if (!jobId || !warrantyId) throw new Error("Missing jobId or warrantyId");

  const termMonthsRaw = getString(formData, "termMonths");
  const startsAtRaw = getString(formData, "startsAt");
  const coverageNotes = getString(formData, "coverageNotes");
  const exclusions = getString(formData, "exclusions");
  const companyInfoSnapshot = getString(formData, "companyInfoSnapshot");
  const customerInfoSnapshot = getString(formData, "customerInfoSnapshot");
  const propertyAddressSnapshot = getString(formData, "propertyAddressSnapshot");

  const termMonths = Number(termMonthsRaw);
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    return { error: "Enter a term length in whole months, greater than zero." };
  }
  const startsAt = startsAtRaw ? new Date(startsAtRaw) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) {
    return { error: "Pick a start date." };
  }

  const { companyId } = await requireJobAccess(jobId, "editJob");

  const warranty = await prisma.warranty.findFirst({ where: { id: warrantyId, jobId, companyId } });
  if (!warranty) throw new Error("Warranty not found");
  if (!isWarrantyEditable(warranty.status)) return { error: LOCKED_MESSAGE };

  const wasBeyondDraft = warranty.status !== "DRAFT";

  await prisma.warranty.update({
    where: { id: warranty.id },
    data: {
      termMonths,
      startsAt,
      coverageNotes: coverageNotes || null,
      exclusions: exclusions || null,
      companyInfoSnapshot,
      customerInfoSnapshot,
      propertyAddressSnapshot,
      ...(wasBeyondDraft
        ? {
            status: "DRAFT",
            reviewedByUserId: null,
            reviewedAt: null,
            version: warranty.sentAt ? warranty.version + 1 : warranty.version,
          }
        : {}),
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  return { savedAt: Date.now() };
}

export type ReviewWarrantyState = { error?: string; reviewedAt?: number };

/** The business owner's own confirmation of the draft — never the homeowner's. See `saveWarrantyDraftAction` for why any later edit undoes this. */
export async function reviewWarrantyAction(
  _prevState: ReviewWarrantyState,
  formData: FormData
): Promise<ReviewWarrantyState> {
  const jobId = getString(formData, "jobId");
  const warrantyId = getString(formData, "warrantyId");
  if (!jobId || !warrantyId) throw new Error("Missing jobId or warrantyId");

  const { companyId, userId } = await requireJobAccess(jobId, "editJob");

  const warranty = await prisma.warranty.findFirst({ where: { id: warrantyId, jobId, companyId } });
  if (!warranty) throw new Error("Warranty not found");
  if (warranty.status !== "DRAFT") {
    return { error: "Only a draft can be marked reviewed." };
  }

  await prisma.warranty.update({
    where: { id: warranty.id },
    data: { status: "REVIEWED", reviewedByUserId: userId, reviewedAt: new Date() },
  });

  revalidatePath(`/jobs/${jobId}`);
  return { reviewedAt: Date.now() };
}

export type SendWarrantyState = { error?: string; sentAt?: number };

export async function sendWarrantyAction(
  _prevState: SendWarrantyState,
  formData: FormData
): Promise<SendWarrantyState> {
  const jobId = getString(formData, "jobId");
  const warrantyId = getString(formData, "warrantyId");
  if (!jobId || !warrantyId) throw new Error("Missing jobId or warrantyId");

  const { companyId, userId } = await requireJobAccess(jobId, "editJob");

  const warranty = await prisma.warranty.findFirst({ where: { id: warrantyId, jobId, companyId } });
  if (!warranty) throw new Error("Warranty not found");
  if (!canSendWarranty(warranty.status)) {
    return { error: "Mark it reviewed first — a warranty can't go out before the office has reviewed it." };
  }

  const shareToken = warranty.shareToken ?? generateShareToken();

  await prisma.warranty.update({
    where: { id: warranty.id },
    data: { shareToken, status: "SENT", sentAt: new Date() },
  });

  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.WARRANTY_SENT,
    actorUserId: userId,
    meta: { warrantyId: warranty.id, warrantyVersion: warranty.version },
  });

  revalidatePath(`/jobs/${jobId}`);
  return { sentAt: Date.now() };
}

/**
 * §14.4's own "starter → live company copy → frozen document" chain — a
 * built-in row is never mutated, only copied. `trade`/`variant` are
 * dropped on the copy (unused/free-form once a company owns it, per the
 * schema's own doc comment).
 */
export async function duplicateWarrantyTemplateAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const templateId = getString(formData, "templateId");
  if (!templateId) throw new Error("Missing templateId");

  const { company } = await requireCapability("editJob");

  const source = await prisma.warrantyTemplate.findFirst({
    where: { id: templateId, companyId: null },
  });
  if (!source) throw new Error("Template not found");

  await prisma.warrantyTemplate.create({
    data: {
      companyId: company.id,
      trade: null,
      variant: null,
      name: `${source.name} (your copy)`,
      termMonths: source.termMonths,
      coverageNotes: source.coverageNotes,
      exclusions: source.exclusions,
    },
  });

  if (jobId) revalidatePath(`/jobs/${jobId}`);
}

export type UpdateWarrantyTemplateState = { error?: string; savedAt?: number };

export async function updateWarrantyTemplateAction(
  _prevState: UpdateWarrantyTemplateState,
  formData: FormData
): Promise<UpdateWarrantyTemplateState> {
  const jobId = getString(formData, "jobId");
  const templateId = getString(formData, "templateId");
  const name = getString(formData, "name");
  const termMonthsRaw = getString(formData, "termMonths");
  const coverageNotes = getString(formData, "coverageNotes");
  const exclusions = getString(formData, "exclusions");
  if (!templateId) throw new Error("Missing templateId");
  if (!name) return { error: "Give the template a name." };

  const termMonths = Number(termMonthsRaw);
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    return { error: "Enter a term length in whole months, greater than zero." };
  }

  const { company } = await requireCapability("editJob");

  // Never a built-in — this is the one hard line: `companyId` must already
  // be this company's own, or the row isn't touched.
  const template = await prisma.warrantyTemplate.findFirst({
    where: { id: templateId, companyId: company.id },
  });
  if (!template) {
    return { error: "Built-in templates can't be edited directly — duplicate it first." };
  }

  await prisma.warrantyTemplate.update({
    where: { id: template.id },
    data: { name, termMonths, coverageNotes: coverageNotes || null, exclusions: exclusions || null },
  });

  if (jobId) revalidatePath(`/jobs/${jobId}`);
  return { savedAt: Date.now() };
}
