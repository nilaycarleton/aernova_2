/**
 * Split a planar facet polygon (mesh metres, z-up) along the line through two
 * points clicked on the surface. Projects everything onto the facet plane,
 * clips the outline into the two half-polygons on each side of the cut, and maps
 * them back to 3D. Returns null when the line doesn't cleanly cross the outline
 * (misses it, or grazes a vertex). Convex facets (the auto-detected ones) always
 * split cleanly. Pure — see tests/facet-split.test.ts.
 */
export type Pt = [number, number, number];

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V): number => Math.hypot(a[0], a[1], a[2]);
const normalize = (a: V): V => {
  const m = norm(a) || 1;
  return [a[0] / m, a[1] / m, a[2] / m];
};

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

function centroid(poly: Pt[]): Pt {
  const c: V = [0, 0, 0];
  for (const p of poly) {
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  }
  return [c[0] / poly.length, c[1] / poly.length, c[2] / poly.length];
}

export function splitFacetPolygon(polygon: Pt[], cutA: Pt, cutB: Pt): [Pt[], Pt[]] | null {
  if (polygon.length < 3) return null;
  const normal = polygonNormal(polygon);
  const origin = centroid(polygon);
  const ref: V = Math.abs(normal[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = normalize(cross(normal, ref));
  const w = normalize(cross(normal, u));

  const to2d = (p: Pt): [number, number] => [dot(sub(p, origin), u), dot(sub(p, origin), w)];
  const to3d = (x: number, y: number): Pt => [
    origin[0] + x * u[0] + y * w[0],
    origin[1] + x * u[1] + y * w[1],
    origin[2] + x * u[2] + y * w[2],
  ];

  const poly2 = polygon.map(to2d);
  const a2 = to2d(cutA);
  const b2 = to2d(cutB);
  const cd = [b2[0] - a2[0], b2[1] - a2[1]];
  const cdlen = Math.hypot(cd[0], cd[1]);
  if (cdlen < 1e-6) return null;
  // Unit normal of the cut line in the plane; signed distance splits verts.
  const ln: [number, number] = [-cd[1] / cdlen, cd[0] / cdlen];
  const sdist = (p: [number, number]) => ln[0] * (p[0] - a2[0]) + ln[1] * (p[1] - a2[1]);

  const left: [number, number][] = [];
  const right: [number, number][] = [];
  let crossings = 0;
  const n = poly2.length;
  for (let i = 0; i < n; i++) {
    const cur = poly2[i];
    const nxt = poly2[(i + 1) % n];
    const sc = sdist(cur);
    const sn = sdist(nxt);
    if (sc >= 0) left.push(cur);
    if (sc <= 0) right.push(cur);
    if ((sc > 0 && sn < 0) || (sc < 0 && sn > 0)) {
      const t = sc / (sc - sn);
      const ip: [number, number] = [cur[0] + t * (nxt[0] - cur[0]), cur[1] + t * (nxt[1] - cur[1])];
      left.push(ip);
      right.push(ip);
      crossings++;
    }
  }
  if (crossings !== 2 || left.length < 3 || right.length < 3) return null;
  return [left.map(([x, y]) => to3d(x, y)), right.map(([x, y]) => to3d(x, y))];
}
