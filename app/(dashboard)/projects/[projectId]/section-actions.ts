"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/auth";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalNumber(formData: FormData, key: string) {
  const raw = getString(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  if (Number.isNaN(value)) throw new Error(`Invalid number for ${key}`);
  return value;
}

export async function createRoofSectionAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const label = getString(formData, "label");
  const pitchRatio = getString(formData, "pitchRatio");

  if (!projectId) throw new Error("Missing projectId");
  if (!label) throw new Error("Structure or facet label is required");
  await requireProjectAccess(projectId);

  await prisma.roofSection.create({
    data: {
      projectId,
      label,
      source: "manual",
      pitchRatio: pitchRatio || null,
      surfaceAreaSqft: getOptionalNumber(formData, "surfaceAreaSqft"),
      ridgeLengthFt: getOptionalNumber(formData, "ridgeLengthFt"),
      hipLengthFt: getOptionalNumber(formData, "hipLengthFt"),
      valleyLengthFt: getOptionalNumber(formData, "valleyLengthFt"),
      eaveLengthFt: getOptionalNumber(formData, "eaveLengthFt"),
      rakeLengthFt: getOptionalNumber(formData, "rakeLengthFt"),
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/report`);
}

export async function updateRoofSectionAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const sectionId = getString(formData, "sectionId");
  const label = getString(formData, "label");
  const pitchRatio = getString(formData, "pitchRatio");

  if (!projectId) throw new Error("Missing projectId");
  if (!sectionId) throw new Error("Missing sectionId");
  if (!label) throw new Error("Structure or facet label is required");
  await requireProjectAccess(projectId);

  const updated = await prisma.roofSection.updateMany({
    where: { id: sectionId, projectId },
    data: {
      label,
      pitchRatio: pitchRatio || null,
      pitchDegrees: getOptionalNumber(formData, "pitchDegrees"),
      projectedAreaSqft: getOptionalNumber(formData, "projectedAreaSqft"),
      surfaceAreaSqft: getOptionalNumber(formData, "surfaceAreaSqft"),
      ridgeLengthFt: getOptionalNumber(formData, "ridgeLengthFt"),
      hipLengthFt: getOptionalNumber(formData, "hipLengthFt"),
      valleyLengthFt: getOptionalNumber(formData, "valleyLengthFt"),
      eaveLengthFt: getOptionalNumber(formData, "eaveLengthFt"),
      rakeLengthFt: getOptionalNumber(formData, "rakeLengthFt"),
    },
  });
  if (updated.count === 0) throw new Error("Roof section not found");

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/report`);
}

export async function deleteRoofSectionAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const sectionId = getString(formData, "sectionId");

  if (!projectId) throw new Error("Missing projectId");
  if (!sectionId) throw new Error("Missing sectionId");
  await requireProjectAccess(projectId);

  const deleted = await prisma.roofSection.deleteMany({
    where: { id: sectionId, projectId },
  });
  if (deleted.count === 0) throw new Error("Roof section not found");

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/report`);
}
