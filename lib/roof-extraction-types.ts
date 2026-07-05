// Shared, dependency-free types for the roof mesh extraction feature.
//
// These live apart from the service (which imports Prisma/fs) and the "use server"
// actions module so client components can type action inputs/outputs without
// pulling server-only modules through the server-action boundary.

export type PlanPreview = {
  width: number;
  height: number;
  /** Mesh X/Y bounds (metres) the preview maps onto; used to convert ROI px -> mesh coords. */
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  /** Base64 grayscale elevation grid, row-major, top row = max Y (north up). */
  elevationGrid: string;
  baseElevationM: number;
  topElevationM: number;
  /**
   * Auto-detected building footprint in grid-pixel coordinates (same space as
   * the preview canvas), or undefined when no clear structure was found. Used to
   * seed the ROI so the operator confirms/adjusts instead of drawing from
   * scratch.
   */
  suggestedRoiPolygon?: { x: number; y: number }[];
};

// ---------------------------------------------------------------------------
// Annotation geometry (Phase 1 data model).
//
// A facet's editable/renderable geometry is stored in RoofSection.geometryJson
// as a versioned RoofFacetGeometry. Coordinates are mesh metres, z-up — the
// SAME frame the extractor works in — so a stored polygon re-projects onto the
// 3D model exactly, and a viewer pick (matrixWorld^-1 -> metres) can edit it.
// ---------------------------------------------------------------------------

/** How a facet came to exist. Mirrors the top-level RoofSection.source column. */
export type FacetSource = "auto" | "manual";

/** Roofing edge classification (Phase 4 fills these from facet adjacency). */
export type RoofEdgeType = "ridge" | "hip" | "valley" | "eave" | "rake" | "unknown";

/** A boundary vertex in mesh metres, z-up. */
export type FacetVertex = [number, number, number];

/** One boundary edge of a facet, referencing polygon vertex indices. */
export type FacetEdge = {
  /** Index into `polygon` of the edge's start vertex. */
  from: number;
  /** Index into `polygon` of the edge's end vertex (usually from+1, wrapping). */
  to: number;
  type: RoofEdgeType;
  lengthFt: number;
};

export const ROOF_FACET_GEOMETRY_VERSION = 1 as const;

/** Structured geometry persisted in RoofSection.geometryJson. */
export type RoofFacetGeometry = {
  version: typeof ROOF_FACET_GEOMETRY_VERSION;
  source: FacetSource;
  /** Ordered, closed facet boundary (do not repeat the first vertex). */
  polygon: FacetVertex[];
  /** Area-weighted unit normal, z-up. */
  normal: FacetVertex;
  /** Per-edge roofing classification; absent until Phase 4 computes it. */
  edges?: FacetEdge[];
  /** Material/price mapping applied to this facet; absent until Phase 5. */
  priceMapping?: Record<string, unknown>;
  /** Provenance carried from mesh extraction (auto facets only). */
  triangleCount?: number;
  heightAboveBaseFt?: number;
  extractor?: string;
};

function isVertex(value: unknown): value is FacetVertex {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

/**
 * Safely parse a RoofSection.geometryJson blob into RoofFacetGeometry, or null
 * if it is missing/legacy/malformed. Legacy auto rows (pre-Phase-1) stored
 * `{ source: "nodeodm-mesh-extraction", normal, ... }` with no polygon; those
 * return null here (callers treat them as "no drawable geometry yet").
 */
export function parseRoofFacetGeometry(value: unknown): RoofFacetGeometry | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.version !== ROOF_FACET_GEOMETRY_VERSION) return null;
  if (v.source !== "auto" && v.source !== "manual") return null;
  if (!Array.isArray(v.polygon) || v.polygon.length < 3 || !v.polygon.every(isVertex)) return null;
  if (!isVertex(v.normal)) return null;
  return value as RoofFacetGeometry;
}

export type RoofExtractionSummary = {
  facetCount: number;
  totalSurfaceAreaSqft: number;
  totalProjectedAreaSqft: number;
  roofSquares: number;
  predominantPitchRatio: string;
  pitchBreakdown: { pitch: string; areaSqft: number; percent: number }[];
  diagnostics: {
    trianglesInRoi: number;
    trianglesSegmented: number;
  };
  sectionsCreated: number;
};
