"use server";

import { revalidatePath } from "next/cache";
import { ActivityKind, JobProgressState } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { jobProgressStateLabel } from "@/lib/job-progress";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export type SaveJobProgressStateState = { error?: string; savedAt?: number };

const VALID_STATES = new Set<string>(Object.values(JobProgressState));

/**
 * §7.8/§14.5/§25 Phase 9 — the crew's own read on a job in progress: one of
 * five plain states, never a percentage. Gated on `submitFieldEvidence`,
 * the same crew-tier capability the quality-evidence panel already uses,
 * for the same reason: this is what a crew member observed, not a
 * decision about the job. Never touches `Job.status`, never touches
 * `QualityCheck`, and never writes `Job.progressPercent` — the office's
 * own signal stays independent (§14.5's "independent in v1").
 */
export async function saveJobProgressStateAction(
  _prevState: SaveJobProgressStateState,
  formData: FormData
): Promise<SaveJobProgressStateState> {
  const jobId = getString(formData, "jobId");
  const stateRaw = getString(formData, "progressState");
  if (!jobId) throw new Error("Missing jobId");
  if (!VALID_STATES.has(stateRaw)) {
    return { error: "Pick one of the five options." };
  }
  const nextState = stateRaw as JobProgressState;

  const { companyId, userId } = await requireJobAccess(jobId, "submitFieldEvidence");

  const existing = await prisma.job.findUnique({
    where: { id: jobId },
    select: { progressState: true },
  });
  const previousState = existing?.progressState ?? null;

  // A re-tap of the state that's already saved is not a change worth a
  // timeline line — same "a history row should mean something happened"
  // reasoning `updateJobStatusAction` already applies to its own no-op guard.
  if (previousState !== nextState) {
    await prisma.job.update({ where: { id: jobId }, data: { progressState: nextState } });

    await recordActivity({
      companyId,
      jobId,
      kind: ActivityKind.PROGRESS_UPDATED,
      actorUserId: userId,
      meta: {
        source: "crew",
        from: previousState ? jobProgressStateLabel(previousState) : undefined,
        to: jobProgressStateLabel(nextState),
      },
    });
  }

  revalidatePath("/today");
  revalidatePath(`/jobs/${jobId}`);
  return { savedAt: Date.now() };
}
