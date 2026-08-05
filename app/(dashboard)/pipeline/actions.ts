"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability, requireJobAccess } from "@/lib/auth";
import { can } from "@/lib/permissions";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Item 41's salesperson assignment — the one write path for both halves of
 * the board, kept here rather than in `requests/actions.ts` or
 * `jobs/[jobId]/status-actions.ts` because assignment is deliberately
 * `/pipeline`-only for now (confirmed with the user rather than guessed):
 * there is no picker anywhere else in the product yet, so this is the one
 * place the write happens.
 *
 * `userId` empty clears the assignment — a lead or a job can go back to
 * unowned, same as it started.
 */
async function resolveAssignee(companyId: string, userId: string): Promise<string | null> {
  if (!userId) return null;

  // Whoever is being assigned has to actually be able to own a deal — the
  // same `editJob` gate that lets someone move a card at all. Without this,
  // the picker would let a card get "assigned" to a crew member who can't
  // even see it on the board.
  const membership = await prisma.companyMembership.findFirst({
    where: { companyId, userId },
    select: { role: true },
  });
  if (!membership || !can(membership.role, "editJob")) {
    throw new Error("That person can't be assigned to a deal.");
  }
  return userId;
}

export async function assignRequestSalespersonAction(formData: FormData) {
  const requestId = getString(formData, "requestId");
  const userId = getString(formData, "userId");
  if (!requestId) throw new Error("Missing requestId");

  const { company } = await requireCapability("editJob");
  const assignedToId = await resolveAssignee(company.id, userId);

  await prisma.request.updateMany({
    where: { id: requestId, companyId: company.id },
    data: { assignedToId },
  });

  revalidatePath("/pipeline");
}

export async function assignJobSalespersonAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const userId = getString(formData, "userId");
  if (!jobId) throw new Error("Missing jobId");

  const { companyId } = await requireJobAccess(jobId, "editJob");
  const assignedToId = await resolveAssignee(companyId, userId);

  await prisma.job.update({
    where: { id: jobId },
    data: { assignedToId },
  });

  revalidatePath("/pipeline");
}
