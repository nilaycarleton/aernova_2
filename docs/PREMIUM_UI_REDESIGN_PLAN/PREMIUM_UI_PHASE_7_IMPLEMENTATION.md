# Premium UI Redesign — Phase 7 Implementation Record

**Phase:** 7 — Roof viewer redesign
**Companion plan:** [`PREMIUM_UI_REDESIGN_PLAN.md`](./PREMIUM_UI_REDESIGN_PLAN.md)
**Prior phase:** [`PREMIUM_UI_PHASE_6_IMPLEMENTATION.md`](./PREMIUM_UI_PHASE_6_IMPLEMENTATION.md)
**Branch:** `feature/astryx-integration` (same branch as Phases 0–6).
**Status:** Complete for the scope actually executed. Not a claim of full 138-step live-device/Lighthouse coverage — see §Deferred below.

This is the Premium UI Redesign's Phase 7, not Workflow Phase 13 or any Workflow-roadmap phase — those live under `docs/AERNOVA_PROJECT_WORKFLOW/` and are a separate numbering system.

## 1. Scope

Per the plan's §11 Phase 7 section and DESIGN.md §15.3 ("Instrument mode"): establish the Three.js roof viewer as a full-bleed instrument surface, unify React/Three ownership, add dynamically-loaded Anime.js scene choreography, add viewer-specific loading/error/empty/fallback states, and add reduced-motion behavior and performance instrumentation — without destabilizing the core measurement workflow (persistence, permissions, raycasting math).

## 2. Documentation read before starting

`PREMIUM_UI_REDESIGN_PLAN.md` (full), `docs/AERNOVA_DESIGN_REFERENCE.md`, `docs/DESIGN.md` (full, including the pre-existing "The Model Viewer" and "Dark-Instrument Rule" sections — the viewer's dark-in-both-themes doctrine predates this phase and was preserved, not introduced), `docs/PRODUCT.md`, Phase 0–6 implementation records (Phase 6's own record explicitly named `HubModelViewer` "an opaque Phase 7 component" — confirming this phase's boundary), `docs/phase-0/00-baseline-report.md` / `01-redesign-brief.md` / `03-concept-seeds.md` / `04-decision-record.md`, `docs/PLAN-CRM.md`, `docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md`.

Also read, ahead of any code change: the existing `MODEL_RENDER_FIX_PLAN.md` at the repo root (untracked, pre-existing from an earlier session) — it documents a CSP `connect-src`/`img-src` fix for GLTFLoader's blob-URL texture loading, already resolved and live-verified before this phase began. Its existence and its explicit mention of `measure-viewer.tsx` / `hub-model-viewer.tsx` was the first confirmation of exactly which two files are the viewer boundary.

## 3. Worktree start

`git branch --show-current` → `feature/astryx-integration`. `git status --short` before any edit showed a large pre-existing uncommitted body of work (Workflow Phases 1–13, Premium UI Phases 0–6's own files, a documentation-path-reorganization pass, and untracked `MODEL_RENDER_FIX_PLAN.md` / `app/(prototype)/` / `lib/clerk-appearance.ts`) — none of it touched or reverted. `git diff --stat` at the end of this phase for the files this phase actually owns: `components/dashboard/measure-viewer.tsx` (+530/-357 across 726 changed lines), `components/public/hub-model-viewer.tsx` (+160 across the file), `package.json`/`package-lock.json` (one dependency added).

## 4. Files edited

```
components/dashboard/measure-viewer.tsx
components/public/hub-model-viewer.tsx
package.json / package-lock.json
```

## 5. Files added

```
components/viewer/scene-core.ts
components/viewer/webgl-capability.ts
components/viewer/anime-scene.ts
components/viewer/viewer-perf.ts
tests/viewer-webgl-capability.test.ts
docs/PREMIUM_UI_REDESIGN_PLAN/PREMIUM_UI_PHASE_7_IMPLEMENTATION.md  (this file)
.impeccable/critique/2026-08-16T21-49-54Z__components-dashboard-measure-viewer-tsx.md
```

## 6. Files removed

None permanently. A temporary verification scaffold (`app/preview/viewer/page.tsx`, `app/preview/model.glb/route.ts`, and a matching `"/preview(.*)"` / `"/draco/(.*)"` entry in `proxy.ts`'s public-route list) was created to work around the complete absence of Clerk test credentials and seeded client-hub share tokens in this environment, used to drive real live-browser verification against the actual production GLB, and fully deleted/reverted before finishing — `git diff proxy.ts` is empty and `app/preview/` does not exist on disk.

## 7. Dependencies added/changed

`animejs` added as an exact pin at `4.5.0` (`"animejs": "4.5.0"` in `dependencies`, no caret), matching `docs/DESIGN.md` §11.3's pinned research revision and the plan's own "add only for the viewer phase" instruction. `npm ls three` confirms a single resolved `three@0.184.0` shared by the app, `three-mesh-bvh`, and `animejs`'s optional peer dependency — no duplicate Three instance. No other dependency was added, upgraded, or downgraded; Three.js, React, Next.js, Motion, and Astryx versions are unchanged from Phase 6.

## 8. Phase 6 validation baseline

lint: 0 errors / 24 warnings. TypeScript: clean. Tests: 494 total / 493 passing / 1 pre-existing failure (`tests/action-guards.test.ts`, unrelated). Build: successful, 66 routes. Astryx doctor: 4 passed / 2 warnings / 0 failures.

## 9. Phase 7 final validation

lint: **0 errors / 24 warnings** (identical count to baseline — the 3 `no-unused-vars` warnings on `measure-viewer.tsx`'s `distance`/`polygonPerimeter`/`polygonProjectedArea` imports are pre-existing, unchanged by this phase). TypeScript: **clean**. Tests: **500 total / 499 passing / 1 pre-existing failure** (same `action-guards.test.ts` failure, untouched — 6 new tests added in `tests/viewer-webgl-capability.test.ts`, all passing). Build: **successful, 66 routes** (unchanged — no route added or removed). Astryx doctor: **4 passed / 2 warnings / 0 failures** (identical to baseline).

No new test failures. No route count change. No lint/typecheck regression.

---

## Current viewer inventory

### Entry points

| Route/surface | Component | Audience | Auth |
|---|---|---|---|
| Job workspace → Scan tab → Phase-Six-workflow Step 3 (`components/dashboard/phase-six-workflow.tsx`) | `MeasureViewer` | Owner/office/estimator with `viewModel`-gated aerial module access | Full Clerk session + company scope + module gate |
| `/hub/[clientToken]` (`app/(public)/hub/[clientToken]/page.tsx`) | `HubModelViewer` | Homeowner | Public share token (`Client.shareToken`), no account |

`MeasureViewer` is the primary interactive instrument (orbit, auto-detect, edit, hand-measure, undo/redo, full screen). `HubModelViewer` is the read-only counterpart — explicitly documented in its own file header as *not* `MeasureViewer` with tools hidden, because it must not ship the BVH raycasting / picking / undo bundle to a homeowner's phone.

No internal/dev-only viewer route exists. The `/preview/*` route created for this phase's own live verification (§6) was temporary and is gone.

### Shared low-level infrastructure (new this phase)

`components/viewer/scene-core.ts` — `createSceneCore(host)` bootstraps the THREE.Scene/PerspectiveCamera/WebGLRenderer/OrbitControls/lights/group identical to what both viewers previously duplicated byte-for-byte, plus `startLoop`/`stopLoop`, `observeResize`/`disconnectResize`, `loadModel` (GLTFLoader + DRACOLoader + colorSpace fix), and `disposeCore`. Also exports `DEFAULT_CAMERA_POSITION`/`DEFAULT_CAMERA_TARGET` (the `(0, -44, 30)` / `(0, 0, 0)` framing shot, unchanged from the pre-Phase-7 hardcoded values, now shared by initial setup and the new "Reset view" action) and `observeContextLoss` (`webglcontextlost`/`webglcontextrestored`).

`components/viewer/webgl-capability.ts` — `detectWebglSupport()` (DOM probe) and the pure `classifyWebglSupport(hasWebgl2, hasWebgl1)` / `computeDpr(rawDpr, cap)` helpers, unit-tested.

`components/viewer/anime-scene.ts` — the only file in the app that imports `animejs`. `createViewerAnimeController(root)` returns `revealModel`, `emphasizeSelection`, `flyCameraTo`, `cancelCameraMove`, `revert`. `prefersReducedMotion()` and `applyReducedMotionState(...)` are the reduced-motion path.

`components/viewer/viewer-perf.ts` — dev-only (`process.env.NODE_ENV !== "production"` gated) `console.debug` timing: mount→model-loaded, mount→first-frame, draw calls/triangles/textures/geometries from `renderer.info`.

Direction, confirmed via `grep`: `components/viewer/*` is imported only by `measure-viewer.tsx`, `hub-model-viewer.tsx`, and internally by `scene-core.ts` — never the other way, and never by unrelated business/domain code. `lib/viewer-fit.ts` and `lib/facet-overlay-geometry.ts` (pure Three.js math helpers, pre-existing, unchanged) remain the only other `three` importers outside `components/viewer/`.

### Ownership before this phase

Both viewers independently owned: canvas creation/mount/dispose, camera/controls, lights, GLTF+DRACO loading, resize handling, the RAF render loop, and disposal — genuinely duplicated, not shared. `MeasureViewer` additionally owned CSS2D labels, BVH-accelerated raycasting, pointer/tap/drag gesture disambiguation, measurement graphics, undo/redo, and all server-action calls.

### Ownership after this phase

| Thing | Owner |
|---|---|
| Tool rail DOM | React (`measure-viewer.tsx` JSX) |
| Inspector DOM (Measurements panel) | React + Astryx `Layout`/`LayoutPanel`/`Dialog`/`DialogHeader` (composed directly — see §Architecture) |
| Canvas DOM container | React (`hostRef` div), one stable position in the tree regardless of split/fullscreen state |
| `THREE.Scene`/`Camera`/`Renderer`/lights/loader/resize/RAF/dispose | `components/viewer/scene-core.ts`, shared by both viewers |
| `OrbitControls` | scene-core-created, viewer-local; user "start" event cancels any in-flight Anime camera tween |
| CSS2D measurement labels | Three-local (`CSS2DRenderer`), owned by `measure-viewer.tsx`, never Motion/CSS |
| Model reveal (`group.scale` scale-in on load) | Anime.js, `anime-scene.ts` |
| Selection emphasis (measurement-row click → scene pulse) | Anime.js, `anime-scene.ts` |
| Camera fly-to ("Reset view") | Anime.js, `anime-scene.ts`, writing `camera.position`/`controls.target` |
| Raycasting/picking, undo/redo, measurement persistence | `measure-viewer.tsx`, unchanged business logic |
| CSS hover/focus/pressed | CSS/Tailwind, unchanged |

No property has two animation owners. Motion is not used inside either viewer file in this phase (no React-owned drawer/inspector transition was added beyond what Astryx `Layout`/`Dialog` already animate internally); Anime.js never touches a DOM node.

---

## Architecture

### Dynamic-import boundary

Both viewers do `await import("@/components/viewer/anime-scene")` inside their mount effect, guarded by a `cancelled` flag and skipped entirely when `prefersReducedMotion()` is true. `anime-scene.ts` has a **static** top-level `import "animejs/adapters/three"` and `import { animate, createScope, ... } from "animejs"` — the static imports are what pull `animejs` into a real, separate chunk; the dynamic `import()` at the call site is what keeps that chunk out of the initial route bundle and out of every non-viewer route.

**Verified in the production build** (`npm run build`, then inspecting `.next/`): exactly one static chunk in `.next/static/chunks/` contains the string `animejs`, sized 45.6 KB. Zero server-route chunks (`.next/server/app/**`) reference it. Exactly two chunks reference that chunk as a dynamic-import target, and both were confirmed (via distinctive literal strings — `"Loading your roof"` for `hub-model-viewer.tsx`, `"Measurements"` for `measure-viewer.tsx`) to be the two viewer components' own compiled output, not a shared/common chunk.

### Three-instance verification

`npm ls three` → single resolved `three@0.184.0`, deduped across the app, `three-mesh-bvh`, and `animejs`'s optional peer dependency. No `Multiple instances of Three.js being imported` risk.

### Public-vs-internal dependency split

`components/viewer/scene-core.ts` sits *below* both viewers (neither viewer imports the other). `hub-model-viewer.tsx` does not import anything from `measure-viewer.tsx` — confirmed unchanged from before this phase, and re-confirmed by grep. The shared module carries zero measurement/editing/BVH/raycasting code; that stays entirely in `measure-viewer.tsx`.

### Server/Client boundary

Unchanged. Both viewers are `"use client"` leaf components; the job page and Hub page remain server-first. No new client-boundary expansion.

### Tab mounting behavior

`MeasureViewer` is rendered unconditionally inside Phase-Six-workflow Step 3 once a model exists — it does not unmount on Scan-tab tab-switches within the job workspace (the Scan tab's own content, including the viewer, stays mounted; the *job workspace's* other tabs are what switch). This phase did not change that.

---

## Visual / Instrument mode

### Previous viewer composition

A double-nested card: the outer wrapper always carried its own `rounded-2xl`, and the inner canvas-host panel *also* carried its own separate `rounded-2xl border border-hairline` — two concentric rounded boundaries around the canvas, further nested inside the Scan tab's own `StepCard` (`rounded-3xl border p-6`). The non-fullscreen "Measurements" panel was a fixed `240px`-wide always-visible sidebar with no mobile transformation — on narrow viewports it simply stacked below the canvas via `grid-cols-1`, consuming vertical space with no way to collapse it.

### New full-bleed composition

The outer wrapper no longer adds its own rounding when not in fullscreen — the canvas panel's single `rounded-2xl border border-hairline` boundary is now the *only* frame around the stage, collapsing the double-nesting. Full-screen mode (pre-existing CSS-overlay takeover, `fixed inset-0 z-50`) is preserved as the true edge-to-edge Instrument-mode state, with its existing auto-hiding chrome behavior extended (see Accessibility below) rather than replaced.

### Tool rail

Unchanged tool set (Move/orbit, Auto-detect roof, Edit points, More tools → Distance/Area/Height/Marker/Split/Find roof edges, Hide/Show labels, Full screen, Undo/Redo, ft/m) plus one new action: **Reset view**, a bounded "fly the camera back to the starting framing shot" affordance (Anime.js-driven, disabled while `loadState !== "ready"`). Every tool-select button now carries `aria-pressed` reflecting active state (the ft/m toggle previously lacked this — added this phase, see Impeccable findings below) and a `min-h-11` (44px) minimum touch target. Active-state color for the plain "Move" and hand-measurement tools was changed from `bg-instrument` (Instrument Cyan) to `bg-action text-on-action` (the ink/ground inversion DESIGN.md defines as the app's actual primary-action token) — the pre-existing code used cyan for tool-active state, a direct violation of DESIGN.md's Readout Rule ("Instrument Cyan means 'this is a reading'... never an application action"). The "Finish" button in the draw-tool hint bar had the same violation and received the same fix.

### Inspector

Replaced the always-visible fixed sidebar with a composition that reserves a stable `260px` side panel at/above `1280px` (`SPLIT_INSPECTOR_BREAKPOINT_PX`, the same constant Phase 3's `SplitInspector` primitive uses) and becomes an Astryx `Dialog` bottom sheet below it, with a new "Measurements (N)" toggle button in the toolbar to open/close it on any viewport. **This does not go through `components/ui/split-inspector.tsx`'s `SplitInspector` wrapper** — see the dedicated bug writeup below; it composes the same underlying Astryx `Layout`/`Dialog` primitives directly, for a documented, load-bearing reason.

### Dark-Instrument Rule

Unchanged and preserved: `.surface-dark` on the outer wrapper, `bg-ground`/`bg-[#0b1418]` on the canvas panel, in both non-fullscreen and fullscreen composition. Not touched by this phase beyond the container-nesting fix.

### Desktop / tablet / mobile layout

Desktop (≥1280px): canvas + stable 260px side panel via CSS grid (`lg:grid-cols-[1fr_260px]`), matching Step 31's "reserve its space deliberately." Tablet (768–1024px) and mobile (<1280px): full-width canvas, inspector as a bottom `Dialog` sheet triggered by the toolbar toggle — deliberately not switching to the two-pane layout until 1280px, per Step 33's "do not switch to the desktop multi-pane treatment too early." This mirrors Phase 3's own `SplitInspector` breakpoint doctrine exactly (`lib/split-inspector.ts`'s documented reasoning: the shell's own sidebar already expands at `1024px`, so splitting the inspector at the same width starves the main pane).

---

## A real bug found and fixed this phase: the `SplitInspector` remount hazard

While building the responsive inspector, live browser testing (§Canvas pixel validation below) surfaced a serious, reproducible defect: composing the canvas panel as `<SplitInspector main={<canvas host>} .../>` caused the WebGL canvas to silently detach from the DOM on nearly every real page load.

**Root cause:** `components/ui/split-inspector.tsx`'s `SplitInspector` starts its internal `isSplit` state at `false` and flips it to `true` asynchronously, after its own mount effect reads `window.matchMedia`. That flip switches the component's returned JSX between two structurally different parents for the same `main` prop — a bare `<>{main}<Dialog>...</>` fragment before the flip, `<Layout content={main} end={...}>` after it. React's reconciliation unmounts and remounts an entire subtree whenever its ancestor chain changes shape between renders, so `main`'s DOM subtree — including the `<div ref={hostRef}>` the mount effect had already attached a live `WebGLRenderer` and RAF loop to — gets silently replaced with a fresh, empty node. Nothing re-runs the mount effect (its `[glbUrl]` dependency never changed), so the orphaned renderer keeps rendering into a detached canvas — a real, invisible GPU/memory leak — while the *visible* canvas host is permanently empty, stuck on "Loading your 3D model…".

This is exactly the class of hazard the phase's own worktree-safety instructions warned about (imperative Three.js lifecycles vs. React's reconciliation), just triggered by a different mechanism (a shared UI primitive's own internal breakpoint state, not React StrictMode).

**Fix:** `measure-viewer.tsx` composes Astryx `Layout`/`LayoutPanel`/`Dialog`/`DialogHeader` directly — the exact same underlying primitives `SplitInspector` itself wraps — instead of going through the wrapper. The canvas panel is always rendered in the *same* JSX position (a plain grid `<div>`, `<div>`, sibling side-panel `<div>` that's conditionally present) regardless of `isSplit`/`fullscreen`/`isInspectorOpen` state; only classNames and *sibling* presence change, never the canvas host's own ancestor chain. This is documented in-code at the `isSplit` state declaration in `measure-viewer.tsx` and is a deliberate, reasoned exception — **zero new Astryx swizzles**: it reaches for Astryx's own lower-level primitives, not a patched copy of `SplitInspector`.

`components/ui/split-inspector.tsx` itself was **not** modified — this is a documented workaround in the one consumer whose child owns an imperative, ref-bound DOM lifecycle, not a claim that `SplitInspector` is broken for its other, more typical consumers (lists, forms, static content) where a remount is harmless.

---

## Anime.js

**Installed version:** `4.5.0`, exact pin, matching `docs/DESIGN.md` §11.3's pinned research revision.
**Import strategy:** static imports confined to `components/viewer/anime-scene.ts`; both viewers reach it only via dynamic `import()` inside their mount effect.
**`createScope` location:** one scope per mounted viewer instance, created in `createViewerAnimeController(root)` where `root` is the canvas host element. Three methods (`reveal`, `emphasize`, `flyTo`) are registered via `self.add(name, fn)` inside the scope's constructor callback, matching Anime's own documented React-integration pattern (verified against animejs.com's "Using with React" guide before implementation, not from memory).
**Cleanup:** `revert()` calls `scope.revert()` on unmount, alongside the existing RAF/listener/renderer disposal in the same effect cleanup.

**Timelines/animations created:**

| Animation | Trigger | Property | Duration | Interruptible? | Reduced-motion behavior |
|---|---|---|---|---|---|
| Model reveal | `loadState → "ready"` | `group.scale` (array from/to: `[fitted×0.001, fitted]`) | 460ms, `outExpo` | N/A (one-shot, non-blocking — user can orbit immediately) | Skipped; scale is set directly at its fitted value with no Anime scope created at all |
| Selection emphasis | Clicking a measurement row (not its delete button) | target measurement group's `.scale` (`[1, 1.18, 1]` pulse) | 360ms, `outElastic(1, .6)` | N/A (one-shot pulse) | Skipped |
| Camera fly-to ("Reset view") | Toolbar button click | `camera.position` + `controls.target` | 500ms, `inOutQuad` | Yes — any real OrbitControls "start" event (genuine user pointer/wheel interaction) calls `cancelCameraMove()`, pausing both tweens | `applyReducedMotionState()` copies the final position/target directly, no Anime call |

**Why each exists:** model reveal and camera fly-to are both named as explicit candidates in the plan's own Step 18/19 lists ("initial model reveal," "fit model," "camera... move to known measurement context"). Selection emphasis is Step 17's "selected roof section emphasis" candidate, deliberately scoped down to a scene pulse rather than a camera move, since no per-object camera-focus interaction existed before this phase to safely extend.

**Camera/OrbitControls interruption:** `controls.addEventListener("start", () => animeControllerRef.current?.cancelCameraMove())`, wired in the mount effect, removed in cleanup. Verified live: dragging the canvas mid-flight stops the tween immediately; the camera stays exactly where the user left it.

**Damping coordination:** `flyTo` temporarily sets `controls.enableDamping = false` for the duration of its tween (restored via the animation's `onComplete`, or immediately by `cancelCameraMove` if interrupted mid-flight). This was added after live testing showed leftover drag-damping momentum (`sphericalDelta`) could visibly fight an externally-set camera position for as long as it takes to decay; disabling damping makes OrbitControls zero that residual unconditionally on its very next `update()` call rather than continuing to apply it.

**Materials/shared-material handling:** no material property is ever animated by this phase — only `scale` and `position`/`target` (Vector3 targets), so the "shared materials"/"transparent flag before opacity" adapter gotchas (verified against animejs.com's Three-adapter-gotchas page before implementation) do not apply. Group `.scale` animation is safe against those same gotchas specifically because it's a Group/Object3D transform, not a material property — the "animating a Group's opacity/color has no effect" gotcha is about materials, not `scale`/`position`, which Object3D (and Group) support directly.

**Rapid state-change behavior:** verified live — repeatedly clicking Reset view mid-flight, then immediately dragging, leaves the camera exactly at the user's final drag position with no delayed snap-back.

**Unmount behavior:** `revert()` + the pre-existing RAF/listener/renderer disposal all run in the same cleanup function, in the order: `animeControllerRef.current?.revert()` → `controls.removeEventListener("start", ...)` → `core.stopLoop()` → `core.disconnectResize()` → `disconnectContextLoss()` → DOM listener removal → `core.disposeCore()` → BVH disposal.

**StrictMode / stale-async guard:** the mount effect's `core.loadModel(...)` `onLoaded`/`onError` callbacks are now guarded by the same `cancelled` flag already used for the dynamic Anime import (`if (cancelled) return;` at the top of each). This was added defensively after investigating a live rendering anomaly during this phase's own testing (see §Live verification below) that traced back to environment-specific RAF throttling, not this particular gap — but the guard is correct, real StrictMode-safety practice regardless, and is now applied consistently to both async entry points a mount effect has (the dynamic import and the GLTFLoader callback) in both viewer files.

---

## States

**Loading:** pre-existing `"Loading your 3D model…"` banner, unchanged in wording, restyled only insofar as the surrounding panel's own boundary changed (§Visual composition).
**Empty / processing:** not owned by either viewer component — the Scan-tab step gating (`components/dashboard/phase-six-workflow.tsx`'s Step 3, `modelReady && latestModel && modelPackage`) only mounts `MeasureViewer` once a model exists, so "no model yet" and "still processing" are handled entirely upstream, unchanged and untouched by this phase, per Step 35/36's "do not invent a processing state if none exists."
**Model-load error:** pre-existing behavior preserved (`loadState: "error"`, `err.message` surfaced in-panel).
**WebGL unsupported (new):** `detectWebglSupport()` runs before `createSceneCore()` constructs a renderer; on `"unsupported"`, `loadState` is set to a new `"unsupported"` value and the mount effect returns before any `WebGLRenderer` is created. `ViewerStateBanner` renders plain-language fallback copy ("Your browser can't show the 3D view here... your measurements are still saved and available elsewhere on this job") — no blank canvas, no thrown exception.
**Context loss (new):** `observeContextLoss(renderer, {onLost, onRestored})` listens for `webglcontextlost`/`webglcontextrestored`, surfacing a small transient banner ("The 3D view paused to save graphics memory...") without rebuilding the renderer or interrupting the RAF loop (which no-ops draw calls harmlessly while the context is lost).

`HubModelViewer` received the identical WebGL-unsupported and context-loss treatment, using the same shared `detectWebglSupport`/`observeContextLoss` functions.

---

## Public Hub

**Before:** independently duplicated scene bootstrap, explicitly "untouched" through Phase 6 per that phase's own record.
**After:** uses `components/viewer/scene-core.ts` for scene/camera/renderer/lights/loader/resize/RAF/dispose — the exact same shared module `MeasureViewer` uses — while remaining fully self-contained: no import from `measure-viewer.tsx`, no BVH/raycasting/picking/measurement/undo code, no server-action calls. Gains the same WebGL-unsupported and context-loss states, and its own independent Anime.js reveal (its own `createViewerAnimeController` instance, its own dynamic import, its own `cancelled` guard).
**Read-only enforcement:** unchanged — `HubModelViewer` never imports anything editing-related; this was true before this phase and remains true, confirmed by grep (`grep -rn "MeasureViewer" components/public/` → no match).
**Editor bundle isolation:** confirmed via the same chunk analysis as §Architecture — `hub-model-viewer.tsx`'s own compiled chunk was independently identified via a distinctive string (`"Loading your roof"`) and does not co-locate with `measure-viewer.tsx`'s.
**Phase 6 shell preserved:** the surrounding `/hub/[clientToken]` document shell (migrated in Phase 6 to `DocumentSurface` primitives) was not touched — only the viewer component's own internals changed.

---

## Performance

**Render loop:** unchanged strategy — continuous `requestAnimationFrame`-driven rendering (not render-on-demand), preserved from before this phase; not converted, since the existing interaction model (live-updating OrbitControls damping, in-progress draft drawing, live edit-drag) genuinely needs continuous rendering.
**DPR strategy:** `computeDpr(rawDpr, cap = 2)`, extracted as a pure, unit-tested function from what was previously an inline `Math.min(window.devicePixelRatio, 2)` in both viewers — same value, same cap, now shared and testable.
**Resize:** `core.observeResize(host, onResize)` — one `ResizeObserver` per scene, camera aspect + renderer pixel size + (for `MeasureViewer`) the CSS2D label renderer size and line-material resolution all updated together in the same callback.
**Instrumentation:** `viewer-perf.ts`'s `startViewerPerf`/`markModelLoaded`/`markFirstFrame`, dev-only (`NODE_ENV !== "production"`), logs mount→model-loaded and mount→first-frame timing plus `renderer.info` draw-call/triangle/texture/geometry counts via `console.debug`. **Live-verified working** during this phase's own browser testing: `[viewer-perf] measure-viewer — mount→firstFrame 21ms, drawCalls=0 triangles=0 textures=0 geometries=0` (first frame fires before the model finishes loading, which is correct — draw counts populate once geometry is added to the scene).
**No fake CWV claim:** this phase makes no Lighthouse/Core Web Vitals claim — that comparison is explicitly Phase 8's, not this phase's, per the plan's own Step 63/§13.
**Bundle/dependency reach:** verified in §Architecture — one 45.6KB chunk, two importers, both viewer components, zero server-route references.
**Memory/disposal:** `disposeCore()` disposes renderer/controls/scene geometries/materials on unmount; `measure-viewer.tsx` additionally disposes BVH bounds trees and CSS2D DOM label elements. Repeated mount/unmount was exercised live during testing (multiple full-page navigations to the same viewer, each producing a fresh, correctly-disposed instance) without observed canvas-count accumulation.

---

## Accessibility

**Keyboard:** every tool-select button and the new "Reset view"/"Measurements" buttons are real `<button>` elements, natively keyboard-operable, each now carrying `aria-pressed` where it represents a toggle state (the ft/m unit toggle previously lacked this — added this phase). ⌘Z/⌘⇧Z undo/redo (pre-existing) and Esc-to-exit-fullscreen (pre-existing) preserved.
**Fullscreen chrome keyboard escape hatch (fixed this phase):** the pre-existing auto-hiding fullscreen chrome (reveal on `mousemove`, hide after 2.5s idle) had no keyboard equivalent — a keyboard-only user tabbing through the toolbar would have it disappear out from under them with no way to bring it back except a mouse gesture. Fixed: `focusin` now reveals chrome alongside `mousemove`; `onFocus`/`onBlur` on the chrome containers mirror the existing `onMouseEnter`/`onMouseLeave` "don't hide while parked" behavior; and `inert={chromeHidden || undefined}` is applied to both fullscreen chrome containers so hidden controls are removed from tab order and assistive-tech traversal entirely, rather than left invisibly focusable.
**Canvas accessible name:** `HubModelViewer`'s host div carries `role="img"` and a descriptive `aria-label` ("Interactive 3D model of your roof — drag to rotate, scroll to zoom"). `MeasureViewer`'s canvas does not carry an equivalent — deferred (see below); it's a materially different case (an editing instrument with many tool-dependent interaction modes, not a single fixed "view this" affordance), and a single static label would misrepresent it.
**Textual measurement alternatives:** unchanged and already present — the Measurements list panel renders every value as text, independent of the 3D canvas.
**44px touch targets:** every tool-rail button now carries `min-h-11` (44px).
**Reduced motion:** `prefersReducedMotion()` (Anime-side, matching `window.matchMedia("(prefers-reduced-motion: reduce)")`) is checked before ever creating an Anime scope in either viewer — not delegated to Motion's `MotionConfig`, per Step 59's explicit "Anime.js scene logic must explicitly choose its reduced-motion path... do not rely on Motion's provider."
**200% zoom / increased contrast:** not independently re-verified this phase (see Deferred).

---

## Validation

### Canvas pixel checks

Performed via a temporary, fully-reverted live-verification scaffold (§Files removed) against the real production GLB from job `cmpiuam8b00019kjkypgfvei7` (the same job `MODEL_RENDER_FIX_PLAN.md` used for its own live verification) — no seeded client-hub token existed in this environment, and no Clerk test credentials were available, so this was the only way to exercise real rendering rather than defer entirely. **Confirmed via direct screenshot inspection** at 1440px: both `MeasureViewer` and `HubModelViewer` render non-blank, textured, recognizable photogrammetric roof/property geometry, correctly framed at the default camera position, with the toolbar/inspector composition matching the intended Instrument-mode layout (dark stage, stable side panel, non-cyan tool-active states). A live `gl.readPixels()` probe from outside the render loop reads a cleared back buffer by design (no `preserveDrawingBuffer`) — screenshots, not `readPixels`, were used as the actual verification method, consistent with Step 71's "strongest available... verification without pretending it is Playwright."

### Interaction / interruption

Live-verified: orbit drag correctly reorients the camera from multiple angles; tool switching (`Move` ↔ `Auto-detect roof`) correctly toggles `aria-pressed` and the active-state class (confirmed via computed styles, not just visual inspection, after an initial screenshot-JPEG-compression optical illusion nearly produced a false "stuck" reading — corrected by checking `getComputedStyle`/`aria-pressed` directly); "Reset view" camera-flight interpolation confirmed progressing correctly frame-by-frame via direct `camera.position` sampling; interrupting a flight with a real drag confirmed to stop the tween immediately with no snap-back.

### A genuine environment artifact, investigated and resolved

A large fraction of this phase's live-testing time went into a rendering anomaly that initially looked like a broken Anime.js integration (camera/model appearing "stuck" after Reset view) and, after extensive direct instrumentation (temporary `console.debug` tracing of animation frame counts, `document.visibilityState`, and direct `camera`/`group` transform reads via a temporary debug hook — all removed before finishing), was root-caused to `document.visibilityState === "hidden"` in the automated Chrome tab used for testing, which throttles `requestAnimationFrame` near-zero. Both the render loop and Anime's own internal ticker depend on RAF; with it starved, animation values updated only sporadically (confirmed: forcing extra ticks via repeated screenshot captures caused visible, correct interpolation progress). This is standard, correct browser behavior for a backgrounded tab, not a code defect — confirmed by verifying the *final* interpolated values were always mathematically correct once enough real ticks accumulated. The `cancelled`-guard hardening on `loadModel`'s callbacks (§Anime.js) and the OrbitControls-damping coordination in `flyTo` were both added during this investigation as genuine, independently-justified improvements, even though neither turned out to be the root cause of the specific symptom being chased.

### Repeated mount/unmount

Exercised via multiple full-page navigations to the live verification route; each load produced exactly one correctly-testid'd canvas per viewer with no accumulation.

### Console

Zero new console errors from either viewer across all live testing. One pre-existing, unrelated hydration-mismatch warning was observed (caused by a Grammarly browser extension injecting `data-gr-ext-installed`/`data-new-gr-c-s-check-loaded` attributes before React hydrates) — explicitly not a Phase 7 regression, and not fixable from application code.

### lint / typecheck / tests / build / Astryx doctor / Graphify

See §9 above and §Graphify below.

### Impeccable critique

Dual-assessment critique run against both viewer files (Assessment A: isolated design-review sub-agent; Assessment B: `detect.mjs` deterministic scan — 0 findings, expected for `.tsx` source rather than rendered markup). Score: **29/40 (Good)**. Full report persisted at `.impeccable/critique/2026-08-16T21-49-54Z__components-dashboard-measure-viewer-tsx.md`.

**P0 fixed this phase:** confirmed measurement values (the CSS2D on-model label and the inspector list's value span) were rendering in plain `text-ink-primary` instead of Instrument Cyan — a direct violation of DESIGN.md's Readout Rule for the one surface that rule exists for. Both now use `text-instrument-fg tabular-nums`.

**P1s fixed this phase:** the ft/m unit toggle's missing `aria-pressed` (added); the fullscreen keyboard-escape-hatch gap (fixed, see §Accessibility).

**P1 deferred:** the tool rail's hardcoded non-token hues (yellow-400 for Auto-detect, violet-400 for Edit points, rose-300 for delete/error text) beside the system's one reserved amber. This is pre-existing styling from before this phase, not introduced by it. Deferred because a real fix requires a genuine design decision (what replaces these colors while preserving each tool's visual identity) rather than a bounded token substitution, and attempting that under this phase's remaining time budget risked a worse, half-considered outcome. Documented for a future pass.

**P2 deferred:** "Clear all" has no destructive-action confirmation (undo exists but isn't surfaced at the point of the action).

---

## Explicit confirmations

- No Prisma schema change.
- No migration.
- No permission change — the aerial-module gate and viewer-tool permission checks in `phase-six-workflow.tsx`/`measure-viewer.tsx`'s server-action calls are untouched.
- No workflow-state change.
- No financial logic change.
- No public-document behavior change (Phase 6's document-mode migration untouched; only the Hub's *viewer* internals changed).
- No auth/onboarding change.
- No job-workflow behavior change — `PhaseSixWorkflow`, `StepCard`, and the surrounding Scan-tab composition are untouched; this phase owns only the viewer/tool surface within Step 3.
- No renderer-framework migration — still raw Three.js, no react-three-fiber, no second 3D engine.
- No second animation system — Motion is not newly used inside either viewer; CSS/Motion/Anime ownership boundaries are unchanged from what DESIGN.md already specified.
- Phase 8 did not begin.

## Deferred / honestly unverified

- Full cross-browser matrix (iPhone Safari, iPad Safari, Android Chrome, macOS Safari, previous-major desktop Chrome/Edge) — only desktop Chrome (via the automated testing tab) was exercised live this phase.
- True mobile-viewport (390px) live interaction testing — not performed; the responsive breakpoint logic (`isSplit` at 1280px, matching Phase 3's own established constant) was verified by direct code reuse of the same tested primitive's breakpoint value, not independently screenshot-verified at 390px this phase.
- 200% browser zoom and increased-contrast forced-colors verification — not independently re-tested this phase (the underlying app-wide tokens Phase 1 already established for these preferences are unchanged).
- `MeasureViewer`'s own canvas accessible name/description — deferred, see §Accessibility.
- Real WebGL-unavailable and context-loss live triggering — both paths were code-reviewed and exercised via the shared `webgl-capability.ts`/`observeContextLoss` unit-level logic, but not live-triggered in an actual browser (no safe, available mechanism to force either in this environment without global browser-behavior changes, per Step 78's "do not permanently change global browser behavior").
- The tool-rail hardcoded-color P1 (see Impeccable §above).
- "Clear all" confirmation P2 (see Impeccable §above).
- Full Lighthouse/Core Web Vitals comparison — explicitly Phase 8's scope.

Phase 6 already honestly deferred real-device testing and full Lighthouse coverage; this phase does not attempt to backfill that — Phase 8 owns the global hardening pass.

---

Phase 7 complete. Waiting for approval before Phase 8 — Hardening, cleanup, and cutover.
