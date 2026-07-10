import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseObjMesh, extractRoofMeasurements } from "../lib/roof-mesh-extraction.ts";
import { classifyRoofEdges, type ClassifiedEdge } from "../lib/edge-classification.ts";

// Accuracy gate for edge classification against the golden gable roof. Unlike
// edge-classification.test.ts (hand-built polygon pairs that check *categories*),
// this runs the real production path — golden mesh -> extractRoofMeasurements ->
// facet polygons -> classifyRoofEdges — and asserts edge COUNTS and LENGTHS
// against the analytic ground truth. A regression in segmentation, facet
// boundaries, or the classifier's length geometry will trip these.
//
// Golden 12x8 m gable, 6/12 pitch (see scripts/gen-golden-roof.ts):
//   ridge along X at Y=4, z=5, length 12 m
//   two eaves at z=3, each 12 m (24 m total)
//   four rakes on the gable ends, each hypot(0,4,2)=sqrt(20)=4.472 m (17.889 m total)
//   no hips, no valleys
const GOLDEN = {
  ridgeCount: 1,
  ridgeLengthM: 12,
  eaveCount: 2,
  eaveTotalLengthM: 24,
  rakeCount: 4,
  rakeTotalLengthM: 4 * Math.sqrt(20), // 17.889
  hipCount: 0,
  valleyCount: 0,
};

const ROI = [
  { x: -1, y: -1 },
  { x: 13, y: -1 },
  { x: 13, y: 9 },
  { x: -1, y: 9 },
];

function loadGoldenMesh() {
  const objPath = fileURLToPath(new URL("./fixtures/golden-gable-roof.obj", import.meta.url));
  return parseObjMesh(readFileSync(objPath, "utf8"));
}

function classifyGolden(): ClassifiedEdge[] {
  const result = extractRoofMeasurements(loadGoldenMesh(), { roiPolygon: ROI });
  const facets = result.facets.map((f) => ({ polygon: f.polygon }));
  return classifyRoofEdges(facets);
}

function edgeLen(e: ClassifiedEdge): number {
  const [a, b] = e.points;
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function totalLen(edges: ClassifiedEdge[], category: ClassifiedEdge["category"]): number {
  return edges.filter((e) => e.category === category).reduce((s, e) => s + edgeLen(e), 0);
}

function count(edges: ClassifiedEdge[], category: ClassifiedEdge["category"]): number {
  return edges.filter((e) => e.category === category).length;
}

function pctErr(actual: number, expected: number): number {
  return Math.abs(actual - expected) / expected;
}

test("golden gable: exactly one ridge at the building length", () => {
  const edges = classifyGolden();
  assert.equal(count(edges, "ridge"), GOLDEN.ridgeCount, "one shared ridge between the two planes");
  const ridge = edges.find((e) => e.category === "ridge")!;
  assert.ok(
    pctErr(edgeLen(ridge), GOLDEN.ridgeLengthM) <= 0.03,
    `ridge length ${edgeLen(ridge).toFixed(3)} m should be within 3% of ${GOLDEN.ridgeLengthM} m`
  );
  // Ridge sits at the top of the roof, z=5.
  assert.ok(
    Math.abs(ridge.points[0][2] - 5) <= 0.2 && Math.abs(ridge.points[1][2] - 5) <= 0.2,
    "ridge endpoints sit at the ridge height z=5"
  );
});

test("golden gable: no hips or valleys on a simple gable", () => {
  const edges = classifyGolden();
  assert.equal(count(edges, "hip"), GOLDEN.hipCount, "a gable has no hips");
  assert.equal(count(edges, "valley"), GOLDEN.valleyCount, "a gable has no valleys");
});

test("golden gable: two eaves totalling the two eave runs", () => {
  const edges = classifyGolden();
  assert.equal(count(edges, "eave"), GOLDEN.eaveCount, "one eave per sloped plane");
  assert.ok(
    pctErr(totalLen(edges, "eave"), GOLDEN.eaveTotalLengthM) <= 0.03,
    `total eave length ${totalLen(edges, "eave").toFixed(3)} m should be within 3% of ${GOLDEN.eaveTotalLengthM} m`
  );
  for (const e of edges.filter((x) => x.category === "eave")) {
    assert.ok(Math.abs(e.points[0][2] - e.points[1][2]) < 0.1, "each eave is horizontal");
    assert.ok(e.points[0][2] < 4, "each eave is at the low edge (z below the ridge)");
  }
});

test("golden gable: four rakes totalling the gable-end slopes", () => {
  const edges = classifyGolden();
  assert.equal(count(edges, "rake"), GOLDEN.rakeCount, "two rakes per gable end (one per plane)");
  assert.ok(
    pctErr(totalLen(edges, "rake"), GOLDEN.rakeTotalLengthM) <= 0.03,
    `total rake length ${totalLen(edges, "rake").toFixed(3)} m should be within 3% of ${GOLDEN.rakeTotalLengthM.toFixed(3)} m`
  );
  for (const e of edges.filter((x) => x.category === "rake")) {
    assert.ok(Math.abs(e.points[0][2] - e.points[1][2]) > 0.5, "each rake is sloped");
  }
});
