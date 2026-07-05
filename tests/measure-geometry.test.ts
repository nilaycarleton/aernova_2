import { test } from "node:test";
import assert from "node:assert/strict";
import {
  distance,
  segmentLengths,
  polylineLength,
  polygonPerimeter,
  polygonNormal,
  polygonArea3D,
  polygonProjectedArea,
  verticalDrop,
  pitchFromNormal,
  angleAt,
  roofSquares,
  formatLength,
  formatArea,
  type Pt,
} from "../lib/measure-geometry.ts";

// A south gable plane at exactly 6/12 (z = 3 + 0.5*y). Rectangle 12 m wide,
// slope length sqrt(4^2+2^2)=sqrt(20). All expected values are analytic.
const PLANE: Pt[] = [
  [0, 0, 3],
  [12, 0, 3],
  [12, 4, 5],
  [0, 4, 5],
];
const SLOPE = Math.sqrt(20); // 4.4721 m

const approx = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;

test("distance and vertical drop", () => {
  assert.ok(approx(distance([0, 0, 3], [12, 0, 3]), 12));
  assert.ok(approx(distance([0, 0, 3], [12, 4, 5]), Math.hypot(12, 4, 2)));
  assert.ok(approx(verticalDrop([0, 4, 5], [0, 0, 3]), 2));
});

test("polyline segments and length", () => {
  const seg = segmentLengths([PLANE[0], PLANE[1], PLANE[2]]);
  assert.ok(approx(seg[0], 12) && approx(seg[1], SLOPE));
  assert.ok(approx(polylineLength([PLANE[0], PLANE[1], PLANE[2]]), 12 + SLOPE));
});

test("polygon perimeter closes the loop", () => {
  // 12 (bottom) + slope (right) + 12 (top) + slope (left)
  assert.ok(approx(polygonPerimeter(PLANE), 24 + 2 * SLOPE, 1e-9));
});

test("polygon surface vs projected area", () => {
  assert.ok(approx(polygonArea3D(PLANE), 12 * SLOPE, 1e-9), "surface area = 12 * sqrt(20)");
  assert.ok(approx(polygonProjectedArea(PLANE), 48, 1e-9), "footprint = 12 * 4");
});

test("normal and pitch recover 6/12", () => {
  const n = polygonNormal(PLANE);
  // Plane z = 3 + 0.5y -> normal proportional to (0, -0.5, 1).
  assert.ok(approx(Math.abs(n[2]), 2 / Math.sqrt(5), 1e-9), "nz");
  const pitch = pitchFromNormal(n);
  assert.equal(pitch.ratio, "6/12");
  assert.ok(approx(pitch.degrees, 26.6, 0.05));
});

test("angle at a right-angle corner is 90 degrees", () => {
  assert.ok(approx(angleAt([12, 0, 3], [0, 0, 3], [0, 4, 5]), 90, 1e-6));
});

test("roof squares from surface area", () => {
  // Two planes = 2 * 12*sqrt(20) m^2 -> ~11.55 squares.
  assert.ok(approx(roofSquares(2 * 12 * SLOPE), 11.6, 0.1));
});

test("unit formatting", () => {
  assert.equal(formatLength(1, "metric"), "1 m");
  assert.equal(formatLength(1, "imperial"), "3.28 ft");
  assert.equal(formatArea(100, "metric"), "100 m²");
  assert.equal(formatArea(100, "imperial"), "1,076 ft²");
});
