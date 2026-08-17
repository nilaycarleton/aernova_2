/**
 * Viewer-local Anime.js scene choreography — Phase 7's only consumer of
 * Anime.js in the whole app (docs/DESIGN.md §11.3 / Phase 7 Step 12-16). This
 * module is never imported from non-viewer code; both viewers reach it only
 * through a dynamic `import("@/components/viewer/anime-scene")` inside their
 * mount effect, which is what actually keeps `animejs` and its Three adapter
 * out of every other route's chunk — a static import here wouldn't do that
 * on its own if some non-viewer file statically imported *this* file, so
 * don't add one.
 *
 * Ownership (docs/DESIGN.md §11.1 / Phase 7 Step 10-11): this module owns
 * scene-local imperative choreography only — model reveal, selection
 * emphasis, camera fly-to. It never touches a DOM node, a React-owned
 * drawer/toolbar, or CSS. One `createViewerAnimeController` per mounted
 * scene; `.revert()` on unmount tears down every animation it declared.
 *
 * Three.js adapter gotchas this module deliberately avoids (verified against
 * animejs.com's Three adapter + gotchas pages before writing this):
 *  - opacity animation requires `material.transparent = true` first — this
 *    module never animates opacity, so that gotcha doesn't apply here.
 *  - animating a Group's opacity/color has no effect (groups have no
 *    material) — this module only ever animates `scale`/`position`, which
 *    Object3D (and therefore Group) does support directly.
 *  - material properties are shared across every mesh using that material
 *    instance — this module never touches material properties.
 */
"use client";

import "animejs/adapters/three";
import { animate, createScope, type JSAnimation, type Scope } from "animejs";
import type * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const REVEAL_DURATION = 460; // ms — comfortably under the 700ms focal cap (docs/DESIGN.md §11.4)
const EMPHASIZE_DURATION = 360;
const CAMERA_FLY_DURATION = 500;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type ViewerAnimeController = {
  /** Scales `group` in from a near-zero start to its current (already-fitted) scale. Safe to call on a group whose children (measurement overlays) are still being populated — see anime-scene's own module comment in measure-viewer.tsx. */
  revealModel: (group: THREE.Object3D) => void;
  /** A single non-repeating pulse — "this is the row you just selected," not idle motion. */
  emphasizeSelection: (target: THREE.Object3D) => void;
  /** Flies the camera + OrbitControls target to a new framing. Cancels any camera flight already in progress. */
  flyCameraTo: (camera: THREE.PerspectiveCamera, controls: OrbitControls, position: THREE.Vector3, target: THREE.Vector3) => void;
  /** Stops an in-progress camera flight without reverting the whole scope — called the instant OrbitControls sees real user input, so the user's gesture always wins (Phase 7 Step 20/60). */
  cancelCameraMove: () => void;
  /** Tears down every animation this controller declared. Call on unmount. */
  revert: () => void;
};

/**
 * One controller per mounted viewer scene. `root` scopes the Anime instance
 * (Anime's own React pattern — see animejs.com's "Using with React" guide);
 * for a Three.js viewer this is the canvas host element, which exists for
 * exactly the scene's own lifetime.
 */
export function createViewerAnimeController(root: HTMLElement): ViewerAnimeController {
  let cameraAnims: JSAnimation[] = [];
  let pendingDampingRestore: (() => void) | null = null;
  const cancelCameraMove = () => {
    for (const a of cameraAnims) a.pause();
    cameraAnims = [];
    // An interrupted flight (user grabs the camera mid-tween) must still put
    // damping back — otherwise it stays disabled forever, since onComplete
    // never fires for a paused-not-finished animation.
    pendingDampingRestore?.();
    pendingDampingRestore = null;
  };

  const scope: Scope = createScope({ root }).add((self) => {
    // Anime's own type declares this callback's `scope` param optional (it
    // also supports a zero-arg form), but `createScope().add()` always
    // invokes it with the scope instance in practice — guard rather than
    // assert, so a real future API change would fail loudly instead of
    // silently no-op-ing every registered method.
    if (!self) throw new Error("[viewer] Anime.js scope callback invoked without a scope instance");
    self.add("reveal", (group: THREE.Object3D) => {
      const target = { x: group.scale.x, y: group.scale.y, z: group.scale.z };
      animate(group.scale, {
        x: [target.x * 0.001, target.x],
        y: [target.y * 0.001, target.y],
        z: [target.z * 0.001, target.z],
        duration: REVEAL_DURATION,
        ease: "outExpo",
      });
    });

    self.add("emphasize", (target: THREE.Object3D) => {
      animate(target.scale, {
        x: [1, 1.18, 1],
        y: [1, 1.18, 1],
        z: [1, 1.18, 1],
        duration: EMPHASIZE_DURATION,
        ease: "outElastic(1, .6)",
      });
    });

    self.add(
      "flyTo",
      (camera: THREE.PerspectiveCamera, controls: OrbitControls, position: THREE.Vector3, target: THREE.Vector3) => {
        cancelCameraMove();
        // OrbitControls.update() re-derives its spherical state from
        // camera.position/controls.target every frame, but while damping is
        // on it also keeps applying decaying residual momentum
        // (sphericalDelta) left over from the user's last real drag — which
        // fights an externally-set position for as long as that residual
        // takes to decay, instead of respecting the new position outright.
        // Disabling damping for the tween's duration makes OrbitControls
        // zero that residual on its very next update() (its own non-damped
        // branch does `sphericalDelta.set(0,0,0)` unconditionally), so the
        // fly-to isn't fighting leftover momentum from an unrelated gesture.
        const hadDamping = controls.enableDamping;
        controls.enableDamping = false;
        const restoreDamping = () => {
          controls.enableDamping = hadDamping;
        };
        pendingDampingRestore = restoreDamping;
        const positionAnim = animate(camera.position, {
          x: position.x,
          y: position.y,
          z: position.z,
          duration: CAMERA_FLY_DURATION,
          ease: "inOutQuad",
          onComplete: () => {
            restoreDamping();
            pendingDampingRestore = null;
          },
        });
        const targetAnim = animate(controls.target, {
          x: target.x,
          y: target.y,
          z: target.z,
          duration: CAMERA_FLY_DURATION,
          ease: "inOutQuad",
        });
        cameraAnims = [positionAnim, targetAnim];
      }
    );
  });

  return {
    revealModel: (group) => scope.methods.reveal(group),
    emphasizeSelection: (target) => scope.methods.emphasize(target),
    flyCameraTo: (camera, controls, position, target) => scope.methods.flyTo(camera, controls, position, target),
    cancelCameraMove,
    revert: () => {
      cameraAnims = [];
      scope.revert();
    },
  };
}

/** Applies the same end states `flyCameraTo`/`revealModel` would animate to, instantly — the `prefers-reduced-motion` path (Phase 7 Step 59), used instead of ever calling into Anime. */
export function applyReducedMotionState(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  position: THREE.Vector3,
  target: THREE.Vector3
): void {
  camera.position.copy(position);
  controls.target.copy(target);
}
