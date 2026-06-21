import { readFile, mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  CaptureSource,
  MeasurementType,
  MeasurementUnit,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  parseObjMesh,
  extractRoofMeasurements,
  type RoofMeshExtraction,
} from "@/lib/roof-mesh-extraction";
import type { PlanPreview } from "@/lib/roof-extraction-types";

export type { PlanPreview } from "@/lib/roof-extraction-types";

// Label prefix used to tag RoofSection rows produced by mesh extraction, so a
// re-run can cleanly replace the previous extraction without touching
// manually-entered sections.
const FACET_LABEL_PREFIX = "Roof facet";

// Preferred ODM mesh assets for roof geometry, best first. The 2.5D textured
// mesh is a height-field surface and is the most reliable for roofs; the full
// textured mesh is the fallback.
const MESH_CANDIDATES = [
  "odm_texturing_25d/odm_textured_model_geo.obj",
  "odm_texturing/odm_textured_model_geo.obj",
];

function nodeOdmDataDir() {
  return process.env.NODEODM_DATA_DIR || path.join(process.cwd(), "nodeodm-data");
}

function metadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function getModelTaskUuid(metadataJson: unknown): string | null {
  const metadata = metadataObject(metadataJson);
  if (typeof metadata.nodeOdmTaskUuid === "string") return metadata.nodeOdmTaskUuid;
  if (typeof metadata.nodeOdxTaskUuid === "string") return metadata.nodeOdxTaskUuid;
  return null;
}

/** Resolve a readable local ODM mesh OBJ for a task, or null if none is on disk. */
async function resolveLocalMesh(taskUuid: string): Promise<{ assetPath: string; text: string } | null> {
  const dir = nodeOdmDataDir();
  for (const assetPath of MESH_CANDIDATES) {
    const text = await readFile(path.join(dir, taskUuid, assetPath), "utf8").catch(() => null);
    if (text) return { assetPath, text };
  }
  return null;
}

/**
 * Build a downsampled top-down elevation raster from the mesh so the operator can
 * draw a region-of-interest polygon over the building in plan view. Cells hold the
 * max vertex elevation falling in them (a simple DSM), normalised to 0-255.
 */
export async function buildPlanPreviewForModel(
  projectId: string,
  imageryId: string,
  maxWidth = 220
): Promise<PlanPreview> {
  const { mesh } = await loadModelMesh(projectId, imageryId);
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity, zMin = Infinity, zMax = -Infinity;
  for (const v of mesh.vertices) {
    if (v[0] < xMin) xMin = v[0];
    if (v[0] > xMax) xMax = v[0];
    if (v[1] < yMin) yMin = v[1];
    if (v[1] > yMax) yMax = v[1];
    if (v[2] < zMin) zMin = v[2];
    if (v[2] > zMax) zMax = v[2];
  }
  const spanX = Math.max(1e-6, xMax - xMin);
  const spanY = Math.max(1e-6, yMax - yMin);
  const width = Math.max(8, Math.min(maxWidth, Math.round(maxWidth)));
  const height = Math.max(8, Math.round((width * spanY) / spanX));
  const zSpan = Math.max(1e-6, zMax - zMin);

  const grid = new Float32Array(width * height).fill(-Infinity);
  for (const v of mesh.vertices) {
    const col = Math.min(width - 1, Math.floor(((v[0] - xMin) / spanX) * width));
    // Row 0 = north (max Y) so the preview reads like a map.
    const row = Math.min(height - 1, Math.floor(((yMax - v[1]) / spanY) * height));
    const idx = row * width + col;
    if (v[2] > grid[idx]) grid[idx] = v[2];
  }

  const bytes = new Uint8Array(width * height);
  for (let i = 0; i < grid.length; i++) {
    bytes[i] = grid[i] === -Infinity ? 0 : Math.round(((grid[i] - zMin) / zSpan) * 255);
  }

  return {
    width,
    height,
    bounds: { xMin, xMax, yMin, yMax },
    elevationGrid: Buffer.from(bytes).toString("base64"),
    baseElevationM: Math.round(zMin * 10) / 10,
    topElevationM: Math.round(zMax * 10) / 10,
  };
}

async function loadModelMesh(projectId: string, imageryId: string) {
  const model = await prisma.projectImagery.findFirst({
    where: { id: imageryId, projectId, type: "MODEL" },
  });
  if (!model) throw new Error("Model imagery record was not found");

  const taskUuid = getModelTaskUuid(model.metadataJson);
  if (!taskUuid) throw new Error("This model is not linked to a NodeODM task with a 3D mesh");

  const resolved = await resolveLocalMesh(taskUuid);
  if (!resolved) {
    throw new Error(
      "The ODM mesh for this model is not available locally yet. Sync the worker and download the model assets first."
    );
  }
  return { model, taskUuid, assetPath: resolved.assetPath, mesh: parseObjMesh(resolved.text) };
}

export type RoofExtractionResult = {
  extraction: RoofMeshExtraction;
  sectionsCreated: number;
  manifestUrl: string;
};

/**
 * Run real geometry extraction on the model mesh within the operator's ROI and
 * persist the result as RoofSection rows (one per facet) plus summary
 * Measurements. These feed the existing roof-intelligence, waste, and report
 * pipelines directly, replacing the formula-based placeholders.
 */
export async function extractAndPersistRoof(
  projectId: string,
  imageryId: string,
  roiPolygon: { x: number; y: number }[]
): Promise<RoofExtractionResult> {
  if (!roiPolygon || roiPolygon.length < 3) {
    throw new Error("Draw a region of interest around the roof before extracting measurements");
  }

  const { model, assetPath, mesh } = await loadModelMesh(projectId, imageryId);
  const extraction = extractRoofMeasurements(mesh, { roiPolygon });

  if (extraction.facetCount === 0) {
    throw new Error(
      "No roof planes were found inside the selected region. Tighten the region around the roof and try again."
    );
  }

  const manifestPayload = {
    kind: "aernova-roof-extraction" as const,
    version: 1 as const,
    generatedAt: new Date().toISOString(),
    sourceAsset: assetPath,
    roiPolygon,
    extraction,
  };
  const manifestUrl = await writeExtractionManifest(projectId, imageryId, manifestPayload);

  const facetSections = extraction.facets.map((facet, index) => ({
    projectId,
    label: `${FACET_LABEL_PREFIX} ${index + 1}`,
    planeIndex: index + 1,
    pitchRatio: facet.pitchRatio,
    pitchDegrees: facet.pitchDegrees,
    projectedAreaSqft: facet.projectedAreaSqft,
    surfaceAreaSqft: facet.surfaceAreaSqft,
    geometryJson: {
      source: "nodeodm-mesh-extraction",
      normal: facet.normal,
      triangleCount: facet.triangleCount,
      heightAboveBaseFt: facet.heightAboveBaseFt,
    } satisfies Prisma.InputJsonObject,
  }));

  const existingExtraction = metadataObject(model.extractedJson);

  await prisma.$transaction([
    // Replace any prior extraction-produced sections; leave manual sections intact.
    prisma.roofSection.deleteMany({
      where: { projectId, label: { startsWith: FACET_LABEL_PREFIX } },
    }),
    ...facetSections.map((data) => prisma.roofSection.create({ data })),
    prisma.projectImagery.update({
      where: { id: imageryId },
      data: {
        status: "READY",
        extractedJson: {
          ...existingExtraction,
          roofExtraction: {
            generatedAt: manifestPayload.generatedAt,
            facetCount: extraction.facetCount,
            totalSurfaceAreaSqft: extraction.totalSurfaceAreaSqft,
            totalProjectedAreaSqft: extraction.totalProjectedAreaSqft,
            roofSquares: extraction.roofSquares,
            predominantPitchRatio: extraction.predominantPitchRatio,
            predominantPitchDegrees: extraction.predominantPitchDegrees,
            pitchBreakdown: extraction.pitchBreakdown,
            diagnostics: extraction.diagnostics,
            manifestUrl,
          },
        } as unknown as Prisma.InputJsonValue,
        notes: `Roof measurements extracted from the ODM mesh: ${extraction.facetCount} facets, ${extraction.roofSquares} squares.`,
      },
    }),
  ]);

  await upsertSummaryMeasurement(projectId, {
    type: MeasurementType.AREA,
    unit: MeasurementUnit.SQFT,
    label: "Roof surface area (mesh)",
    value: extraction.totalSurfaceAreaSqft,
    displayValue: `${extraction.totalSurfaceAreaSqft.toLocaleString()} sq ft`,
  });
  await upsertSummaryMeasurement(projectId, {
    type: MeasurementType.PITCH,
    unit: MeasurementUnit.RATIO,
    label: "Predominant pitch (mesh)",
    value: extraction.predominantPitchDegrees,
    displayValue: extraction.predominantPitchRatio,
  });
  await upsertSummaryMeasurement(projectId, {
    type: MeasurementType.FACET_COUNT,
    unit: MeasurementUnit.COUNT,
    label: "Roof facets (mesh)",
    value: extraction.facetCount,
    displayValue: `${extraction.facetCount} facets`,
  });

  return { extraction, sectionsCreated: facetSections.length, manifestUrl };
}

async function upsertSummaryMeasurement(
  projectId: string,
  shape: {
    type: MeasurementType;
    unit: MeasurementUnit;
    label: string;
    value: number;
    displayValue: string;
  }
) {
  const existing = await prisma.measurement.findFirst({
    where: { projectId, label: shape.label, source: CaptureSource.DRONE },
  });
  const data = {
    projectId,
    source: CaptureSource.DRONE,
    sortOrder: 10,
    confidence: null,
    ...shape,
  };
  if (existing) {
    await prisma.measurement.update({ where: { id: existing.id }, data });
  } else {
    await prisma.measurement.create({ data });
  }
}

function extractionManifestDir(projectId: string, imageryId: string) {
  return path.join(process.cwd(), "public", "uploads", "processing", projectId, imageryId);
}

async function writeExtractionManifest(
  projectId: string,
  imageryId: string,
  payload: Prisma.InputJsonValue
) {
  const dir = extractionManifestDir(projectId, imageryId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "roof-extraction.json"), JSON.stringify(payload, null, 2));
  return `/uploads/processing/${projectId}/${imageryId}/roof-extraction.json`;
}
