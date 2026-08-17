/**
 * WebGL capability detection — checked before a viewer constructs a
 * `THREE.WebGLRenderer`, so an unsupported browser/device gets the
 * `"unsupported"` state (Phase 7 Step 39) instead of a thrown exception mid-
 * render. Pure classification logic is separated from the DOM/canvas probe
 * itself so it's unit-testable without a real WebGL context (Step 91 — no
 * faking WebGL rendering, but the *decision* of what to show is plain logic).
 */

export type WebglSupport = "webgl2" | "webgl1" | "unsupported";

/** Pure: turns two booleans into the one decision the viewer acts on. */
export function classifyWebglSupport(hasWebgl2: boolean, hasWebgl1: boolean): WebglSupport {
  if (hasWebgl2) return "webgl2";
  if (hasWebgl1) return "webgl1";
  return "unsupported";
}

/**
 * Probes the actual browser. Creates a throwaway canvas and asks for a
 * context — never touches the viewer's own renderer/canvas, so a failed
 * probe can't leave a half-constructed WebGLRenderer behind.
 */
export function detectWebglSupport(): WebglSupport {
  if (typeof document === "undefined") return "unsupported";
  try {
    const canvas = document.createElement("canvas");
    const hasWebgl2 = Boolean(canvas.getContext("webgl2"));
    const hasWebgl1 = Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
    return classifyWebglSupport(hasWebgl2, hasWebgl1);
  } catch {
    return "unsupported";
  }
}

/** DPR is clamped to avoid retina/4K devices rendering far more pixels than the instrument needs to stay legible (Phase 7 Step 64). */
export function computeDpr(rawDpr: number, cap = 2): number {
  if (!Number.isFinite(rawDpr) || rawDpr <= 0) return 1;
  return Math.min(rawDpr, cap);
}
