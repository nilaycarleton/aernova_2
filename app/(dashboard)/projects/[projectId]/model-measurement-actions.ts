"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CaptureSource, Measurement, MeasurementType, MeasurementUnit, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/auth";
import { generateRoofingReport } from "@/lib/report-generator";
import { resolveTexturedModelMeshText } from "@/lib/roof-extraction-service";
import { parseObjMesh, extractRoofMeasurements, mergeCoplanarFacets } from "@/lib/roof-mesh-extraction";
import {
  M2_TO_FT2,
  M_TO_FT,
  pitchFromNormal,
  polygonArea3D,
  polygonNormal,
  polylineLength,
  type Pt,
} from "@/lib/measure-geometry";

export type ModelMeasurementKind = "distance" | "area" | "height" | "marker";
/** Roofing role for a distance line (drives which estimate quantity it feeds). */
export type LineCategory = "ridge" | "hip" | "valley" | "eave" | "rake";

const KINDS = new Set<ModelMeasurementKind>(["distance", "area", "height", "marker"]);
const LINE_CATEGORIES = new Set<LineCategory>(["ridge", "hip", "valley", "eave", "rake"]);

export type ModelMeasurementInput = {
  id: string;
  projectId: string;
  kind: ModelMeasurementKind;
  points: [number, number, number][];
  label?: string | null;
  category?: LineCategory | null;
};

function validPoints(points: unknown): points is [number, number, number][] {
  return (
    Array.isArray(points) &&
    points.length > 0 &&
    points.every(
      (p) => Array.isArray(p) && p.length === 3 && p.every((n) => typeof n === "number" && Number.isFinite(n))
    )
  );
}

/** Persist one measurement drawn on the model. The client supplies the id so its
 *  optimistic row and the stored row stay in sync without a reconciliation pass. */
export async function saveModelMeasurementAction(input: ModelMeasurementInput) {
  await requireProjectAccess(input.projectId);
  if (!KINDS.has(input.kind)) throw new Error("Invalid measurement kind");
  if (!validPoints(input.points)) throw new Error("Measurement needs at least one 3D point");

  const category = input.category && LINE_CATEGORIES.has(input.category) ? input.category : null;
  await prisma.modelMeasurement.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      projectId: input.projectId,
      kind: input.kind,
      pointsJson: input.points as unknown as Prisma.InputJsonValue,
      label: input.label ?? null,
      category,
    },
    update: {
      kind: input.kind,
      pointsJson: input.points as unknown as Prisma.InputJsonValue,
      label: input.label ?? null,
      category,
    },
  });

  revalidatePath(`/projects/${input.projectId}`);
}

/** Assign (or clear) the roofing role of a distance line, so it feeds the right estimate quantity. */
export async function updateModelMeasurementCategoryAction(input: {
  projectId: string;
  id: string;
  category: LineCategory | null;
}) {
  await requireProjectAccess(input.projectId);
  const category = input.category && LINE_CATEGORIES.has(input.category) ? input.category : null;
  await prisma.modelMeasurement.updateMany({
    where: { id: input.id, projectId: input.projectId },
    data: { category },
  });
  revalidatePath(`/projects/${input.projectId}`);
}

export async function deleteModelMeasurementAction(input: { projectId: string; id: string }) {
  await requireProjectAccess(input.projectId);
  await prisma.modelMeasurement.deleteMany({ where: { id: input.id, projectId: input.projectId } });
  revalidatePath(`/projects/${input.projectId}`);
}

export async function clearModelMeasurementsAction(input: { projectId: string }) {
  await requireProjectAccess(input.projectId);
  await prisma.modelMeasurement.deleteMany({ where: { projectId: input.projectId } });
  revalidatePath(`/projects/${input.projectId}`);
}

export type DetectedFacet = {
  id: string;
  kind: "area";
  points: [number, number, number][];
  label: string | null;
  category: null;
};

/**
 * Auto-detect roof planes inside a region the user boxed on the 3D model, and
 * persist each as an area measurement they can then confirm/tweak. Runs the RANSAC
 * extractor on the textured (GLB-frame) mesh so results overlay the model, keeping
 * only sloped, elevated planes (drops ground and near-vertical walls). Best-effort:
 * the operator reviews and deletes any strays.
 */
export async function autoDetectRoofFacetsAction(input: {
  projectId: string;
  imageryId: string;
  roiPolygon: { x: number; y: number }[];
}): Promise<DetectedFacet[]> {
  await requireProjectAccess(input.projectId);
  if (!input.roiPolygon || input.roiPolygon.length < 3) {
    throw new Error("Draw a box around the roof before auto-detecting.");
  }

  const { text } = await resolveTexturedModelMeshText(input.projectId, input.imageryId);
  const extraction = extractRoofMeasurements(parseObjMesh(text), {
    roiPolygon: input.roiPolygon,
    maxRoofSlopeDeg: 48, // drop near-vertical walls before segmentation
  });
  // Keep sloped, elevated planes (real roof); drop flat ground/terrain and low bits.
  const roofPlanes = extraction.facets.filter(
    (f) => f.pitchDegrees >= 8 && f.pitchDegrees <= 48 && f.heightAboveBaseFt >= 6 && f.polygon.length >= 3
  );
  // Fuse over-segmented patches into whole faces, then drop tiny sliver fragments
  // (noise) relative to the biggest face so the operator reviews a clean set.
  const mergedFacets = mergeCoplanarFacets(roofPlanes).filter((f) => f.polygon.length >= 3);
  const maxArea = mergedFacets.reduce((m, f) => Math.max(m, f.surfaceAreaSqft), 0);
  const facets = mergedFacets.filter((f) => f.surfaceAreaSqft >= Math.max(40, maxArea * 0.12));
  if (facets.length === 0) {
    throw new Error("No roof planes were found in that box. Try boxing the roof more tightly.");
  }

  const created: DetectedFacet[] = [];
  for (const f of facets) {
    const id = crypto.randomUUID();
    const points = f.polygon as [number, number, number][];
    await prisma.modelMeasurement.create({
      data: { id, projectId: input.projectId, kind: "area", pointsJson: points as unknown as Prisma.InputJsonValue, label: `Auto ${f.pitchRatio}` },
    });
    created.push({ id, kind: "area", points, label: `Auto ${f.pitchRatio}`, category: null });
  }

  revalidatePath(`/projects/${input.projectId}`);
  return created;
}

/**
 * Turn the measurements drawn on the model into a roofing proposal: area polygons
 * become total roof area + area-weighted pitch + facet count; categorised distance
 * lines become ridge/hip/valley/eave/rake linear footage. These synthesise the
 * Measurement rows generateRoofingReport already understands, so on-model
 * measurements drive the estimate directly (no clash with other measurement rows),
 * then a DRAFT Proposal is created and opened.
 */
export async function generateEstimateFromMeasurementsAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  await requireProjectAccess(projectId);

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  const rows = await prisma.modelMeasurement.findMany({ where: { projectId } });
  const areas = rows.filter((r) => r.kind === "area").map((r) => r.pointsJson as unknown as Pt[]);
  if (areas.length === 0) {
    throw new Error("Draw at least one roof area on the model before generating an estimate.");
  }

  let totalSurfaceM2 = 0;
  let slopeWeightedByArea = 0;
  for (const poly of areas) {
    const a = polygonArea3D(poly);
    totalSurfaceM2 += a;
    slopeWeightedByArea += pitchFromNormal(polygonNormal(poly)).degrees * a;
  }
  const avgSlopeDeg = totalSurfaceM2 > 0 ? slopeWeightedByArea / totalSurfaceM2 : 0;
  const riseOver12 = Math.round(Math.tan((avgSlopeDeg * Math.PI) / 180) * 12);

  const lineFt: Record<string, number> = { ridge: 0, hip: 0, valley: 0, eave: 0, rake: 0 };
  for (const r of rows) {
    if (r.kind !== "distance" || !r.category || !(r.category in lineFt)) continue;
    lineFt[r.category] += polylineLength(r.pointsJson as unknown as Pt[]) * M_TO_FT;
  }

  // Only .type and .value are read by generateRoofingReport, so minimal rows suffice.
  const synthetic = [
    { type: MeasurementType.AREA, value: totalSurfaceM2 * M2_TO_FT2 },
    { type: MeasurementType.RIDGE, value: lineFt.ridge },
    { type: MeasurementType.HIP, value: lineFt.hip },
    { type: MeasurementType.VALLEY, value: lineFt.valley },
    { type: MeasurementType.EAVE, value: lineFt.eave },
    { type: MeasurementType.RAKE, value: lineFt.rake },
    { type: MeasurementType.PITCH, value: riseOver12 },
    { type: MeasurementType.FACET_COUNT, value: areas.length },
  ] as unknown as Measurement[];

  const report = generateRoofingReport(project, synthetic, []);
  const proposal = await prisma.proposal.create({
    data: {
      projectId,
      title: report.title,
      status: "DRAFT",
      totalAmount: report.totalAmount,
      scopeOfWork: JSON.stringify({
        summary: report.summary,
        sections: report.sections,
        lineItems: report.lineItems,
        totals: report.totals,
        plainTextScope: report.scopeOfWork,
      }),
    },
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?proposal=${proposal.id}`);
}

type ModelRow = { kind: string; category: string | null; pointsJson: unknown };

/** Roll drawn measurements up into roofing quantities (shared by estimate + materialize). */
function roofQuantitiesFromModelMeasurements(rows: ModelRow[]) {
  const areas = rows.filter((r) => r.kind === "area").map((r) => r.pointsJson as unknown as Pt[]);
  let totalSurfaceM2 = 0;
  let slopeWeighted = 0;
  for (const poly of areas) {
    const a = polygonArea3D(poly);
    totalSurfaceM2 += a;
    slopeWeighted += pitchFromNormal(polygonNormal(poly)).degrees * a;
  }
  const avgSlopeDeg = totalSurfaceM2 > 0 ? slopeWeighted / totalSurfaceM2 : 0;
  const lineFt: Record<string, number> = { ridge: 0, hip: 0, valley: 0, eave: 0, rake: 0 };
  for (const r of rows) {
    if (r.kind === "distance" && r.category && r.category in lineFt) {
      lineFt[r.category] += polylineLength(r.pointsJson as unknown as Pt[]) * M_TO_FT;
    }
  }
  return {
    areaCount: areas.length,
    totalAreaSqft: totalSurfaceM2 * M2_TO_FT2,
    riseOver12: Math.round(Math.tan((avgSlopeDeg * Math.PI) / 180) * 12),
    lineFt,
  };
}

const CATEGORY_TO_TYPE: Record<string, MeasurementType> = {
  ridge: MeasurementType.RIDGE,
  hip: MeasurementType.HIP,
  valley: MeasurementType.VALLEY,
  eave: MeasurementType.EAVE,
  rake: MeasurementType.RAKE,
};

const MODEL_MEASUREMENT_LABEL_PREFIX = "Model roof:";

/**
 * Materialise the drawn measurements into the project's standard Measurement
 * rows so they appear in the measurements panel (and the classic proposal
 * generator), not just the 3D viewer. Idempotent — replaces the previous
 * "Model roof:" rows each time.
 */
export async function saveModelMeasurementsToProjectAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  await requireProjectAccess(projectId);

  const rows = await prisma.modelMeasurement.findMany({ where: { projectId } });
  const q = roofQuantitiesFromModelMeasurements(rows);
  if (q.areaCount === 0 && Object.values(q.lineFt).every((v) => v === 0)) {
    throw new Error("Draw some measurements on the model first.");
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const base = { projectId, source: CaptureSource.DRONE, confidence: null };
  const toCreate: Prisma.MeasurementCreateManyInput[] = [];
  if (q.areaCount > 0) {
    const area = round1(q.totalAreaSqft);
    toCreate.push({ ...base, sortOrder: 20, type: MeasurementType.AREA, unit: MeasurementUnit.SQFT, label: `${MODEL_MEASUREMENT_LABEL_PREFIX} roof area`, value: area, displayValue: `${area.toLocaleString()} sq ft` });
    toCreate.push({ ...base, sortOrder: 21, type: MeasurementType.PITCH, unit: MeasurementUnit.RATIO, label: `${MODEL_MEASUREMENT_LABEL_PREFIX} predominant pitch`, value: q.riseOver12, displayValue: `${q.riseOver12}/12` });
    toCreate.push({ ...base, sortOrder: 22, type: MeasurementType.FACET_COUNT, unit: MeasurementUnit.COUNT, label: `${MODEL_MEASUREMENT_LABEL_PREFIX} facets`, value: q.areaCount, displayValue: `${q.areaCount} facets` });
  }
  let sort = 23;
  for (const [cat, ft] of Object.entries(q.lineFt)) {
    if (ft <= 0) continue;
    const len = round1(ft);
    toCreate.push({ ...base, sortOrder: sort++, type: CATEGORY_TO_TYPE[cat], unit: MeasurementUnit.FT, label: `${MODEL_MEASUREMENT_LABEL_PREFIX} ${cat}`, value: len, displayValue: `${len.toLocaleString()} ft` });
  }

  await prisma.$transaction([
    prisma.measurement.deleteMany({ where: { projectId, label: { startsWith: MODEL_MEASUREMENT_LABEL_PREFIX } } }),
    prisma.measurement.createMany({ data: toCreate }),
  ]);
  revalidatePath(`/projects/${projectId}`);
}
