import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ROOF_FACET_GEOMETRY_VERSION,
  parseRoofFacetGeometry,
  type RoofFacetGeometry,
} from "../lib/roof-extraction-types.ts";

// The Phase 1 acceptance contract: a facet's geometry survives a persist ->
// reload cycle intact (coordinates in mesh metres), and legacy/garbage blobs are
// rejected rather than silently mis-read.

const sample: RoofFacetGeometry = {
  version: ROOF_FACET_GEOMETRY_VERSION,
  source: "manual",
  polygon: [
    [0, 0, 3],
    [12, 0, 3],
    [12, 4, 5],
    [0, 4, 5],
  ],
  normal: [0, -0.4472, 0.8944],
  triangleCount: 128,
  heightAboveBaseFt: 13.1,
  extractor: "nodeodm-mesh-extraction",
};

test("facet geometry round-trips through JSON persistence", () => {
  // Simulate write -> DB -> read (Prisma stores/returns plain JSON).
  const reloaded = parseRoofFacetGeometry(JSON.parse(JSON.stringify(sample)));
  assert.ok(reloaded, "valid geometry should parse");
  assert.deepEqual(reloaded, sample, "geometry must be byte-for-byte stable across a round-trip");
  assert.deepEqual(reloaded!.polygon[2], [12, 4, 5], "vertices preserved in mesh metres");
});

test("both auto and manual sources parse", () => {
  assert.ok(parseRoofFacetGeometry({ ...sample, source: "auto" }));
  assert.ok(parseRoofFacetGeometry({ ...sample, source: "manual" }));
});

test("legacy and malformed geometry is rejected (returns null)", () => {
  // Pre-Phase-1 auto row shape: no version, no polygon.
  assert.equal(parseRoofFacetGeometry({ source: "nodeodm-mesh-extraction", normal: [0, 0, 1] }), null);
  assert.equal(parseRoofFacetGeometry(null), null);
  assert.equal(parseRoofFacetGeometry({ version: 1, source: "manual", polygon: [[0, 0, 3]], normal: [0, 0, 1] }), null); // too few verts
  assert.equal(parseRoofFacetGeometry({ version: 1, source: "bogus", polygon: sample.polygon, normal: [0, 0, 1] }), null);
  assert.equal(
    parseRoofFacetGeometry({ version: 1, source: "manual", polygon: [[0, 0], [1, 1], [2, 2]], normal: [0, 0, 1] }),
    null,
    "2D vertices must be rejected"
  );
});
