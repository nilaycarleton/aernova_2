"use server";

import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { keyFromUrl, storage } from "@/lib/storage";
import { requireProjectAccess } from "@/lib/auth";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function uploadInspectionPhotoAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const locationTag = getString(formData, "locationTag");
  const caption = getString(formData, "caption");
  const roofIssueId = getString(formData, "roofIssueId");
  const file = formData.get("photo");

  if (!projectId) throw new Error("Missing projectId");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a photo to upload");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image uploads are supported");
  }
  await requireProjectAccess(projectId);

  const extension = path.extname(file.name).toLowerCase() || ".jpg";
  const storedName = `${randomUUID()}${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { url } = await storage.put(`inspections/${projectId}/${storedName}`, bytes, file.type);

  await prisma.photoAsset.create({
    data: {
      projectId,
      roofIssueId: roofIssueId || null,
      url,
      fileName: file.name,
      contentType: file.type,
      locationTag: locationTag || null,
      caption: caption || null,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/report`);
}

export async function updateInspectionPhotoAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const photoId = getString(formData, "photoId");
  const roofIssueId = getString(formData, "roofIssueId");

  if (!projectId) throw new Error("Missing projectId");
  if (!photoId) throw new Error("Missing photoId");
  await requireProjectAccess(projectId);

  const updated = await prisma.photoAsset.updateMany({
    where: { id: photoId, projectId },
    data: {
      locationTag: getString(formData, "locationTag") || null,
      caption: getString(formData, "caption") || null,
      roofIssueId: roofIssueId || null,
    },
  });
  if (updated.count === 0) throw new Error("Photo not found");

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/report`);
}

export async function savePhotoAnnotationsAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const photoId = getString(formData, "photoId");
  const annotationsRaw = getString(formData, "annotationsJson");

  if (!projectId) throw new Error("Missing projectId");
  if (!photoId) throw new Error("Missing photoId");
  await requireProjectAccess(projectId);

  let annotations: Prisma.InputJsonValue = [];

  if (annotationsRaw) {
    try {
      annotations = JSON.parse(annotationsRaw) as Prisma.InputJsonValue;
    } catch {
      throw new Error("Invalid annotation data");
    }
  }

  const updated = await prisma.photoAsset.updateMany({
    where: { id: photoId, projectId },
    data: {
      annotationsJson: annotations,
    },
  });
  if (updated.count === 0) throw new Error("Photo not found");

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/report`);
}

/**
 * Remove one inspection photo and its stored bytes. A roofer who uploads the
 * wrong picture had no way to take it back, and the photo library feeds the
 * report a homeowner reads — so this has to reach storage, not just the row.
 * Storage cleanup is best-effort so a missing file can't make a photo permanent.
 */
export async function deleteInspectionPhotoAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const photoId = getString(formData, "photoId");

  if (!projectId) throw new Error("Missing projectId");
  if (!photoId) throw new Error("Missing photoId");
  await requireProjectAccess(projectId);

  const photo = await prisma.photoAsset.findFirst({
    where: { id: photoId, projectId },
    select: { id: true, url: true },
  });
  if (!photo) throw new Error("Photo not found");

  await prisma.photoAsset.delete({ where: { id: photo.id } });

  try {
    await storage.delete(keyFromUrl(photo.url));
  } catch {
    // Already gone, or the driver lost it. The row is what the UI reads.
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/report`);
}
