import { test } from "node:test";
import assert from "node:assert/strict";
import { splitFacetPolygon, type Pt } from "../lib/facet-split.ts";

// Surface area of a planar 3D polygon (fan triangulation), m^2.
function area(poly: Pt[]): number {
  let a = 0;
  for (let i = 1; i < poly.length - 1; i++) {
    const ax = poly[i][0] - poly[0][0], ay = poly[i][1] - poly[0][1], az = poly[i][2] - poly[0][2];
    const bx = poly[i + 1][0] - poly[0][0], by = poly[i + 1][1] - poly[0][1], bz = poly[i + 1][2] - poly[0][2];
    a += Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / 2;
  }
  return a;
}

const square: Pt[] = [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]];

test("a cut down the middle splits into two halves that sum to the whole", () => {
  const res = splitFacetPolygon(square, [5, -2, 0], [5, 12, 0]);
  assert.ok(res, "line crossing the square should split it");
  const [left, right] = res!;
  assert.ok(left.length >= 3 && right.length >= 3, "both halves are valid polygons");
  assert.ok(Math.abs(area(left) - 50) < 0.01 && Math.abs(area(right) - 50) < 0.01, "each half is 5x10");
  assert.ok(Math.abs(area(left) + area(right) - area(square)) < 0.01, "halves sum to the original area");
});

test("a slanted cut through two edges still conserves area", () => {
  // Enters the left edge and exits the right edge (not through any corner).
  const res = splitFacetPolygon(square, [-2, 3, 0], [12, 7, 0]);
  assert.ok(res);
  const [left, right] = res!;
  assert.ok(Math.abs(area(left) + area(right) - area(square)) < 0.01, "no area lost on a slanted cut");
});

test("a cut exactly through two corners is rejected (degenerate)", () => {
  assert.equal(splitFacetPolygon(square, [-2, -2, 0], [12, 12, 0]), null);
});

test("splitting a tilted facet conserves area", () => {
  // A 6/12 roof plane (z = 3 + 0.5*y).
  const plane: Pt[] = [[0, 0, 3], [12, 0, 3], [12, 4, 5], [0, 4, 5]];
  const res = splitFacetPolygon(plane, [6, -1, 3], [6, 5, 5]);
  assert.ok(res);
  const [left, right] = res!;
  assert.ok(Math.abs(area(left) + area(right) - area(plane)) < 0.05, "tilted split conserves surface area");
});

test("a cut line that misses the facet returns null", () => {
  assert.equal(splitFacetPolygon(square, [100, 0, 0], [100, 10, 0]), null);
});
