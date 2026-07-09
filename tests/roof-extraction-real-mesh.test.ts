import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseObjMesh, extractRoofMeasurements } from "../lib/roof-mesh-extraction.ts";

// Regression guard against a REAL ODM mesh (the "Wetherby Drive" 338k-triangle
// 2.5D mesh, task bd6ac913). Unlike the synthetic golden gable, this pins the
// extractor to a known-good result on real-world geometry + the real operator
// ROI, so a change that quietly shifts facet segmentation or areas is caught.
//
// The mesh lives under nodeodm-data/ (a large ODM output, not committed), so this
// test SKIPS when the file is absent (e.g. CI) and RUNS locally where it exists.
// The synthetic golden-roof test is the always-on CI gate.

const MESH_PATH = fileURLToPath(
  new URL(
    "../nodeodm-data/bd6ac913-e8da-4160-b9a5-46e60336e2ec/odm_texturing_25d/odm_textured_model_geo.obj",
    import.meta.url
  )
);

// The exact operator ROI (mesh metres) saved in that model's extraction manifest.
const ROI = [
  { x: 11.585222111111115, y: 87.78875694114232 },
  { x: 4.321481370370364, y: 101.70362701165546 },
  { x: 10.427234456790131, y: 111.19103842336895 },
  { x: 27.060148037037038, y: 111.61270115277844 },
  { x: 31.797370259259253, y: 104.5498504351695 },
  { x: 24.217814703703695, y: 90.84581172936112 },
];

// Persisted ground truth (roof-extraction.json, generated 2026-06-22).
const EXPECTED = {
  facetCount: 10,
  roofSquares: 38.3,
  totalSurfaceAreaSqft: 3826.9,
  predominantPitchRatio: "0/12",
  meshTriangles: 338128,
};

test("real Wetherby mesh reproduces the persisted extraction", { skip: existsSync(MESH_PATH) ? false : "local ODM mesh not present" }, () => {
  const mesh = parseObjMesh(readFileSync(MESH_PATH, "utf8"));
  const r = extractRoofMeasurements(mesh, { roiPolygon: ROI });

  assert.equal(r.diagnostics.meshTriangles, EXPECTED.meshTriangles, "unexpected mesh — fixture changed?");
  assert.equal(r.facetCount, EXPECTED.facetCount);
  assert.equal(r.predominantPitchRatio, EXPECTED.predominantPitchRatio);
  assert.ok(
    Math.abs(r.roofSquares - EXPECTED.roofSquares) / EXPECTED.roofSquares <= 0.01,
    `roofSquares ${r.roofSquares} drifted from ${EXPECTED.roofSquares}`
  );
  assert.ok(
    Math.abs(r.totalSurfaceAreaSqft - EXPECTED.totalSurfaceAreaSqft) / EXPECTED.totalSurfaceAreaSqft <= 0.01,
    `surface area ${r.totalSurfaceAreaSqft} drifted from ${EXPECTED.totalSurfaceAreaSqft}`
  );
});
