import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeCoplanarFacets, type RoofFacet, type Vec3 } from "../lib/roof-mesh-extraction.ts";

function facet(normal: Vec3, polygon: Vec3[], area: number): RoofFacet {
  return {
    label: "x",
    triangleCount: 2,
    surfaceAreaSqft: area,
    projectedAreaSqft: area * Math.abs(normal[2]),
    pitchDegrees: 0,
    pitchRatio: "0/12",
    heightAboveBaseFt: 1,
    normal,
    polygon,
  };
}

const FLAT: Vec3 = [0, 0, 1];

// Two touching, coplanar patches (a single 4x2 face split in two).
const a = facet(FLAT, [[0, 0, 5], [2, 0, 5], [2, 2, 5], [0, 2, 5]], 4);
const b = facet(FLAT, [[2, 0, 5], [4, 0, 5], [4, 2, 5], [2, 2, 5]], 4);
// A differently-tilted face (should never merge with the flat ones).
const tilt: Vec3 = [0, -Math.SQRT1_2, Math.SQRT1_2];
const c = facet(tilt, [[0, 4, 5], [4, 4, 5], [4, 6, 7], [0, 6, 7]], 6);
// Coplanar with a/b but far away (a separate parallel roof — must stay separate).
const d = facet(FLAT, [[20, 20, 5], [22, 20, 5], [22, 22, 5], [20, 22, 5]], 4);

test("touching coplanar patches fuse into one face", () => {
  const merged = mergeCoplanarFacets([a, b]);
  assert.equal(merged.length, 1, "the two halves become one face");
  assert.equal(merged[0].surfaceAreaSqft, 8, "area is preserved (4+4)");
  assert.equal(merged[0].polygon.length, 4, "outline simplifies to a clean rectangle");
});

test("different slopes and far-apart faces are NOT merged", () => {
  const merged = mergeCoplanarFacets([a, b, c, d]);
  // a+b -> 1, c (different tilt) -> 1, d (coplanar but far) -> 1.
  assert.equal(merged.length, 3);
  const areas = merged.map((f) => f.surfaceAreaSqft).sort((x, y) => y - x);
  assert.deepEqual(areas, [8, 6, 4]);
});

test("empty and single-facet inputs pass through untouched", () => {
  assert.deepEqual(mergeCoplanarFacets([]), []);
  assert.equal(mergeCoplanarFacets([a]).length, 1);
});
