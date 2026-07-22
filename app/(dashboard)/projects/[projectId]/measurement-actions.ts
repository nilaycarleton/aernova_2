"use server";

import { revalidatePath } from "next/cache";
import { MeasurementType, MeasurementUnit, CaptureSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/auth";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number for ${key}`);
  }
  return parsed;
}

const allowedTypes = new Set([
  "AREA",
  "RIDGE",
  "PITCH",
  "WASTE_FACTOR",
  "EAVE",
  "VALLEY",
  "HIP",
]);

const allowedUnits = new Set([
  "SQFT",
  "FT",
  "RATIO",
  "PERCENT",
]);

const allowedSources = new Set([
  "MANUAL",
  "DRONE",
]);

/**
 * useActionState wrapper for the free-text create form: it returns validation
 * as state (so typed input survives) instead of letting createMeasurementAction
 * throw and unmount the form. The template quick-add buttons keep calling
 * createMeasurementAction directly — their label/value are fixed, never empty,
 * so they never hit this path.
 */
export type MeasurementFormState = { fieldErrors?: Record<string, string> };

export async function createMeasurementWithState(
  _prevState: MeasurementFormState,
  formData: FormData
): Promise<MeasurementFormState> {
  const label = String(formData.get("label") ?? "").trim();
  const displayValue = String(formData.get("displayValue") ?? "").trim();
  const fieldErrors: Record<string, string> = {};
  if (!label) fieldErrors.label = "Name this measurement.";
  if (!displayValue) fieldErrors.displayValue = "Add the value to show, like “3,240 sq ft”.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  await createMeasurementAction(formData);
  return {};
}

export async function createMeasurementAction(formData: FormData) {
  const projectId = getString(formData, "projectId");
  const label = getString(formData, "label");
  const displayValue = getString(formData, "displayValue");
  const typeRaw = getString(formData, "type");
  const unitRaw = getString(formData, "unit");
  const sourceRaw = getString(formData, "source");
  const confidenceRaw = getString(formData, "confidence");
  const sortOrderRaw = getString(formData, "sortOrder");

  if (!projectId) throw new Error("Missing projectId");
  if (!label) throw new Error("Label is required");
  if (!displayValue) throw new Error("Display value is required");
  if (!allowedTypes.has(typeRaw)) throw new Error("Invalid measurement type");
  if (!allowedUnits.has(unitRaw)) throw new Error("Invalid measurement unit");
  if (!allowedSources.has(sourceRaw)) throw new Error("Invalid measurement source");
  await requireProjectAccess(projectId);

  const value = getNumber(formData, "value");
  const confidence = confidenceRaw ? Number(confidenceRaw) : null;
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : 0;

  await prisma.measurement.create({
    data: {
      projectId,
      label,
      displayValue,
      type: typeRaw as MeasurementType,
      unit: unitRaw as MeasurementUnit,
      source: sourceRaw as CaptureSource,
      value,
      confidence,
      sortOrder,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateMeasurementAction(formData: FormData) {
  const measurementId = getString(formData, "measurementId");
  const projectId = getString(formData, "projectId");
  const label = getString(formData, "label");
  const displayValue = getString(formData, "displayValue");
  const typeRaw = getString(formData, "type");
  const unitRaw = getString(formData, "unit");
  const sourceRaw = getString(formData, "source");
  const confidenceRaw = getString(formData, "confidence");
  const sortOrderRaw = getString(formData, "sortOrder");

  if (!measurementId) throw new Error("Missing measurementId");
  if (!projectId) throw new Error("Missing projectId");
  if (!label) throw new Error("Label is required");
  if (!displayValue) throw new Error("Display value is required");
  if (!allowedTypes.has(typeRaw)) throw new Error("Invalid measurement type");
  if (!allowedUnits.has(unitRaw)) throw new Error("Invalid measurement unit");
  if (!allowedSources.has(sourceRaw)) throw new Error("Invalid measurement source");
  await requireProjectAccess(projectId);

  const value = getNumber(formData, "value");
  const confidence = confidenceRaw ? Number(confidenceRaw) : null;
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : 0;

  // Scope by projectId so owning `projectId` can't be paired with another
  // project's measurementId.
  const updated = await prisma.measurement.updateMany({
    where: { id: measurementId, projectId },
    data: {
      label,
      displayValue,
      type: typeRaw as MeasurementType,
      unit: unitRaw as MeasurementUnit,
      source: sourceRaw as CaptureSource,
      value,
      confidence,
      sortOrder,
    },
  });
  if (updated.count === 0) throw new Error("Measurement not found");

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteMeasurementAction(formData: FormData) {
  const measurementId = getString(formData, "measurementId");
  const projectId = getString(formData, "projectId");

  if (!measurementId) throw new Error("Missing measurementId");
  if (!projectId) throw new Error("Missing projectId");
  await requireProjectAccess(projectId);

  const deleted = await prisma.measurement.deleteMany({
    where: { id: measurementId, projectId },
  });
  if (deleted.count === 0) throw new Error("Measurement not found");

  revalidatePath(`/projects/${projectId}`);
}
