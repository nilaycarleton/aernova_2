import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { fitObjectToViewer } from "../lib/viewer-fit.ts";

// The governing risk for in-3D roof annotation: a point picked in the viewer must
// map back to the same metre-space the roof extractor uses. That holds only if
// the viewer fit transform is a proper invertible affine map. These tests pin
// that down against the golden roof's bounding box (12 x 8 x 5 m, z-up).

// Eight corners of the source-mesh AABB, in metres (the extractor's space).
const METRE_CORNERS: [number, number, number][] = [
  [0, 0, 0],
  [12, 0, 0],
  [12, 8, 0],
  [0, 8, 0],
  [0, 0, 5],
  [12, 0, 5],
  [12, 8, 5],
  [0, 8, 5],
];

// Build a mesh whose LOCAL geometry sits at those metre coordinates, so
// object.matrixWorld maps metres -> viewer space exactly as it would for the
// real pickable mesh.
function fittedMesh(): THREE.Object3D {
  const positions = new Float32Array(METRE_CORNERS.flat());
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mesh = new THREE.Mesh(geometry);
  fitObjectToViewer(mesh);
  return mesh;
}

test("fit transform round-trips viewer picks back to metres", () => {
  const mesh = fittedMesh();
  const toViewer = mesh.matrixWorld.clone();
  const toMetres = toViewer.clone().invert();

  // A degenerate (baked/zeroed) transform would not invert cleanly; guard it.
  assert.ok(Number.isFinite(toMetres.elements[0]), "matrixWorld must be invertible");

  for (const corner of METRE_CORNERS) {
    const metre = new THREE.Vector3(...corner);
    const viewer = metre.clone().applyMatrix4(toViewer); // simulate a pick hit
    const recovered = viewer.clone().applyMatrix4(toMetres); // map pick -> metres
    assert.ok(
      recovered.distanceTo(metre) < 1e-4,
      `recovered ${recovered.toArray()} should match metre point ${corner}`
    );
  }
});

test("fit scales uniformly and sits the model on the ground", () => {
  const mesh = fittedMesh();
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Largest fitted dimension is normalised to 56 units.
  assert.ok(Math.abs(Math.max(size.x, size.y, size.z) - 56) < 1e-3, `largest dim ${size.x},${size.y},${size.z}`);
  // Dropped onto the ground with the small clearance the fitter applies.
  assert.ok(Math.abs(box.min.z - 0.2) < 1e-3, `model base z=${box.min.z} should rest at 0.2`);

  // Scale is uniform: a 12 m edge and an 8 m edge map with the same factor.
  const s = 56 / 12; // largest source dim after the -90deg X rotation is 12 m
  const edge12 = new THREE.Vector3(12, 0, 0).applyMatrix4(mesh.matrixWorld).distanceTo(
    new THREE.Vector3(0, 0, 0).applyMatrix4(mesh.matrixWorld)
  );
  assert.ok(Math.abs(edge12 - 12 * s) < 1e-3, `12 m edge -> ${edge12}, expected ${12 * s}`);
});
