"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Put somebody on a visit.
 *
 * This is the write that makes a crew account mean anything: until a person is
 * on a visit, `jobScopeForRole` narrows them to nothing and they see an empty
 * schedule. Assignment is the only thing that opens a job to them, which is why
 * it is guarded by `manageSchedule` and not by anything softer.
 *
 * The user being assigned is checked against *this* company's membership, not
 * just against the users table — a forged userId from another company would
 * otherwise hand a stranger a standing view of these jobs.
 */
export async function assignVisitAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const visitId = getString(formData, "visitId");
  const userId = getString(formData, "userId");
  if (!jobId || !visitId || !userId) return;

  const { companyId } = await requireJobAccess(jobId, "manageSchedule");

  const [visit, membership] = await Promise.all([
    prisma.visit.findFirst({ where: { id: visitId, jobId, companyId }, select: { id: true } }),
    prisma.companyMembership.findFirst({
      where: { companyId, userId },
      select: { id: true },
    }),
  ]);
  if (!visit || !membership) return;

  // Idempotent: assigning twice is a double-click, not a second person.
  await prisma.visitAssignment.upsert({
    where: { visitId_userId: { visitId, userId } },
    create: { visitId, userId },
    update: {},
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
}

/** Take somebody off. Their history of the visit stays; their access ends. */
export async function unassignVisitAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const visitId = getString(formData, "visitId");
  const userId = getString(formData, "userId");
  if (!jobId || !visitId || !userId) return;

  const { companyId } = await requireJobAccess(jobId, "manageSchedule");

  const visit = await prisma.visit.findFirst({
    where: { id: visitId, jobId, companyId },
    select: { id: true },
  });
  if (!visit) return;

  await prisma.visitAssignment.deleteMany({ where: { visitId, userId } });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/schedule");
}
