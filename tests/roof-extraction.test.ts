import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseObjMesh, extractRoofMeasurements } from "../lib/roof-mesh-extraction.ts";

// Golden roof: a synthetic 12x8 m gable at exactly 6/12 pitch. Because the
// geometry is analytic, these numbers are ground truth, so the assertions are a
// real accuracy gate — regressions in segmentation or area math will trip them.
const GOLDEN = {
  facetCount: 2,
  predominantPitchRatio: "6/12",
  predominantPitchDegrees: 26.565, // atan(0.5)
  totalSurfaceAreaSqft: 1155.3, // 107.331 m^2
  totalProjectedAreaSqft: 1033.3, // 96 m^2
  roofSquares: 11.55,
};

function loadGoldenMesh() {
  const objPath = fileURLToPath(new URL("./fixtures/golden-gable-roof.obj", import.meta.url));
  return parseObjMesh(readFileSync(objPath, "utf8"));
}

// A generous ROI that contains the whole footprint, so we also exercise the
// point-in-polygon clip path the operator flow uses.
const ROI = [
  { x: -1, y: -1 },
  { x: 13, y: -1 },
  { x: 13, y: 9 },
  { x: -1, y: 9 },
];

function pctErr(actual: number, expected: number): number {
  return Math.abs(actual - expected) / expected;
}

test("golden gable: facet count and pitch are exact", () => {
  const result = extractRoofMeasurements(loadGoldenMesh(), { roiPolygon: ROI });
  assert.equal(result.facetCount, GOLDEN.facetCount, "should find exactly the two roof planes");
  assert.equal(result.predominantPitchRatio, GOLDEN.predominantPitchRatio);
  assert.ok(
    Math.abs(result.predominantPitchDegrees - GOLDEN.predominantPitchDegrees) <= 0.5,
    `pitch ${result.predominantPitchDegrees} deg should be within 0.5 of ${GOLDEN.predominantPitchDegrees}`
  );
});

test("golden gable: areas are within 3% of ground truth", () => {
  const result = extractRoofMeasurements(loadGoldenMesh(), { roiPolygon: ROI });
  assert.ok(
    pctErr(result.totalSurfaceAreaSqft, GOLDEN.totalSurfaceAreaSqft) <= 0.03,
    `surface area ${result.totalSurfaceAreaSqft} sqft should be within 3% of ${GOLDEN.totalSurfaceAreaSqft}`
  );
  assert.ok(
    pctErr(result.totalProjectedAreaSqft, GOLDEN.totalProjectedAreaSqft) <= 0.03,
    `projected area ${result.totalProjectedAreaSqft} sqft should be within 3% of ${GOLDEN.totalProjectedAreaSqft}`
  );
  assert.ok(
    pctErr(result.roofSquares, GOLDEN.roofSquares) <= 0.03,
    `roof squares ${result.roofSquares} should be within 3% of ${GOLDEN.roofSquares}`
  );
});

// Surface area of a planar 3D polygon (fan triangulation), in m^2.
function polygonAreaM2(poly: [number, number, number][]): number {
  let area = 0;
  for (let i = 1; i < poly.length - 1; i++) {
    const [ax, ay, az] = [poly[i][0] - poly[0][0], poly[i][1] - poly[0][1], poly[i][2] - poly[0][2]];
    const [bx, by, bz] = [poly[i + 1][0] - poly[0][0], poly[i + 1][1] - poly[0][1], poly[i + 1][2] - poly[0][2]];
    area += Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / 2;
  }
  return area;
}

test("golden gable: each facet has a clean 4-corner boundary polygon", () => {
  const result = extractRoofMeasurements(loadGoldenMesh(), { roiPolygon: ROI });
  const M2_TO_FT2 = 10.7639104167;
  for (const facet of result.facets) {
    // A rectangular plane simplifies to exactly its 4 corners.
    assert.equal(facet.polygon.length, 4, `${facet.label} polygon should be a rectangle, got ${facet.polygon.length} verts`);
    // The polygon's own surface area must match the facet's reported surface area.
    const polyFt2 = polygonAreaM2(facet.polygon) * M2_TO_FT2;
    assert.ok(
      Math.abs(polyFt2 - facet.surfaceAreaSqft) / facet.surfaceAreaSqft <= 0.02,
      `${facet.label} polygon area ${polyFt2.toFixed(1)} should match surface area ${facet.surfaceAreaSqft}`
    );
  }
});

test("golden gable: vertical walls are discarded, not counted as roof", () => {
  const result = extractRoofMeasurements(loadGoldenMesh(), { roiPolygon: ROI });
  // All four walls are vertical; none should survive into a facet.
  for (const facet of result.facets) {
    assert.ok(facet.pitchDegrees < 40, `facet ${facet.label} at ${facet.pitchDegrees} deg looks like a wall`);
  }
  assert.ok(result.diagnostics.discardedWallAreaSqft > 0, "walls should be reported as discarded");
});
