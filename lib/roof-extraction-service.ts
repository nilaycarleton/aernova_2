import { readFile } from "fs/promises";
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
  type ParsedMesh,
  type RoofMeshExtraction,
} from "@/lib/roof-mesh-extraction";
import { downloadNodeOdmAllZip, extractZipEntry } from "@/lib/nodeodm-client";
import { storage } from "@/lib/storage";
import {
  ROOF_FACET_GEOMETRY_VERSION,
  type PlanPreview,
  type RoofFacetGeometry,
} from "@/lib/roof-extraction-types";

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

// Per-model cache key for an OBJ downloaded from a remote node, kept next to the
// other processing outputs (S3 or local disk) so a second extraction does not
// re-download it.
function meshCacheKey(projectId: string, imageryId: string) {
  return `processing/${projectId}/${imageryId}/mesh-extract.obj`;
}

/**
 * Resolve the ODM mesh OBJ text for a model from, in order: the local ODM data
 * dir (worker on the same box), a previously cached download, or a fresh
 * download from the (possibly remote / Lightning) node. The last path is what
 * makes mesh extraction work when ODM runs off-box instead of on local disk.
 */
async function resolveMeshText(
  taskUuid: string,
  projectId: string,
  imageryId: string
): Promise<{ assetPath: string; text: string } | null> {
  const local = await resolveLocalMesh(taskUuid);
  if (local) return local;

  const cached = await storage.getBytes(meshCacheKey(projectId, imageryId));
  if (cached) return { assetPath: "cache/mesh-extract.obj", text: cached.toString("utf8") };

  const fromZip = await meshFromZip(taskUuid);
  if (fromZip) {
    await storage.put(meshCacheKey(projectId, imageryId), Buffer.from(fromZip.text, "utf8"), "text/plain");
    return fromZip;
  }
  return null;
}

// NodeODM only serves the all.zip archive, so pull it once and extract the best
// available mesh OBJ (2.5D preferred) by its path within the archive.
async function meshFromZip(taskUuid: string): Promise<{ assetPath: string; text: string } | null> {
  let zip: Buffer;
  try {
    zip = await downloadNodeOdmAllZip(taskUuid);
  } catch {
    return null;
  }
  for (const assetPath of MESH_CANDIDATES) {
    const entry = extractZipEntry(zip, assetPath);
    if (entry) return { assetPath, text: entry.toString("utf8") };
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
    suggestedRoiPolygon: suggestFootprintPolygon(bytes, width, height),
  };
}

/**
 * Propose a building footprint from the elevation raster so the operator starts
 * from a suggested ROI instead of a blank canvas. We threshold the upper band of
 * the elevation range, take the largest connected blob of elevated cells, and
 * return its bounding box (grid-pixel coords). Conservative: returns undefined
 * when nothing clearly stands above the ground so we never suggest noise.
 */
function suggestFootprintPolygon(
  bytes: Uint8Array,
  width: number,
  height: number
): { x: number; y: number }[] | undefined {
  const nonZero = Array.from(bytes).filter((value) => value > 0).sort((a, b) => a - b);
  if (nonZero.length < 16) return undefined;

  // Threshold at the 65th percentile of elevated cells: targets roofs/structures
  // while leaving low ground out. Floor it so very flat scenes still get a cut.
  const threshold = Math.max(40, nonZero[Math.floor(nonZero.length * 0.65)]);
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < bytes.length; i++) mask[i] = bytes[i] >= threshold ? 1 : 0;

  // Largest 4-connected component of masked cells (iterative BFS).
  const visited = new Uint8Array(width * height);
  let best = { size: 0, minCol: 0, maxCol: 0, minRow: 0, maxRow: 0 };
  const queue = new Int32Array(width * height);

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    let size = 0;
    let minCol = width, maxCol = 0, minRow = height, maxRow = 0;

    while (head < tail) {
      const idx = queue[head++];
      const col = idx % width;
      const row = (idx - col) / width;
      size++;
      if (col < minCol) minCol = col;
      if (col > maxCol) maxCol = col;
      if (row < minRow) minRow = row;
      if (row > maxRow) maxRow = row;

      const neighbors = [
        col > 0 ? idx - 1 : -1,
        col < width - 1 ? idx + 1 : -1,
        row > 0 ? idx - width : -1,
        row < height - 1 ? idx + width : -1,
      ];
      for (const n of neighbors) {
        if (n >= 0 && mask[n] && !visited[n]) {
          visited[n] = 1;
          queue[tail++] = n;
        }
      }
    }

    if (size > best.size) best = { size, minCol, maxCol, minRow, maxRow };
  }

  // Require the blob to be a meaningful fraction of the scene to be a real roof.
  if (best.size < Math.max(12, width * height * 0.01)) return undefined;

  // Inset by one cell so the box hugs the structure rather than its halo.
  const x0 = Math.max(0, best.minCol + 1);
  const x1 = Math.min(width, best.maxCol);
  const y0 = Math.max(0, best.minRow + 1);
  const y1 = Math.min(height, best.maxRow);
  if (x1 - x0 < 2 || y1 - y0 < 2) return undefined;

  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

/**
 * Resolve the raw OBJ text of a model's extraction mesh (local disk, cache, or a
 * fresh worker download). This is the SAME mesh the extractor runs on, so a
 * viewer rendering it shares the extractor's metre coordinate frame — which the
 * in-3D annotation tools depend on (the GLB is in a different frame).
 */
export async function resolveModelMeshText(
  projectId: string,
  imageryId: string
): Promise<{ assetPath: string; text: string }> {
  const model = await prisma.projectImagery.findFirst({
    where: { id: imageryId, projectId, type: "MODEL" },
  });
  if (!model) throw new Error("Model imagery record was not found");

  const taskUuid = getModelTaskUuid(model.metadataJson);
  if (!taskUuid) throw new Error("This model is not linked to a NodeODM task with a 3D mesh");

  const resolved = await resolveMeshText(taskUuid, projectId, imageryId);
  if (!resolved) {
    throw new Error(
      "The ODM mesh for this model could not be loaded. Make sure the worker task is complete, then sync it and try again."
    );
  }
  return resolved;
}

// The full-3D textured OBJ. Unlike the 2.5D height-field, this shares the exact
// coordinate frame of the viewer GLB — so facets extracted from it overlay the
// GLB precisely, which on-model auto-detect requires.
const TEXTURED_MESH_ASSET = "odm_texturing/odm_textured_model_geo.obj";

/**
 * Resolve the full-3D textured OBJ text (viewer-GLB frame) for on-model
 * auto-detect. Local disk first, then a per-model cache, then the worker zip.
 */
export async function resolveTexturedModelMeshText(
  projectId: string,
  imageryId: string
): Promise<{ assetPath: string; text: string }> {
  const model = await prisma.projectImagery.findFirst({
    where: { id: imageryId, projectId, type: "MODEL" },
  });
  if (!model) throw new Error("Model imagery record was not found");
  const taskUuid = getModelTaskUuid(model.metadataJson);
  if (!taskUuid) throw new Error("This model is not linked to a NodeODM task with a 3D mesh");

  const local = await readFile(path.join(nodeOdmDataDir(), taskUuid, TEXTURED_MESH_ASSET), "utf8").catch(() => null);
  if (local) return { assetPath: TEXTURED_MESH_ASSET, text: local };

  const cacheKey = `processing/${projectId}/${imageryId}/mesh-textured.obj`;
  const cached = await storage.getBytes(cacheKey);
  if (cached) return { assetPath: "cache/mesh-textured.obj", text: cached.toString("utf8") };

  try {
    const zip = await downloadNodeOdmAllZip(taskUuid);
    const entry = extractZipEntry(zip, TEXTURED_MESH_ASSET);
    if (entry) {
      await storage.put(cacheKey, entry, "text/plain");
      return { assetPath: TEXTURED_MESH_ASSET, text: entry.toString("utf8") };
    }
  } catch {
    // fall through to the error below
  }
  throw new Error("The textured 3D mesh for this model could not be loaded.");
}

// In-process cache of parsed textured meshes, so re-detecting on the same model
// (adjusting the ROI box) skips re-reading + re-parsing the ~30MB OBJ.
const texturedMeshCache = new Map<string, ParsedMesh>();

/** Resolve + parse the textured (GLB-frame) mesh, cached per model in-process. */
export async function resolveTexturedModelMesh(projectId: string, imageryId: string): Promise<ParsedMesh> {
  const key = `${projectId}:${imageryId}`;
  const cached = texturedMeshCache.get(key);
  if (cached) return cached;
  const { text } = await resolveTexturedModelMeshText(projectId, imageryId);
  const mesh = parseObjMesh(text);
  if (texturedMeshCache.size >= 3) {
    const oldest = texturedMeshCache.keys().next().value;
    if (oldest) texturedMeshCache.delete(oldest);
  }
  texturedMeshCache.set(key, mesh);
  return mesh;
}

async function loadModelMesh(projectId: string, imageryId: string) {
  const model = await prisma.projectImagery.findFirst({
    where: { id: imageryId, projectId, type: "MODEL" },
  });
  if (!model) throw new Error("Model imagery record was not found");

  const taskUuid = getModelTaskUuid(model.metadataJson);
  if (!taskUuid) throw new Error("This model is not linked to a NodeODM task with a 3D mesh");

  const resolved = await resolveMeshText(taskUuid, projectId, imageryId);
  if (!resolved) {
    throw new Error(
      "The ODM mesh for this model could not be loaded. Make sure the worker task is complete, then sync it and try again."
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

  const facetSections = extraction.facets.map((facet, index) => {
    const geometry: RoofFacetGeometry = {
      version: ROOF_FACET_GEOMETRY_VERSION,
      source: "auto",
      polygon: facet.polygon,
      normal: facet.normal,
      triangleCount: facet.triangleCount,
      heightAboveBaseFt: facet.heightAboveBaseFt,
      extractor: "nodeodm-mesh-extraction",
    };
    return {
      projectId,
      label: `${FACET_LABEL_PREFIX} ${index + 1}`,
      planeIndex: index + 1,
      pitchRatio: facet.pitchRatio,
      pitchDegrees: facet.pitchDegrees,
      projectedAreaSqft: facet.projectedAreaSqft,
      surfaceAreaSqft: facet.surfaceAreaSqft,
      source: "auto",
      geometryJson: geometry as unknown as Prisma.InputJsonObject,
    };
  });

  const existingExtraction = metadataObject(model.extractedJson);

  await prisma.$transaction([
    // Replace any prior extraction-produced sections; leave manual sections
    // intact. Match by `source` (the durable signal); also match legacy rows
    // that predate the source column via the historical label prefix.
    prisma.roofSection.deleteMany({
      where: {
        projectId,
        OR: [{ source: "auto" }, { source: null, label: { startsWith: FACET_LABEL_PREFIX } }],
      },
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

async function writeExtractionManifest(
  projectId: string,
  imageryId: string,
  payload: Prisma.InputJsonValue
) {
  const key = `processing/${projectId}/${imageryId}/roof-extraction.json`;
  await storage.put(key, Buffer.from(JSON.stringify(payload, null, 2)), "application/json");
  return storage.url(key);
}
