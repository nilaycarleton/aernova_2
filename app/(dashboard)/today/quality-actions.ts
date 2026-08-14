"use server";

import { revalidatePath } from "next/cache";
import { ActivityKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export type SubmitFieldEvidenceState = { error?: string; submittedAt?: number };

/**
 * What a crew member observed on site — not a decision about the job.
 * Gated on `submitFieldEvidence` rather than `completeVisit`: evidence and
 * "I'm done with this visit" are different facts, and a role holding one
 * shouldn't need the other. Writes only the field-evidence half of
 * `QualityCheck` — see `lib/quality-check.ts` and `lib/permissions.ts` for
 * the crew/office split this exists to protect. Never touches `Job.status`;
 * only `completeQualityCheckAction` (office-only) can move a job to
 * COMPLETED, and only once its own three fields are set.
 */
export async function submitFieldEvidenceAction(
  _prevState: SubmitFieldEvidenceState,
  formData: FormData
): Promise<SubmitFieldEvidenceState> {
  const jobId = getString(formData, "jobId");
  if (!jobId) throw new Error("Missing jobId");

  const siteCleaned = formData.get("siteCleaned") === "on";
  const photosUploaded = formData.get("photosUploaded") === "on";
  const fieldEvidenceNotes = getString(formData, "fieldEvidenceNotes");

  const { companyId, userId } = await requireJobAccess(jobId, "submitFieldEvidence");

  await prisma.qualityCheck.upsert({
    where: { jobId },
    create: {
      jobId,
      siteCleaned,
      photosUploaded,
      fieldEvidenceNotes: fieldEvidenceNotes || null,
      fieldEvidenceSubmittedAt: new Date(),
      fieldEvidenceSubmittedByUserId: userId,
    },
    update: {
      siteCleaned,
      photosUploaded,
      fieldEvidenceNotes: fieldEvidenceNotes || null,
      fieldEvidenceSubmittedAt: new Date(),
      fieldEvidenceSubmittedByUserId: userId,
    },
  });

  await recordActivity({
    companyId,
    jobId,
    kind: ActivityKind.QUALITY_CHECK_EVIDENCE_SUBMITTED,
    actorUserId: userId,
  });

  revalidatePath("/today");
  revalidatePath(`/jobs/${jobId}`);
  return { submittedAt: Date.now() };
}
