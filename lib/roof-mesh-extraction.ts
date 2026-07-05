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
  /**
   * Ordered facet boundary in mesh metres (z-up), simplified to corners. Closed
   * (first vertex NOT repeated). Renderable as an overlay and editable via
   * viewer picks. Falls back to a planar convex hull if the triangle set does
   * not stitch into a clean loop.
   */
  polygon: Vec3[];
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
function normalize(a: Vec3): Vec3 {
  const m = norm(a) || 1;
  return [a[0] / m, a[1] / m, a[2] / m];
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
  /** Source mesh vertex indices, for reconstructing the facet boundary. */
  verts: [number, number, number];
};

/**
 * Stitch a facet's triangles into an ordered boundary loop (mesh vertex indices).
 * Boundary edges are those used by exactly one triangle in the facet; interior
 * edges are shared by two. Returns null if the boundary does not close into a
 * single loop (non-manifold / disconnected facet), so callers can fall back.
 */
function stitchBoundaryLoop(triVerts: [number, number, number][]): number[] | null {
  const edgeKey = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const counts = new Map<string, { a: number; b: number; count: number }>();
  const addEdge = (a: number, b: number) => {
    const key = edgeKey(a, b);
    const e = counts.get(key);
    if (e) e.count++;
    else counts.set(key, { a, b, count: 1 });
  };
  for (const [a, b, c] of triVerts) {
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  }
  const boundary = [...counts.values()].filter((e) => e.count === 1);
  if (boundary.length < 3) return null;

  const adj = new Map<number, number[]>();
  const link = (a: number, b: number) => {
    const list = adj.get(a);
    if (list) list.push(b);
    else adj.set(a, [b]);
  };
  for (const { a, b } of boundary) {
    link(a, b);
    link(b, a);
  }

  const start = boundary[0].a;
  const loop: number[] = [start];
  const usedEdge = new Set<string>();
  let current = start;
  let prev = -1;
  while (loop.length <= boundary.length + 1) {
    const neighbors = adj.get(current) ?? [];
    let next = -1;
    // Prefer an unused edge that does not immediately backtrack.
    for (const n of neighbors) {
      if (usedEdge.has(edgeKey(current, n))) continue;
      if (n === prev && neighbors.length > 1) continue;
      next = n;
      break;
    }
    if (next === -1) {
      for (const n of neighbors) {
        if (!usedEdge.has(edgeKey(current, n))) {
          next = n;
          break;
        }
      }
    }
    if (next === -1) return null; // open boundary, cannot close
    usedEdge.add(edgeKey(current, next));
    if (next === start) return loop; // closed
    loop.push(next);
    prev = current;
    current = next;
  }
  return null;
}

/** 2D convex hull (Andrew's monotone chain) fallback, preserving vertex indices. */
function convexHullOnPlane(
  triVerts: [number, number, number][],
  vertices: Vec3[],
  normal: Vec3
): Vec3[] {
  const uniq = new Set<number>();
  for (const t of triVerts) for (const i of t) uniq.add(i);
  const ref: Vec3 = Math.abs(normal[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = normalize(cross(normal, ref));
  const w = normalize(cross(normal, u));
  const pts = [...uniq]
    .map((i) => ({ i, x: dot(vertices[i], u), y: dot(vertices[i], w) }))
    .sort((p, q) => p.x - q.x || p.y - q.y);
  if (pts.length < 3) return pts.map((p) => vertices[p.i]);
  const crossZ = (o: typeof pts[0], a: typeof pts[0], b: typeof pts[0]) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: typeof pts = [];
  for (const p of pts) {
    while (lower.length >= 2 && crossZ(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: typeof pts = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && crossZ(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)].map((p) => vertices[p.i]);
}

/** Drop near-collinear vertices so a tessellated edge collapses to its corners. */
function simplifyCollinear(pts: Vec3[], epsRel = 1e-3): Vec3[] {
  if (pts.length <= 3) return pts;
  const out: Vec3[] = [];
  const n = pts.length;
  for (let k = 0; k < n; k++) {
    const prev = pts[(k - 1 + n) % n];
    const cur = pts[k];
    const next = pts[(k + 1) % n];
    const e1 = sub(cur, prev);
    const e2 = sub(next, cur);
    const denom = norm(e1) * norm(e2);
    if (denom > 0 && norm(cross(e1, e2)) / denom < epsRel) continue;
    out.push(cur);
  }
  return out.length >= 3 ? out : pts;
}

/** Build a facet's simplified boundary polygon (mesh metres) from its triangles. */
function facetBoundaryPolygon(
  triVerts: [number, number, number][],
  vertices: Vec3[],
  normal: Vec3
): Vec3[] {
  const loop = stitchBoundaryLoop(triVerts);
  const pts = loop && loop.length >= 3 ? loop.map((i) => vertices[i]) : convexHullOnPlane(triVerts, vertices, normal);
  return simplifyCollinear(pts);
}

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
    candidates.push({ centroid: [cx, cy, cz], normal: unit, area, verts: [ia, ib, ic] });
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
    const polygon = facetBoundaryPolygon(
      seg.tris.map((j) => roofCandidates[j].verts),
      vertices,
      seg.normal
    );
    return {
      label: `Facet ${i + 1}`,
      triangleCount: seg.tris.length,
      surfaceAreaSqft: round1(seg.areaM2 * M2_TO_FT2),
      projectedAreaSqft: round1(seg.projAreaM2 * M2_TO_FT2),
      pitchDegrees: round1(slopeDeg),
      pitchRatio: pitchRatioFromSlope(slopeDeg),
      heightAboveBaseFt: round1((meanZ - baseElevationM) * M_TO_FT),
      normal: seg.normal,
      polygon,
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

/** Convex hull of coplanar 3D points, projected onto their shared plane. */
function convexHullPoints(points: Vec3[], normal: Vec3): Vec3[] {
  if (points.length < 3) return points;
  const ref: Vec3 = Math.abs(normal[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = normalize(cross(normal, ref));
  const w = normalize(cross(normal, u));
  const pts = points
    .map((p, i) => ({ i, x: dot(p, u), y: dot(p, w) }))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const crossZ = (o: typeof pts[0], a: typeof pts[0], b: typeof pts[0]) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: typeof pts = [];
  for (const p of pts) {
    while (lower.length >= 2 && crossZ(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: typeof pts = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && crossZ(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)].map((p) => points[p.i]);
}

function polygonCentroid(poly: Vec3[]): Vec3 {
  const c: Vec3 = [0, 0, 0];
  for (const p of poly) {
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  }
  return [c[0] / poly.length, c[1] / poly.length, c[2] / poly.length];
}

function aabb(poly: Vec3[]): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of poly) {
    for (let k = 0; k < 3; k++) {
      if (p[k] < min[k]) min[k] = p[k];
      if (p[k] > max[k]) max[k] = p[k];
    }
  }
  return { min, max };
}

/** Do two facet outlines' bounding boxes overlap once each is grown by `margin`? */
function boxesNear(a: Vec3[], b: Vec3[], margin: number): boolean {
  const ba = aabb(a);
  const bb = aabb(b);
  for (let k = 0; k < 3; k++) {
    if (ba.min[k] - margin > bb.max[k] || bb.min[k] - margin > ba.max[k]) return false;
  }
  return true;
}

export type MergeCoplanarOptions = {
  /** Max angle (deg) between two facet normals to consider them the same slope. */
  normalToleranceDeg?: number;
  /** Max perpendicular offset (m) between the two supporting planes. */
  planeDistanceToleranceM?: number;
  /** Max gap (m) between the two facets' outlines — keeps distinct parallel faces apart. */
  proximityM?: number;
};

/**
 * Fuse over-segmented facets back into whole roof planes. Two facets merge when
 * they share nearly the same slope (normal), lie on the same plane, and touch —
 * the exact signature of one physical face the RANSAC pass split into patches.
 * Each merged group becomes a single convex facet on its area-weighted plane.
 * Distinct faces (different tilt) and separate parallel faces (a gap between them)
 * are left alone. Pure — see tests/merge-coplanar.test.ts.
 */
export function mergeCoplanarFacets(facets: RoofFacet[], options: MergeCoplanarOptions = {}): RoofFacet[] {
  const cfg = { normalToleranceDeg: 20, planeDistanceToleranceM: 1.2, proximityM: 1.5, ...options };
  const n = facets.length;
  if (n <= 1) return facets;

  const cosTol = Math.cos((cfg.normalToleranceDeg * Math.PI) / 180);
  const cents = facets.map((f) => polygonCentroid(f.polygon));

  // Union-Find over facets that pass all three tests.
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (dot(facets[i].normal, facets[j].normal) < cosTol) continue;
      const planeGap = Math.abs(dot(sub(cents[j], cents[i]), facets[i].normal));
      if (planeGap > cfg.planeDistanceToleranceM) continue;
      if (!boxesNear(facets[i].polygon, facets[j].polygon, cfg.proximityM)) continue;
      parent[find(i)] = find(j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const g = groups.get(root);
    if (g) g.push(i);
    else groups.set(root, [i]);
  }

  const merged: RoofFacet[] = [];
  for (const idxs of groups.values()) {
    if (idxs.length === 1) {
      merged.push(facets[idxs[0]]);
      continue;
    }
    let areaSum = 0;
    let projSum = 0;
    let heightWeighted = 0;
    let triCount = 0;
    let accN: Vec3 = [0, 0, 0];
    const verts: Vec3[] = [];
    for (const i of idxs) {
      const f = facets[i];
      const w = f.surfaceAreaSqft || 1;
      accN = [accN[0] + f.normal[0] * w, accN[1] + f.normal[1] * w, accN[2] + f.normal[2] * w];
      areaSum += f.surfaceAreaSqft;
      projSum += f.projectedAreaSqft;
      heightWeighted += f.heightAboveBaseFt * w;
      triCount += f.triangleCount;
      for (const p of f.polygon) verts.push(p);
    }
    const normal = normalize(accN);
    const polygon = simplifyCollinear(convexHullPoints(verts, normal));
    const slopeDeg = slopeDegFromNormalZ(normal[2]);
    const weightTotal = idxs.reduce((s, i) => s + (facets[i].surfaceAreaSqft || 1), 0);
    merged.push({
      label: "Facet",
      triangleCount: triCount,
      surfaceAreaSqft: round1(areaSum),
      projectedAreaSqft: round1(projSum),
      pitchDegrees: round1(slopeDeg),
      pitchRatio: pitchRatioFromSlope(slopeDeg),
      heightAboveBaseFt: round1(heightWeighted / weightTotal),
      normal,
      polygon,
    });
  }

  merged.sort((a, b) => b.surfaceAreaSqft - a.surfaceAreaSqft);
  return merged.map((f, i) => ({ ...f, label: `Facet ${i + 1}` }));
}
