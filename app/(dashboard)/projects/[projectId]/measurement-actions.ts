"use server";

import { revalidatePath } from "next/cache";
import { MeasurementType, MeasurementUnit, CaptureSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
  "SATELLITE",
  "DRONE",
]);

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

  const value = getNumber(formData, "value");
  const confidence = confidenceRaw ? Number(confidenceRaw) : null;
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : 0;

  await prisma.measurement.update({
    where: { id: measurementId },
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

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteMeasurementAction(formData: FormData) {
  const measurementId = getString(formData, "measurementId");
  const projectId = getString(formData, "projectId");

  if (!measurementId) throw new Error("Missing measurementId");
  if (!projectId) throw new Error("Missing projectId");

  await prisma.measurement.delete({
    where: { id: measurementId },
  });

  revalidatePath(`/projects/${projectId}`);
}