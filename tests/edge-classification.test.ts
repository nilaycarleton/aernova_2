import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyRoofEdges } from "../lib/edge-classification.ts";
import type { Pt } from "../lib/measure-geometry.ts";

// Two planes folding UP to a horizontal top edge at y=4, z=5 -> ridge.
const gableSouth: Pt[] = [[0, 0, 3], [12, 0, 3], [12, 4, 5], [0, 4, 5]];
const gableNorth: Pt[] = [[0, 8, 3], [12, 8, 3], [12, 4, 5], [0, 4, 5]];

// Two planes folding DOWN to a horizontal bottom edge at y=4, z=3 -> valley.
const valleyA: Pt[] = [[0, 0, 5], [12, 0, 5], [12, 4, 3], [0, 4, 3]];
const valleyB: Pt[] = [[0, 8, 5], [12, 8, 5], [12, 4, 3], [0, 4, 3]];

function edgeLen(e: { points: [Pt, Pt] }) {
  return Math.hypot(e.points[0][0] - e.points[1][0], e.points[0][1] - e.points[1][1], e.points[0][2] - e.points[1][2]);
}

test("two facets folding up to a horizontal edge -> ridge", () => {
  const edges = classifyRoofEdges([{ polygon: gableSouth }, { polygon: gableNorth }]);
  const ridges = edges.filter((e) => e.category === "ridge");
  assert.equal(ridges.length, 1);
  // The shared edge runs ~12 m along x at the ridge line.
  assert.ok(Math.abs(edgeLen(ridges[0]) - 12) < 0.5, `ridge length ${edgeLen(ridges[0])}`);
  // Both endpoints sit at the ridge height z=5.
  assert.ok(Math.abs(ridges[0].points[0][2] - 5) < 0.2 && Math.abs(ridges[0].points[1][2] - 5) < 0.2);
});

test("two facets folding down to an edge -> valley", () => {
  const edges = classifyRoofEdges([{ polygon: valleyA }, { polygon: valleyB }]);
  const valleys = edges.filter((e) => e.category === "valley");
  assert.equal(valleys.length, 1);
});

test("two differently-tilted planes sloping down from a sloped edge -> hip", () => {
  // Shared edge (0,0,5)->(8,0,9) rises in x; each facet tilts away in ±y and
  // drops below the edge -> convex + sloped -> hip.
  const a: Pt[] = [[0, 0, 5], [8, 0, 9], [8, 6, 7], [0, 6, 3]];
  const b: Pt[] = [[0, 0, 5], [8, 0, 9], [8, -6, 7], [0, -6, 3]];
  const edges = classifyRoofEdges([{ polygon: a }, { polygon: b }]);
  const hips = edges.filter((e) => e.category === "hip");
  assert.equal(hips.length, 1);
});

test("gable boundary edges classify as eaves (low, horizontal) and rakes (sloped)", () => {
  const edges = classifyRoofEdges([{ polygon: gableSouth }, { polygon: gableNorth }]);
  const eaves = edges.filter((e) => e.category === "eave");
  const rakes = edges.filter((e) => e.category === "rake");
  assert.ok(edges.some((e) => e.category === "ridge"), "still finds the shared ridge");
  assert.ok(eaves.length >= 2, `each plane has a bottom eave, got ${eaves.length}`);
  assert.ok(rakes.length >= 2, `gable ends are rakes, got ${rakes.length}`);
  for (const e of eaves) {
    assert.ok(Math.abs(e.points[0][2] - e.points[1][2]) < 0.1, "eave is horizontal");
    assert.ok(e.points[0][2] < 4, "eave is at the low edge (z<centroid)");
  }
  for (const e of rakes) {
    assert.ok(Math.abs(e.points[0][2] - e.points[1][2]) > 0.5, "rake is sloped");
  }
});

test("distant, non-adjacent facets share no inter-facet edge", () => {
  const far: Pt[] = [[100, 100, 3], [112, 100, 3], [112, 104, 5], [100, 104, 5]];
  const edges = classifyRoofEdges([{ polygon: gableSouth }, { polygon: far }]);
  // No ridge/hip/valley between them (they only have their own boundary eaves/rakes).
  assert.equal(edges.filter((e) => ["ridge", "hip", "valley"].includes(e.category)).length, 0);
});

test("duplicate coincident facets collapse to one ridge", () => {
  const edges = classifyRoofEdges([{ polygon: gableSouth }, { polygon: gableNorth }, { polygon: gableNorth }]);
  assert.equal(edges.filter((e) => e.category === "ridge").length, 1, "the repeated north facet should not double the ridge");
});
