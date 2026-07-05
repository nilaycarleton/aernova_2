/**
 * Pure measurement math for the on-model measurement tools (WebODM/Potree-style).
 * All inputs are points in the model's metre frame (z-up); all lengths returned
 * in metres and areas in m^2 unless a formatter converts. No THREE/DOM deps, so
 * every tool's numbers can be unit-tested headlessly — see tests/measure-geometry.test.ts.
 */

export type Pt = [number, number, number];

export const M_TO_FT = 3.280839895;
export const M2_TO_FT2 = 10.7639104167;

function sub(a: Pt, b: Pt): Pt {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** Straight-line distance between two points, metres. */
export function distance(a: Pt, b: Pt): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Per-segment lengths of an open polyline, metres. */
export function segmentLengths(points: Pt[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < points.length; i++) out.push(distance(points[i - 1], points[i]));
  return out;
}

/** Total length of an open polyline (sum of segments), metres. */
export function polylineLength(points: Pt[]): number {
  return segmentLengths(points).reduce((s, n) => s + n, 0);
}

/** Perimeter of a closed polygon (includes the closing edge), metres. */
export function polygonPerimeter(points: Pt[]): number {
  if (points.length < 2) return 0;
  return polylineLength(points) + distance(points[points.length - 1], points[0]);
}

/**
 * Newell's method: area-weighted plane normal of a polygon (robust for slightly
 * non-planar loops). Returns a unit normal oriented z-up, or [0,0,1] if degenerate.
 */
export function polygonNormal(points: Pt[]): Pt {
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
  const s = nz >= 0 ? 1 : -1; // orient z-up
  return [(s * nx) / mag, (s * ny) / mag, (s * nz) / mag];
}

/** True surface area of a planar polygon (Newell), m^2. */
export function polygonArea3D(points: Pt[]): number {
  if (points.length < 3) return 0;
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < points.length; i++) {
    const c = points[i];
    const n = points[(i + 1) % points.length];
    nx += c[1] * n[2] - c[2] * n[1];
    ny += c[2] * n[0] - c[0] * n[2];
    nz += c[0] * n[1] - c[1] * n[0];
  }
  return Math.hypot(nx, ny, nz) / 2;
}

/** Horizontal (footprint) area of a polygon, projected onto the ground plane, m^2. */
export function polygonProjectedArea(points: Pt[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const c = points[i];
    const n = points[(i + 1) % points.length];
    sum += c[0] * n[1] - n[0] * c[1];
  }
  return Math.abs(sum) / 2;
}

/** Vertical drop (height difference) between two points, metres. */
export function verticalDrop(a: Pt, b: Pt): number {
  return Math.abs(a[2] - b[2]);
}

export type Pitch = { degrees: number; ratio: string };

/** Roof slope from a plane normal: angle from horizontal + rise-over-12 ratio. */
export function pitchFromNormal(normal: Pt): Pitch {
  const nz = Math.min(1, Math.max(0, Math.abs(normal[2])));
  const degrees = (Math.acos(nz) * 180) / Math.PI;
  const rise = Math.round(Math.tan((degrees * Math.PI) / 180) * 12);
  return { degrees: Math.round(degrees * 10) / 10, ratio: `${rise}/12` };
}

/** Angle at vertex `b` formed by points a-b-c, degrees. */
export function angleAt(a: Pt, b: Pt, c: Pt): number {
  const u = sub(a, b);
  const v = sub(c, b);
  const mu = Math.hypot(u[0], u[1], u[2]);
  const mv = Math.hypot(v[0], v[1], v[2]);
  if (mu === 0 || mv === 0) return 0;
  const cos = Math.min(1, Math.max(-1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (mu * mv)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export type Units = "imperial" | "metric";

/** Roof squares (100 sqft) from a surface area in m^2. */
export function roofSquares(areaM2: number): number {
  return Math.round((areaM2 * M2_TO_FT2) / 100 * 10) / 10;
}

export function formatLength(metres: number, units: Units): string {
  return units === "metric"
    ? `${(Math.round(metres * 100) / 100).toLocaleString()} m`
    : `${(Math.round(metres * M_TO_FT * 100) / 100).toLocaleString()} ft`;
}

export function formatArea(areaM2: number, units: Units): string {
  return units === "metric"
    ? `${(Math.round(areaM2 * 100) / 100).toLocaleString()} m²`
    : `${Math.round(areaM2 * M2_TO_FT2).toLocaleString()} ft²`;
}
