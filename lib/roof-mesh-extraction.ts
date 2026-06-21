/**
 * Real roof measurement extraction from an ODM textured mesh (OBJ).
 *
 * The ODM output is a mesh of the ENTIRE captured scene (ground, trees, walls,
 * one or more buildings). To produce trustworthy roof numbers we:
 *   1. Clip the mesh to an operator-supplied region of interest (ROI) polygon
 *      drawn in plan view (mesh X/Y, metres) so only the target building remains.
 *   2. Segment the clipped triangles into planar roof facets by region growing
 *      on normal direction + plane distance (a RANSAC-style greedy fit). Walls
 *      and fragmented vegetation fall out naturally because they do not form
 *      large, coherent planes.
 *   3. Compute real per-facet surface area, projected (footprint) area, and
 *      pitch from the geometry. Units in the mesh are metres (ODM UTM, +units=m).
 *
 * This module is pure (no Prisma / Node-only APIs beyond string parsing) so it
 * can be unit-tested directly against a real OBJ.
 */

const M2_TO_FT2 = 10.7639104167;
const M_TO_FT = 3.280839895;

export type Vec3 = [number, number, number];

export type RoofFacet = {
  /** 1-based label, largest facet first. */
  label: string;
  triangleCount: number;
  surfaceAreaSqft: number;
  /** Horizontal (footprint) area of the facet. */
  projectedAreaSqft: number;
  pitchDegrees: number;
  /** Rounded rise over a 12 run, e.g. "7/12". */
  pitchRatio: string;
  /** Mean elevation of the facet above the ROI ground reference, in feet. */
  heightAboveBaseFt: number;
  /** Area-weighted unit normal (z up). */
  normal: Vec3;
};

export type RoofMeshExtraction = {
  facetCount: number;
  totalSurfaceAreaSqft: number;
  totalProjectedAreaSqft: number;
  predominantPitchRatio: string;
  predominantPitchDegrees: number;
  /** Roof squares (100 sqft) from surface area. */
  roofSquares: number;
  facets: RoofFacet[];
  pitchBreakdown: { pitch: string; areaSqft: number; percent: number }[];
  diagnostics: {
    meshVertices: number;
    meshTriangles: number;
    trianglesInRoi: number;
    trianglesSegmented: number;
    roiCoveragePercent: number;
    baseElevationM: number;
    discardedWallAreaSqft: number;
    discardedUnsegmentedAreaSqft: number;
  };
};

export type ParsedMesh = {
  vertices: Vec3[];
  /** Triangles as vertex-index triples (0-based). */
  triangles: [number, number, number][];
};

export type ExtractionOptions = {
  /**
   * ROI polygon in mesh X/Y (metres), ordered. If omitted the whole mesh is used
   * (only sensible for already-cropped single-building meshes).
   */
  roiPolygon?: { x: number; y: number }[];
  /** Max angle (deg) between a triangle normal and the facet normal to join it. */
  normalToleranceDeg?: number;
  /** Max distance (m) from a triangle centroid to the facet plane to join it. */
  planeDistanceToleranceM?: number;
  /** Minimum facet surface area (m^2) to keep a segment as a real roof plane. */
  minFacetAreaM2?: number;
  /** Slopes steeper than this (deg) are treated as walls, not roof. */
  maxRoofSlopeDeg?: number;
};

const DEFAULTS = {
  normalToleranceDeg: 18,
  planeDistanceToleranceM: 0.35,
  minFacetAreaM2: 4,
  maxRoofSlopeDeg: 70,
};

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function norm(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

/** Parse a Wavefront OBJ into vertices and triangulated faces. */
export function parseObjMesh(objText: string): ParsedMesh {
  const vertices: Vec3[] = [];
  const triangles: [number, number, number][] = [];
  // Iterate line by line without allocating one giant array of every line.
  let start = 0;
  const len = objText.length;
  while (start < len) {
    let end = objText.indexOf("\n", start);
    if (end === -1) end = len;
    const line = objText.slice(start, end);
    start = end + 1;
    if (line.charCodeAt(0) === 118 /* v */ && line.charCodeAt(1) === 32 /* space */) {
      const p = line.split(/\s+/);
      vertices.push([Number(p[1]), Number(p[2]), Number(p[3])]);
    } else if (line.charCodeAt(0) === 102 /* f */ && line.charCodeAt(1) === 32) {
      const parts = line.slice(2).trim().split(/\s+/);
      const idx: number[] = [];
      for (const part of parts) {
        // "v", "v/vt", "v//vn", "v/vt/vn"
        const slash = part.indexOf("/");
        const v = slash === -1 ? Number(part) : Number(part.slice(0, slash));
        idx.push(v > 0 ? v - 1 : vertices.length + v); // handle negative (relative) indices
      }
      // Fan-triangulate polygons.
      for (let i = 1; i < idx.length - 1; i++) {
        triangles.push([idx[0], idx[i], idx[i + 1]]);
      }
    }
  }
  return { vertices, triangles };
}

/** Ray-casting point-in-polygon on the X/Y plane. */
function pointInPolygon(x: number, y: number, poly: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

type Triangle = {
  centroid: Vec3;
  /** Unit normal oriented z-up. */
  normal: Vec3;
  /** Surface area in m^2. */
  area: number;
};

function slopeDegFromNormalZ(nz: number): number {
  return (Math.acos(Math.min(1, Math.max(0, Math.abs(nz)))) * 180) / Math.PI;
}

function pitchRatioFromSlope(slopeDeg: number): string {
  const rise = Math.round(Math.tan((slopeDeg * Math.PI) / 180) * 12);
  return `${rise}/12`;
}

/**
 * Extract roof facets from a parsed mesh.
 */
export function extractRoofMeasurements(
  mesh: ParsedMesh,
  options: ExtractionOptions = {}
): RoofMeshExtraction {
  const cfg = { ...DEFAULTS, ...options };
  const { vertices, triangles } = mesh;
  const roi = options.roiPolygon && options.roiPolygon.length >= 3 ? options.roiPolygon : null;

  // Build candidate triangles within the ROI, with geometry precomputed.
  const candidates: Triangle[] = [];
  let trianglesInRoi = 0;
  let baseElevationM = Infinity;
  for (const [ia, ib, ic] of triangles) {
    const A = vertices[ia], B = vertices[ib], C = vertices[ic];
    if (!A || !B || !C) continue;
    const cx = (A[0] + B[0] + C[0]) / 3;
    const cy = (A[1] + B[1] + C[1]) / 3;
    if (roi && !pointInPolygon(cx, cy, roi)) continue;
    trianglesInRoi++;
    const cz = (A[2] + B[2] + C[2]) / 3;
    if (cz < baseElevationM) baseElevationM = cz;
    const n = cross(sub(B, A), sub(C, A));
    const mag = norm(n);
    if (mag === 0) continue;
    const area = mag / 2;
    // Orient normal z-up.
    const unit: Vec3 = n[2] >= 0 ? [n[0] / mag, n[1] / mag, n[2] / mag] : [-n[0] / mag, -n[1] / mag, -n[2] / mag];
    candidates.push({ centroid: [cx, cy, cz], normal: unit, area });
  }
  if (!Number.isFinite(baseElevationM)) baseElevationM = 0;

  // Separate walls (too steep to be roof) before segmentation.
  const cosMaxRoof = Math.cos((cfg.maxRoofSlopeDeg * Math.PI) / 180);
  let discardedWallAreaM2 = 0;
  const roofCandidates: Triangle[] = [];
  for (const t of candidates) {
    if (t.normal[2] < cosMaxRoof) {
      discardedWallAreaM2 += t.area;
    } else {
      roofCandidates.push(t);
    }
  }

  // Spatial grid over centroid X/Y so plane growth only touches nearby triangles
  // (a global rescan per seed is O(n^2) and far too slow for a 300k-triangle mesh).
  const CELL = 2.0; // metres
  const grid = new Map<number, number[]>();
  const GRID_SPAN = 100000; // enough to make a collision-free integer cell key
  const cellKey = (cx: number, cy: number) =>
    (Math.floor(cx / CELL) + GRID_SPAN) * (GRID_SPAN * 2) + (Math.floor(cy / CELL) + GRID_SPAN);
  for (let i = 0; i < roofCandidates.length; i++) {
    const c = roofCandidates[i].centroid;
    const key = cellKey(c[0], c[1]);
    const bucket = grid.get(key);
    if (bucket) bucket.push(i);
    else grid.set(key, [i]);
  }

  // Largest triangles seed planes first.
  const order = roofCandidates
    .map((_, i) => i)
    .sort((a, b) => roofCandidates[b].area - roofCandidates[a].area);
  const used = new Uint8Array(roofCandidates.length);
  const cosNormalTol = Math.cos((cfg.normalToleranceDeg * Math.PI) / 180);

  type Segment = { tris: number[]; areaM2: number; normal: Vec3; projAreaM2: number };
  const segments: Segment[] = [];
  let segmentedAreaM2 = 0;

  for (const seedIdx of order) {
    if (used[seedIdx]) continue;
    const seed = roofCandidates[seedIdx];
    const planePoint = seed.centroid;
    let planeNormal = seed.normal;
    const tris: number[] = [seedIdx];
    used[seedIdx] = 1;
    let areaM2 = seed.area;
    // Accumulate area-weighted normal as we grow for a more stable plane.
    let accN: Vec3 = [seed.normal[0] * seed.area, seed.normal[1] * seed.area, seed.normal[2] * seed.area];

    // Flood fill: grow the plane through spatially adjacent matching triangles.
    const queue: number[] = [seedIdx];
    while (queue.length > 0) {
      const current = queue.pop()!;
      const cc = roofCandidates[current].centroid;
      const baseCellX = Math.floor(cc[0] / CELL);
      const baseCellY = Math.floor(cc[1] / CELL);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const bucket = grid.get(
            (baseCellX + dx + GRID_SPAN) * (GRID_SPAN * 2) + (baseCellY + dy + GRID_SPAN)
          );
          if (!bucket) continue;
          for (const j of bucket) {
            if (used[j]) continue;
            const t = roofCandidates[j];
            if (dot(t.normal, planeNormal) < cosNormalTol) continue;
            const distance = Math.abs(dot(sub(t.centroid, planePoint), planeNormal));
            if (distance > cfg.planeDistanceToleranceM) continue;
            used[j] = 1;
            tris.push(j);
            queue.push(j);
            areaM2 += t.area;
            accN = [accN[0] + t.normal[0] * t.area, accN[1] + t.normal[1] * t.area, accN[2] + t.normal[2] * t.area];
          }
        }
      }
    }

    if (areaM2 < cfg.minFacetAreaM2) {
      // Too small to be a real roof plane; leave its triangles burned so we
      // don't reprocess noise, but don't record it as a facet.
      continue;
    }

    const accMag = norm(accN);
    if (accMag > 0) planeNormal = [accN[0] / accMag, accN[1] / accMag, accN[2] / accMag];
    const projAreaM2 = areaM2 * Math.abs(planeNormal[2]);
    segments.push({ tris, areaM2, normal: planeNormal, projAreaM2 });
    segmentedAreaM2 += areaM2;
  }

  // Build facet results, largest first.
  segments.sort((a, b) => b.areaM2 - a.areaM2);
  const facets: RoofFacet[] = segments.map((seg, i) => {
    const slopeDeg = slopeDegFromNormalZ(seg.normal[2]);
    // Mean elevation of the facet.
    let zsum = 0;
    for (const j of seg.tris) zsum += roofCandidates[j].centroid[2];
    const meanZ = zsum / seg.tris.length;
    return {
      label: `Facet ${i + 1}`,
      triangleCount: seg.tris.length,
      surfaceAreaSqft: round1(seg.areaM2 * M2_TO_FT2),
      projectedAreaSqft: round1(seg.projAreaM2 * M2_TO_FT2),
      pitchDegrees: round1(slopeDeg),
      pitchRatio: pitchRatioFromSlope(slopeDeg),
      heightAboveBaseFt: round1((meanZ - baseElevationM) * M_TO_FT),
      normal: seg.normal,
    };
  });

  const totalSurfaceAreaSqft = round1(segmentedAreaM2 * M2_TO_FT2);
  const totalProjectedAreaSqft = round1(segments.reduce((s, x) => s + x.projAreaM2, 0) * M2_TO_FT2);

  // Pitch breakdown by surface area.
  const pitchMap = new Map<string, number>();
  for (const f of facets) {
    pitchMap.set(f.pitchRatio, (pitchMap.get(f.pitchRatio) ?? 0) + f.surfaceAreaSqft);
  }
  const pitchBreakdown = Array.from(pitchMap.entries())
    .map(([pitch, areaSqft]) => ({
      pitch,
      areaSqft: round1(areaSqft),
      percent: totalSurfaceAreaSqft > 0 ? Math.round((areaSqft / totalSurfaceAreaSqft) * 100) : 0,
    }))
    .sort((a, b) => b.areaSqft - a.areaSqft);

  const predominant = pitchBreakdown[0];
  const predominantPitchDegrees = facets.length
    ? round1(
        facets.reduce((s, f) => s + f.pitchDegrees * f.surfaceAreaSqft, 0) /
          Math.max(1, facets.reduce((s, f) => s + f.surfaceAreaSqft, 0))
      )
    : 0;

  return {
    facetCount: facets.length,
    totalSurfaceAreaSqft,
    totalProjectedAreaSqft,
    predominantPitchRatio: predominant?.pitch ?? "0/12",
    predominantPitchDegrees,
    roofSquares: round1(totalSurfaceAreaSqft / 100),
    facets,
    pitchBreakdown,
    diagnostics: {
      meshVertices: vertices.length,
      meshTriangles: triangles.length,
      trianglesInRoi,
      trianglesSegmented: segments.reduce((s, x) => s + x.tris.length, 0),
      roiCoveragePercent:
        trianglesInRoi > 0
          ? Math.round((segments.reduce((s, x) => s + x.tris.length, 0) / trianglesInRoi) * 100)
          : 0,
      baseElevationM: round1(baseElevationM),
      discardedWallAreaSqft: round1(discardedWallAreaM2 * M2_TO_FT2),
      discardedUnsegmentedAreaSqft: round1(
        Math.max(0, roofCandidates.reduce((s, t) => s + t.area, 0) - segmentedAreaM2) * M2_TO_FT2
      ),
    },
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
