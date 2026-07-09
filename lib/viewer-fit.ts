import * as THREE from "three";

/**
 * Center, scale, and drop a model onto the ground so it always fills the viewer
 * frame. Mutates the object's transform (rotation/scale/position) and leaves its
 * matrixWorld up to date.
 *
 * IMPORTANT — coordinate correctness: this scales via `object.scale` and never
 * bakes the fit into the geometry vertices. That keeps the object's local space
 * equal to the source mesh space (ODM metres, z-up), so `object.matrixWorld`
 * maps metres -> viewer space and, crucially, its inverse maps a picked viewer
 * point back to a real metre coordinate the roof extractor can trust. In-3D
 * annotation depends on that inverse being exact; see tests/viewer-fit.test.ts.
 */
export function fitObjectToViewer(object: THREE.Object3D): void {
  object.rotation.x = -Math.PI / 2;
  object.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const largestDimension = Math.max(size.x, size.y, size.z) || 1;
  object.scale.setScalar(56 / largestDimension);
  object.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);
  object.position.sub(center);
  object.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(object);
  if (box.min.z < 0) object.position.z -= box.min.z - 0.2;
  object.updateMatrixWorld(true);
}
