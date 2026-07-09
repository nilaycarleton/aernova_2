/**
 * Classify the edges where roof facets meet into ridge / hip / valley, from the
 * facet polygons alone (mesh metres, z-up). For each nearby facet pair we take
 * the intersection LINE of their two planes (robust even when the facet outlines
 * are rough), clip it to the overlap, and classify by geometry:
 *   - facets fold UP to the edge (centroids below it) -> ridge (horizontal) / hip (sloped)
 *   - facets fold DOWN to the edge (centroids above it) -> valley
 * Pure — see tests/edge-classification.test.ts. Best-effort on rough facets.
 */
export type Pt = [number, number, number];
export type RoofEdgeCategory = "ridge" | "hip" | "valley" | "eave" | "rake";
export type ClassifiedEdge = { category: RoofEdgeCategory; points: [Pt, Pt] };

type V = [number, number, number];

/** Area-weighted plane normal (Newell's method), oriented z-up. */
function polygonNormal(points: Pt[]): V {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < points.length; i++) {
    const c = points[i];
    const n = points[(i + 1) % points.length];
    nx += (c[1] - n[1]) * (c[2] + n[2]);
    ny += (c[2] - n[2]) * (c[0] + n[0]);
    nz += (c[0] - n[0]) * (c[1] + n[1]);
  }
  const mag = Math.hypot(nx, ny, nz);
  if (mag === 0) return [0, 0, 1];
  const s = nz >= 0 ? 1 : -1;
  return [(s * nx) / mag, (s * ny) / mag, (s * nz) / mag];
}
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V, b: V): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V): number => Math.hypot(a[0], a[1], a[2]);
const normalize = (a: V): V => {
  const m = len(a) || 1;
  return [a[0] / m, a[1] / m, a[2] / m];
};

function centroid(poly: Pt[]): Pt {
  const c: V = [0, 0, 0];
  for (const p of poly) {
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  }
  return [c[0] / poly.length, c[1] / poly.length, c[2] / poly.length];
}

function bbox(poly: Pt[]) {
  const min: V = [Infinity, Infinity, Infinity];
  const max: V = [-Infinity, -Infinity, -Infinity];
  for (const p of poly)
    for (let k = 0; k < 3; k++) {
      if (p[k] < min[k]) min[k] = p[k];
      if (p[k] > max[k]) max[k] = p[k];
    }
  return { min, max };
}

function boxesOverlap(a: ReturnType<typeof bbox>, b: ReturnType<typeof bbox>, margin: number): boolean {
  for (let k = 0; k < 3; k++) if (a.min[k] - margin > b.max[k] || b.min[k] - margin > a.max[k]) return false;
  return true;
}

// Perpendicular distance from point p to the line through p0 with unit direction dir.
function distPointToLine(p: Pt, p0: Pt, dir: V): number {
  const w = sub(p, p0);
  const t = dot(w, dir);
  return len(sub(w, scale(dir, t)));
}

export type ClassifyOptions = {
  proximityM?: number; // facet bounding boxes must be this close to be candidates
  minEdgeLengthM?: number; // ignore shorter shared edges
  meetToleranceM?: number; // both facets must come this close to the intersection line
  hipSlopeZ?: number; // |edge direction z| above this = sloped -> hip, else ridge
  eaveSlopeZ?: number; // boundary edge: |z| above this = rake, else (if low) eave
};

const DEFAULTS: Required<ClassifyOptions> = {
  proximityM: 1.5,
  minEdgeLengthM: 1.0,
  meetToleranceM: 2.0,
  hipSlopeZ: 0.12,
  eaveSlopeZ: 0.12,
};

// Distance from p to segment a-b.
function distPointToSegment(p: Pt, a: Pt, b: Pt): number {
  const ab = sub(b, a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1)));
  return len(sub(p, add(a, scale(ab, t))));
}

// Does another facet's outline pass right by this point? If so the edge is shared
// (already ridge/hip/valley), not a roof boundary. Uses distance to the other
// facets' edge segments so it fires only on genuinely coincident edges.
function hasNeighbourAt(mid: Pt, self: number, data: FacetData[], tol: number): boolean {
  for (let k = 0; k < data.length; k++) {
    if (k === self) continue;
    const poly = data[k].poly;
    for (let e = 0; e < poly.length; e++) {
      if (distPointToSegment(mid, poly[e], poly[(e + 1) % poly.length]) <= tol) return true;
    }
  }
  return false;
}

type FacetData = { poly: Pt[]; normal: V; centroid: Pt; bb: ReturnType<typeof bbox> };

export function classifyRoofEdges(facets: { polygon: Pt[] }[], options: ClassifyOptions = {}): ClassifiedEdge[] {
  const cfg = { ...DEFAULTS, ...options };
  const data = facets
    .filter((f) => f.polygon.length >= 3)
    .map((f) => ({ poly: f.polygon, normal: polygonNormal(f.polygon), centroid: centroid(f.polygon), bb: bbox(f.polygon) }));

  const edges: ClassifiedEdge[] = [];
  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      const A = data[i];
      const B = data[j];
      if (!boxesOverlap(A.bb, B.bb, cfg.proximityM)) continue;

      // Intersection line of the two planes: direction nA x nB; a point p0 on it.
      const d = cross(A.normal, B.normal);
      const dd = dot(d, d);
      if (dd < 1e-6) continue; // planes near-parallel
      const dir = normalize(d);
      const dA = dot(A.normal, A.centroid);
      const dB = dot(B.normal, B.centroid);
      const p0 = scale(add(scale(cross(B.normal, d), dA), scale(cross(d, A.normal), dB)), 1 / dd) as Pt;

      // Both facets must actually reach the line (else the planes cross elsewhere).
      const minDistA = Math.min(...A.poly.map((p) => distPointToLine(p, p0, dir)));
      const minDistB = Math.min(...B.poly.map((p) => distPointToLine(p, p0, dir)));
      if (minDistA > cfg.meetToleranceM || minDistB > cfg.meetToleranceM) continue;

      // Shared span = overlap of the two facets' extents projected onto the line.
      const tA = A.poly.map((p) => dot(sub(p, p0), dir));
      const tB = B.poly.map((p) => dot(sub(p, p0), dir));
      const tmin = Math.max(Math.min(...tA), Math.min(...tB));
      const tmax = Math.min(Math.max(...tA), Math.max(...tB));
      if (tmax - tmin < cfg.minEdgeLengthM) continue;

      const start = add(p0, scale(dir, tmin)) as Pt;
      const end = add(p0, scale(dir, tmax)) as Pt;
      const mid: Pt = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2];

      // Centroids below the edge -> facets fold up -> ridge/hip; above -> valley.
      const fold = add(sub(A.centroid, mid), sub(B.centroid, mid));
      const category: RoofEdgeCategory =
        fold[2] > 0 ? "valley" : Math.abs(dir[2]) <= cfg.hipSlopeZ ? "ridge" : "hip";
      edges.push({ category, points: [start, end] });
    }
  }

  // Boundary edges: a facet's own perimeter segments with no neighbouring facet.
  // Sloped -> rake; horizontal and below the facet centroid -> eave. A horizontal
  // edge above the centroid is a free top edge (shed ridge) — left unclassified.
  for (let i = 0; i < data.length; i++) {
    const F = data[i];
    for (let e = 0; e < F.poly.length; e++) {
      const a = F.poly[e];
      const b = F.poly[(e + 1) % F.poly.length];
      if (len(sub(b, a)) < cfg.minEdgeLengthM) continue;
      const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      if (hasNeighbourAt(mid, i, data, cfg.proximityM)) continue; // shared edge -> already ridge/hip/valley
      const dir = normalize(sub(b, a));
      if (Math.abs(dir[2]) >= cfg.eaveSlopeZ) edges.push({ category: "rake", points: [a, b] });
      else if (mid[2] < F.centroid[2]) edges.push({ category: "eave", points: [a, b] });
    }
  }

  return dedupe(edges);
}

// Drop near-duplicate edges (over-segmented facets produce the same ridge twice),
// keeping the longest of each cluster.
function dedupe(edges: ClassifiedEdge[], tol = 1.5): ClassifiedEdge[] {
  const segLen = (e: ClassifiedEdge) => len(sub(e.points[0], e.points[1]));
  const close = (a: Pt, b: Pt) => len(sub(a, b)) <= tol;
  const same = (e1: ClassifiedEdge, e2: ClassifiedEdge) =>
    e1.category === e2.category &&
    ((close(e1.points[0], e2.points[0]) && close(e1.points[1], e2.points[1])) ||
      (close(e1.points[0], e2.points[1]) && close(e1.points[1], e2.points[0])));

  const kept: ClassifiedEdge[] = [];
  for (const e of [...edges].sort((a, b) => segLen(b) - segLen(a))) {
    if (!kept.some((k) => same(k, e))) kept.push(e);
  }
  return kept;
}
