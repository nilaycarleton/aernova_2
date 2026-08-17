/**
 * Viewer-local performance instrumentation (Phase 7 Step 62-64). Development
 * diagnostics only — never rendered to a contractor, never a Lighthouse/CWV
 * claim (that comparison is explicitly Phase 8's, not this phase's — Phase 7
 * Step 63). Logs a single structured line to the console so it can be read
 * during development or pulled from browser devtools during a live check;
 * does not persist, does not phone home, does not run in production.
 */
"use client";

import type * as THREE from "three";

export type ViewerPerfMark = {
  label: string;
  mountStart: number;
  modelLoaded?: number;
  firstFrame?: number;
};

const enabled = process.env.NODE_ENV !== "production";

export function startViewerPerf(label: string): ViewerPerfMark {
  return { label, mountStart: enabled ? performance.now() : 0 };
}

export function markModelLoaded(mark: ViewerPerfMark): void {
  if (!enabled) return;
  mark.modelLoaded = performance.now();
}

/** Call once, on the first `renderer.render()` after mount — logs the full timing line and renderer scene-complexity counters. Only ever fires once per mark (subsequent calls are no-ops) so it can safely be called from inside the render loop without spamming every frame. */
export function markFirstFrame(mark: ViewerPerfMark, renderer: THREE.WebGLRenderer): void {
  if (!enabled || mark.firstFrame !== undefined) return;
  mark.firstFrame = performance.now();
  const info = renderer.info;
  console.debug(
    `[viewer-perf] ${mark.label} — mount→firstFrame ${(mark.firstFrame - mark.mountStart).toFixed(0)}ms` +
      (mark.modelLoaded ? `, mount→modelLoaded ${(mark.modelLoaded - mark.mountStart).toFixed(0)}ms` : "") +
      `, drawCalls=${info.render.calls} triangles=${info.render.triangles} textures=${info.memory.textures} geometries=${info.memory.geometries}`
  );
}
