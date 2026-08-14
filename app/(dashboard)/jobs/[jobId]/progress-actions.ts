"use server";

import { revalidatePath } from "next/cache";
import { ActivityKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export type SaveJobProgressPercentState = { error?: string; savedAt?: number };

/**
 * §7.8/§14.5/§25 Phase 9 — the office's own precision override: an exact
 * percentage, for when a crew member's five-state read isn't precise
 * enough for how the office wants to report progress. Gated on `editJob`,
 * the same tier the Pre-Construction Checklist already uses for an office
 * judgment call. Blank clears it — the display then falls back to the
 * crew's state or the computed visit count, never a blank UI. Never
 * touches `Job.progressState` — the two signals stay independent.
 */
export async function saveJobProgressPercentAction(
  _prevState: SaveJobProgressPercentState,
  formData: FormData
): Promise<SaveJobProgressPercentState> {
  const jobId = getString(formData, "jobId");
  const raw = getString(formData, "progressPercent");
  if (!jobId) throw new Error("Missing jobId");

  let nextPercent: number | null;
  if (raw === "") {
    nextPercent = null;
  } else {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      return { error: "Enter a whole number from 0 to 100, or leave it blank to clear it." };
    }
    nextPercent = parsed;
  }

  const { companyId, userId } = await requireJobAccess(jobId, "editJob");

  const existing = await prisma.job.findUnique({
    where: { id: jobId },
    select: { progressPercent: true },
  });
  const previousPercent = existing?.progressPercent ?? null;

  // Saving the same number again (or clearing an already-null field) is not
  // a change worth a timeline line.
  if (previousPercent !== nextPercent) {
    await prisma.job.update({ where: { id: jobId }, data: { progressPercent: nextPercent } });

    await recordActivity({
      companyId,
      jobId,
      kind: ActivityKind.PROGRESS_UPDATED,
      actorUserId: userId,
      meta: { source: "office", previousPercent, nextPercent },
    });
  }

  revalidatePath(`/jobs/${jobId}`);
  return { savedAt: Date.now() };
}
