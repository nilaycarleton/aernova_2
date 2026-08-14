"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export type SavePreConstructionChecklistState = { error?: string; savedAt?: number };

/**
 * The office's one write path for `PreConstructionChecklist` — gated on
 * `editJob`, the same tier a Change Order's create/save already uses (§19.1
 * precedent), rather than a new capability: this is office/estimator
 * judgment about a job that's already been won, not a distinct money- or
 * crew-facing permission. Never called from `/today`.
 *
 * Stamps `confirmedAt`/`confirmedByUserId` the first time all four
 * office-controlled fields become true, sticky like `QualityCheck.completedAt`
 * — but unlike that gate, nothing downstream reads `confirmedAt` to block
 * anything (see `lib/pre-construction.ts`).
 */
export async function savePreConstructionChecklistAction(
  _prevState: SavePreConstructionChecklistState,
  formData: FormData
): Promise<SavePreConstructionChecklistState> {
  const jobId = getString(formData, "jobId");
  if (!jobId) throw new Error("Missing jobId");

  const materialsConfirmed = formData.get("materialsConfirmed") === "on";
  const materialsNotes = getString(formData, "materialsNotes");
  const permitsChecked = formData.get("permitsChecked") === "on";
  const permitRequiredRaw = getString(formData, "permitRequired");
  const permitRequired = permitRequiredRaw === "" ? null : permitRequiredRaw === "yes";
  const permitNotes = getString(formData, "permitNotes");
  const crewReady = formData.get("crewReady") === "on";
  const startDateConfirmed = formData.get("startDateConfirmed") === "on";
  const readinessNotes = getString(formData, "readinessNotes");

  const { userId } = await requireJobAccess(jobId, "editJob");

  const existing = await prisma.preConstructionChecklist.findUnique({
    where: { jobId },
    select: { confirmedAt: true },
  });

  const nowConfirms =
    materialsConfirmed && permitsChecked && crewReady && startDateConfirmed && !existing?.confirmedAt;

  await prisma.preConstructionChecklist.upsert({
    where: { jobId },
    create: {
      jobId,
      materialsConfirmed,
      materialsNotes: materialsNotes || null,
      permitsChecked,
      permitRequired,
      permitNotes: permitNotes || null,
      crewReady,
      startDateConfirmed,
      readinessNotes: readinessNotes || null,
      confirmedAt: nowConfirms ? new Date() : undefined,
      confirmedByUserId: nowConfirms ? userId : undefined,
    },
    update: {
      materialsConfirmed,
      materialsNotes: materialsNotes || null,
      permitsChecked,
      permitRequired,
      permitNotes: permitNotes || null,
      crewReady,
      startDateConfirmed,
      readinessNotes: readinessNotes || null,
      ...(nowConfirms ? { confirmedAt: new Date(), confirmedByUserId: userId } : {}),
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  return { savedAt: Date.now() };
}
