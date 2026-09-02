"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireJobAccess } from "@/lib/auth";

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

/**
 * Validation and save failures are returned, not thrown, so the form and its
 * input survive both: `fieldErrors` for per-field problems, `formError` for a
 * failed save the roofer can retry.
 */
export type SectionFormState = { fieldErrors?: Record<string, string>; formError?: string };

export async function createRoofSectionAction(
  _prevState: SectionFormState,
  formData: FormData
): Promise<SectionFormState> {
  const jobId = getString(formData, "jobId");
  const label = getString(formData, "label");

  if (!jobId) return { formError: "Something went wrong. Reload the page and try again." };
  if (!label) return { fieldErrors: { label: "Name this facet or structure." } };

  try {
    await requireJobAccess(jobId, "editJob");
    const pitchRatio = getString(formData, "pitchRatio");

    await prisma.roofSection.create({
      data: {
        jobId,
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

    revalidatePath(`/jobs/${jobId}`);
    revalidatePath(`/jobs/${jobId}/report`);
    return {};
  } catch {
    // A bad number or a DB/network hiccup — keep the roofer's input and let them retry.
    return { formError: "Couldn't save this facet. Please try again." };
  }
}

export async function updateRoofSectionAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const sectionId = getString(formData, "sectionId");
  const label = getString(formData, "label");
  const pitchRatio = getString(formData, "pitchRatio");

  if (!jobId) throw new Error("Missing jobId");
  if (!sectionId) throw new Error("Missing sectionId");
  if (!label) throw new Error("Structure or facet label is required");
  await requireJobAccess(jobId, "editJob");

  const updated = await prisma.roofSection.updateMany({
    where: { id: sectionId, jobId },
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

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/report`);
}

/**
 * useActionState wrapper for the inline facet edit form: validation and save
 * failures come back as state so the roofer's edits survive in the still-mounted
 * form, the same recovery contract as createRoofSectionAction.
 */
export async function updateRoofSectionWithState(
  _prevState: SectionFormState,
  formData: FormData
): Promise<SectionFormState> {
  const label = getString(formData, "label");
  if (!label) return { fieldErrors: { label: "Name this facet or structure." } };
  try {
    await updateRoofSectionAction(formData);
    return {};
  } catch {
    return { formError: "Couldn't save your changes. Please try again." };
  }
}

export async function deleteRoofSectionAction(formData: FormData) {
  const jobId = getString(formData, "jobId");
  const sectionId = getString(formData, "sectionId");

  if (!jobId) throw new Error("Missing jobId");
  if (!sectionId) throw new Error("Missing sectionId");
  await requireJobAccess(jobId, "editJob");

  const deleted = await prisma.roofSection.deleteMany({
    where: { id: sectionId, jobId },
  });
  if (deleted.count === 0) throw new Error("Roof section not found");

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/report`);
}
