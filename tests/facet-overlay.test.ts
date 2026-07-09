import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildFacetFillGeometry } from "../lib/facet-overlay-geometry.ts";

// Phase 2 acceptance rests on overlays rendering "exactly on the roof surface".
// The overlay geometry is built by projecting the facet polygon to its plane,
// triangulating, and mapping back to 3D. These tests assert the result is
// planar (on the facet plane, offset only by the lift) and area-faithful.

// A south gable plane at 6/12: z = 3 + 0.5*y, so normal ∝ (0, -0.5, 1).
const POLY: [number, number, number][] = [
  [0, 0, 3],
  [12, 0, 3],
  [12, 4, 5],
  [0, 4, 5],
];
const NORMAL: [number, number, number] = [0, -0.4472136, 0.8944272];
const LIFT = 0.06;

function triangleAreaSum(positions: Float32Array): number {
  let area = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const a = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
    const b = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
    const c = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);
    area += new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).length() / 2;
  }
  return area;
}

test("overlay geometry lies on the facet plane (offset only by the lift)", () => {
  // ShapeGeometry is indexed (shared verts); expand so we can walk triangles.
  const geom = buildFacetFillGeometry(POLY, NORMAL, LIFT).toNonIndexed();
  const pos = geom.getAttribute("position").array as Float32Array;
  assert.ok(pos.length > 0 && pos.length % 9 === 0, "should triangulate into whole triangles");

  const n = new THREE.Vector3(...NORMAL).normalize();
  // Plane passes through polygon[0]; the overlay is lifted by `lift` along n.
  const planeConst = new THREE.Vector3(...POLY[0]).dot(n) + LIFT;
  for (let i = 0; i < pos.length; i += 3) {
    const v = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]);
    assert.ok(Math.abs(v.dot(n) - planeConst) < 1e-4, `vertex ${v.toArray()} is off the facet plane`);
  }
});

test("overlay area matches the facet polygon area", () => {
  const geom = buildFacetFillGeometry(POLY, NORMAL, LIFT).toNonIndexed();
  const area = triangleAreaSum(geom.getAttribute("position").array as Float32Array);
  // Rectangle 12 m x slope-length sqrt(4^2+2^2)=sqrt(20): 12*sqrt(20) = 53.666 m^2.
  const expected = 12 * Math.sqrt(20);
  assert.ok(Math.abs(area - expected) / expected < 0.01, `overlay area ${area.toFixed(2)} != ${expected.toFixed(2)}`);
});
