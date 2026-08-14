"use server";

import { revalidatePath } from "next/cache";
import { ActivityKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export type SaveQualityCheckState = { error?: string; savedAt?: number };

/**
 * The office half of `QualityCheck` — the only write path for
 * scope/deficiencies/walkthrough, gated on `completeQualityCheck`
 * (office-tier, never crew — see `lib/permissions.ts`).
 *
 * One form, one save, rather than a separate "finalize" button: the moment
 * all three become true for the first time *is* what §20 calls "final
 * completion" — `completedAt`/`completedByUserId` are stamped and
 * `QUALITY_CHECK_COMPLETED` is recorded right here, atomically with the
 * save that made it true. Sticky once set: unchecking a box afterward
 * doesn't erase the historical fact that it was completed on a given date,
 * the same doctrine `Quote.acceptedAt`/`ChangeOrder.approvedAt` already use.
 */
export async function saveQualityCheckAction(
  _prevState: SaveQualityCheckState,
  formData: FormData
): Promise<SaveQualityCheckState> {
  const jobId = getString(formData, "jobId");
  if (!jobId) throw new Error("Missing jobId");

  const scopeCompleted = formData.get("scopeCompleted") === "on";
  const deficienciesResolved = formData.get("deficienciesResolved") === "on";
  const walkthroughCompleted = formData.get("walkthroughCompleted") === "on";
  const walkthroughNotes = getString(formData, "walkthroughNotes");

  const { companyId, userId } = await requireJobAccess(jobId, "completeQualityCheck");

  const existing = await prisma.qualityCheck.findUnique({
    where: { jobId },
    select: { completedAt: true },
  });

  const nowCompletes =
    scopeCompleted && deficienciesResolved && walkthroughCompleted && !existing?.completedAt;

  await prisma.qualityCheck.upsert({
    where: { jobId },
    create: {
      jobId,
      scopeCompleted,
      deficienciesResolved,
      walkthroughCompleted,
      walkthroughNotes: walkthroughNotes || null,
      completedAt: nowCompletes ? new Date() : undefined,
      completedByUserId: nowCompletes ? userId : undefined,
    },
    update: {
      scopeCompleted,
      deficienciesResolved,
      walkthroughCompleted,
      walkthroughNotes: walkthroughNotes || null,
      ...(nowCompletes ? { completedAt: new Date(), completedByUserId: userId } : {}),
    },
  });

  if (nowCompletes) {
    await recordActivity({
      companyId,
      jobId,
      kind: ActivityKind.QUALITY_CHECK_COMPLETED,
      actorUserId: userId,
    });
  }

  revalidatePath(`/jobs/${jobId}`);
  return { savedAt: Date.now() };
}
