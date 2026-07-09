import * as THREE from "three";

/**
 * Build a filled, triangulated overlay for a planar facet polygon (mesh metres,
 * z-up). Projects the boundary onto the facet plane, triangulates (earcut, so
 * concave outlines work), maps back into 3D, and lifts slightly along the normal
 * so the fill sits just above the mesh surface without z-fighting.
 *
 * Kept pure (no React/DOM) so the "overlay lands exactly on the facet plane"
 * property can be asserted headlessly — see tests/facet-overlay.test.ts.
 */
export function buildFacetFillGeometry(
  polygon: [number, number, number][],
  normal: [number, number, number],
  lift = 0.06
): THREE.BufferGeometry {
  const n = new THREE.Vector3(...normal).normalize();
  const ref = Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const u = new THREE.Vector3().crossVectors(n, ref).normalize();
  const w = new THREE.Vector3().crossVectors(n, u).normalize();
  const p0 = new THREE.Vector3(...polygon[0]);

  const pts2d = polygon.map((p) => {
    const d = new THREE.Vector3(...p).sub(p0);
    return new THREE.Vector2(d.dot(u), d.dot(w));
  });
  const geom = new THREE.ShapeGeometry(new THREE.Shape(pts2d));
  geom.applyMatrix4(new THREE.Matrix4().makeBasis(u, w, n).setPosition(p0));
  geom.translate(n.x * lift, n.y * lift, n.z * lift);
  return geom;
}
