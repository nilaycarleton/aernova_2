"use server";

import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { requireJobAccess } from "@/lib/auth";

/**
 * What a crew member writes back from the field: a photo against the visit
 * they're standing on, and a note. Both gated on `completeVisit` — the one
 * capability crew hold — rather than `editJob`, which is what the office's
 * inspection upload uses. Those are deliberately two different doors: an
 * office upload can retag or delete a photo; a field one can only add.
 *
 * Client-side, `components/today/field-capture-panel.tsx` calls these directly
 * (not through `<form action>`) so it can catch a dropped connection and queue
 * the attempt for retry — see `lib/offline/field-queue.ts`.
 */

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function verifyVisit(companyId: string, jobId: string, visitId: string) {
  const visit = await prisma.visit.findFirst({
    where: { id: visitId, jobId, companyId },
    select: { id: true },
  });
  if (!visit) throw new Error("Visit not found");
}

export async function uploadVisitPhotoAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const visitId = getString(formData, "visitId");
  const caption = getString(formData, "caption");
  const file = formData.get("photo");

  if (!jobId || !visitId) throw new Error("Missing jobId or visitId");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a photo to upload");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image uploads are supported");
  }

  const { companyId } = await requireJobAccess(jobId, "completeVisit");
  await verifyVisit(companyId, jobId, visitId);

  const extension = path.extname(file.name).toLowerCase() || ".jpg";
  const storedName = `${randomUUID()}${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { url } = await storage.put(`field/${jobId}/${visitId}/${storedName}`, bytes, file.type);

  await prisma.photoAsset.create({
    data: {
      jobId,
      visitId,
      url,
      fileName: file.name,
      contentType: file.type,
      caption: caption || null,
    },
  });

  revalidatePath("/today");
  revalidatePath(`/jobs/${jobId}`);
}

/** Appended to, never overwritten — a second crew member's note shouldn't erase the first. */
export async function saveVisitNoteAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const visitId = getString(formData, "visitId");
  const note = getString(formData, "note");

  if (!jobId || !visitId) throw new Error("Missing jobId or visitId");
  if (!note) return;

  const { companyId } = await requireJobAccess(jobId, "completeVisit");

  const visit = await prisma.visit.findFirst({
    where: { id: visitId, jobId, companyId },
    select: { notes: true },
  });
  if (!visit) throw new Error("Visit not found");

  const notes = visit.notes ? `${visit.notes}\n\n${note}` : note;
  await prisma.visit.update({ where: { id: visitId }, data: { notes } });

  revalidatePath("/today");
  revalidatePath(`/jobs/${jobId}`);
}
