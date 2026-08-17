# Model Render Fix Plan — GLTFLoader blob texture failures

Status: **fixed and verified live in the browser.** See "Resolution" at the bottom — the initial
root-cause diagnosis below (img-src only) was real but incomplete; the actual fix required
`connect-src`, not `img-src`. Left the rest of this document as originally written since the
investigation trail is still accurate and useful context.

## 1. Problem summary

On the job page, the 3D roof/model viewer renders geometry but every texture fails to load. The
console repeatedly logs:

```
THREE.GLTFLoader: Couldn't load texture blob:http://localhost:3000/<uuid>
```

once per embedded image in the GLB (dozens of them), and the model appears mostly white/flat —
consistent with geometry rendering successfully but every material's texture map failing to
apply.

## 2. Root cause (confirmed, high confidence)

This is a **Content-Security-Policy gap**, not a viewer/loader-lifecycle bug.

- `proxy.ts` runs `clerkMiddleware(..., { contentSecurityPolicy: { strict: true, directives: {...} } })`.
  Clerk generates the CSP itself; `strict: true` means there is no permissive fallback.
- Clerk's built-in default directives (`node_modules/@clerk/nextjs/dist/esm/server/content-security-policy.js`,
  `DEFAULT_DIRECTIVES`) set:
  ```
  "img-src": ["self", "https://img.clerk.com"]
  ```
  No `blob:`. `worker-src` gets `blob:` by default, but `img-src` does not.
- `proxy.ts` only extends `img-src` conditionally, and only for storage:
  ```ts
  ...(storageImgSrc.length > 0 ? { "img-src": storageImgSrc } : {}),
  ```
  In local-storage dev mode (`STORAGE_PUBLIC_BASE_URL` unset), `img-src` is never extended at all,
  so it stays at Clerk's default with no `blob:`.
- `node_modules/three/examples/jsm/loaders/GLTFLoader.js`, `loadImageSource()` (~line 3287–3369):
  for any glTF image sourced from an embedded `bufferView` (the normal case for a self-contained
  `.glb`), it does:
  ```js
  const blob = new Blob([bufferView], { type: sourceDef.mimeType });
  sourceURI = URL.createObjectURL(blob);
  ...
  loader.load(LoaderUtils.resolveURL(sourceURI, options.path), onLoad, undefined, reject);
  ```
  `loader` here is a `THREE.TextureLoader` (the default; `measure-viewer.tsx` never configures an
  `ImageBitmapLoader`), which loads by setting `image.src = url` on an `HTMLImageElement`. Loading
  an `<img>` from a `blob:` URL is governed by the CSP `img-src` directive — **not**
  `connect-src`/`worker-src`/`default-src`. Since `blob:` isn't in `img-src`, the browser blocks
  the load, the `<img>` fires `onerror`, the promise rejects, and three.js's own `.catch` logs
  `"THREE.GLTFLoader: Couldn't load texture", sourceURI` — exactly the message being seen.
  The blob is revoked immediately after (success or failure) in the same function (line ~3354),
  which is normal, correct three.js behavior and not the bug.
- This CSP was introduced in `85c6ace` ("Tier 0 deployment readiness: real CSP, CRON_SECRET docs,
  prisma migrate baseline, deploy runbook") — a prior hardening pass that tightened CSP without
  accounting for the 3D viewer's blob-URL texture loading path. It applies in `next dev` too (the
  `img-src` default is not `NODE_ENV`-gated), which is why it reproduces locally.

**Why geometry still renders:** the GLB's mesh/geometry buffers are parsed directly from the
downloaded `ArrayBuffer` inside `GLTFLoader.parse()` — never routed through an `<img>` element —
so they're unaffected by `img-src`. Only image/texture loading goes through `<img>.src`, hence
"geometry fine, textures white."

### Ruled out / lower-confidence alternates (verify, don't assume)

- **Premature `revokeObjectURL`**: not the app's responsibility here — three.js creates and
  revokes these blob URLs entirely internally, scoped to a single texture's own load promise, not
  tied to component unmount/remount. No app code calls `createObjectURL`/`revokeObjectURL` for
  model textures (confirmed via repo-wide grep — the only app-level `createObjectURL` usage is in
  `components/dashboard/comparison-create-form.tsx`, an unrelated file-preview feature).
- **Corrupt/missing texture bytes from ODM export**: possible in theory, but doesn't explain the
  console message shape (a CSP block produces exactly this "Couldn't load texture" + blob URL
  pattern; a genuinely corrupt image would usually also produce a browser-level image decode
  error, and it's implausible that *every* embedded image across multiple jobs is corrupt).
- **React effect double-invoke / dev StrictMode re-mounting the scene twice**: worth a quick sanity
  check (see checklist) but doesn't fit the symptom either — a double-mount would show duplicate
  *successful* loads or duplicate loaders racing, not a blanket "every texture fails."
- **Next.js client/server boundary**: `measure-viewer.tsx` is already `"use client"` at the top and
  all Three.js/DOM work happens inside `useEffect`. No SSR/hydration mismatch is implicated by the
  symptom (errors are purely runtime network/CSP, not render-mismatch warnings).

## 3. Files to inspect

| File | Why |
|---|---|
| `proxy.ts` | Source of the CSP (`contentSecurityPolicy.directives`) via `clerkMiddleware`. This is where the fix goes. |
| `next.config.ts` | Confirmed CSP is *not* also set here (only unrelated security headers) — no second source to reconcile. |
| `components/dashboard/measure-viewer.tsx` | Main job-page viewer (`MeasureViewer()`, line ~197). GLTFLoader setup at line ~393, texture colorSpace handling at ~407, load success/error callbacks at ~397-423. |
| `components/public/hub-model-viewer.tsx` | Public client-hub viewer (`HubModelViewer()`) — likely shares the same GLTFLoader pattern and the same CSP applies to `/hub/(.*)` routes (public per `proxy.ts`'s route matcher, but still passes through `clerkMiddleware` so still gets the CSP header). Needs the same validation. |
| `lib/roof-extraction-service.ts` (`resolveMeshText`, `resolveTexturedModelMeshText`, `texturedMeshCache`) | Resolves/serves the GLB URL passed into the viewer as `glbUrl` — confirms the model is a single `.glb` with embedded textures (bufferView-sourced images), not separate texture files. |
| `lib/nodeodm-client.ts` (`nodeOdmAssetUrls`, `nodeOdmDownloadUrl`) | How the GLB's own URL is resolved/downloaded — relevant only for ruling out a second, unrelated fetch issue. |
| `node_modules/@clerk/nextjs/dist/esm/server/content-security-policy.js` | **Reference only, do not edit.** Confirms Clerk's default `img-src` value and the union-merge behavior (`handleExistingDirective`) — i.e., adding `img-src: ["blob:"]` in `proxy.ts` will be *merged into* the defaults, not replace them. |
| `node_modules/three/examples/jsm/loaders/GLTFLoader.js` | **Reference only, do not edit.** Confirms the `createObjectURL`/`TextureLoader`/`revokeObjectURL` mechanism (lines ~3287-3369) that this bug flows through. |

## 4. Task checklist (small, targeted steps)

1. [ ] In `proxy.ts`, add `blob:` to the `img-src` directive inside `contentSecurityPolicy.directives`,
   unconditionally (not gated on `storageImgSrc`), e.g.:
   ```ts
   "img-src": ["blob:", ...storageImgSrc],
   ```
   (Clerk's `handleExistingDirective` unions this with its own `["self", "https://img.clerk.com"]`
   defaults, so `self` and the Clerk image host are preserved automatically — no need to repeat them.)
2. [ ] Add a one-line comment explaining *why* `blob:` is required (the GLTFLoader embedded-texture
   pattern above), so a future CSP audit doesn't strip it as unused/unexplained.
3. [ ] Restart the dev server fully (middleware changes are not hot-reloaded the way component
   code is) and hard-reload the job page.
4. [ ] Confirm via the Network tab (response headers on the document request) that the served
   `Content-Security-Policy` header's `img-src` now includes `blob:`.
5. [ ] Reload the job page and confirm the `"Couldn't load texture blob:"` messages are gone and
   the roof model shows its actual photogrammetric texture, not flat white.
6. [ ] Spot-check `components/public/hub-model-viewer.tsx` on a `/hub/[clientToken]` page that has
   a processed model, to confirm the same fix resolves it there too (same CSP, shared loader
   pattern) — do not assume; verify.
7. [ ] Verify current fallback behavior when a texture genuinely fails (e.g. temporarily block one
   image request via devtools to simulate): confirm the model still renders geometry rather than
   the whole `loader.load(...)` erroring out to `setLoadState("error")`. Evidence from the current
   bug (geometry renders, just untextured) suggests three.js already degrades gracefully per-texture
   rather than failing the whole `onLoad`/`onError` callback — confirm this rather than assume it.
8. [ ] Only if step 7 shows failures *do* propagate to the top-level `onError` (i.e. one bad texture
   currently kills the whole viewer): add a minimal, targeted fallback — do not rewrite the loader.
   The smallest fix is catching a per-material texture failure and falling back to an untextured
   `MeshStandardMaterial` for that mesh, without touching the surrounding pick/measurement/tool
   logic in `measure-viewer.tsx`.
9. [ ] Do not remove the existing `console.error`/`setError(...)` logging in the GLTFLoader error
   callback (measure-viewer.tsx ~line 418-422) — keep it until the fix is confirmed working, then
   it's fine to leave in place permanently (it's useful ongoing diagnostics, not debug-only noise).

## 5. Validation checklist

- [ ] Model geometry fully renders (already true today — must remain true, no regression).
- [ ] Textures load with **zero** `THREE.GLTFLoader: Couldn't load texture` console messages on a
  fresh job page load.
- [ ] Confirm via DevTools Network tab that the CSP response header's `img-src` includes `blob:`.
- [ ] No `Refused to load the image 'blob:...' because it violates the following Content Security
  Policy directive` errors in the console (the browser-level CSP violation message, separate from
  three.js's own log line — check for it explicitly, it may have been suppressed/truncated in the
  original terminal capture).
- [ ] No object URLs are revoked too early — confirm no *new* `createObjectURL`/`revokeObjectURL`
  code was added anywhere in the fix (the CSP-only fix shouldn't touch this at all); if step 8's
  fallback code is needed, verify it doesn't call `revokeObjectURL` before the image's `onload`/
  `onerror` fires.
- [ ] Measurement tools still work: draw a distance/area/height measurement and confirm it commits
  (`saveModelMeasurementAction`) and persists after reload.
- [ ] Roof auto-detect tool still runs and produces a boundary.
- [ ] Edit-points mode still allows dragging an existing measurement's vertices.
- [ ] Zoom/rotate (`OrbitControls`) still functions (mouse + touch/pinch).
- [ ] Quote/save flow from the job page still completes end-to-end after the CSP change (CSP is
  a document-wide header — confirm nothing else on the page, like form submissions or the
  notification bell's server actions, was accidentally affected).
- [ ] No new hydration or client-only-code errors appear in the console on page load (the fix is
  proxy.ts + no component code, so this should be a no-op, but verify — CSP changes have been
  known to surface unrelated inline-script/nonce issues elsewhere on the page).
- [ ] `/hub/[clientToken]` public model viewer (`hub-model-viewer.tsx`) also renders textured,
  confirming the fix isn't job-page-viewer-specific.
- [ ] Re-run the app's existing Three.js/measurement test suite (`tests/measure-geometry.test.ts`,
  `tests/edge-classification.test.ts`, `tests/roof-extraction.test.ts`, `tests/merge-coplanar.test.ts`,
  `tests/viewer-fit.test.ts` if present) to confirm no regression from the CSP change (these are
  logic tests, not expected to touch CSP, but cheap to confirm green).
- [ ] Confirm the CSP change is scoped to `img-src` only — no accidental loosening of `script-src`,
  `connect-src`, `frame-src`, or the other directives `proxy.ts` deliberately locks down
  (`frame-ancestors`, `object-src`, `base-uri`).

## 6. Fallback behavior if a texture genuinely fails (not the CSP case)

Even after the CSP fix, an individual texture could still fail for a real reason (e.g. a
genuinely corrupt image from an ODM export, a network blip). The desired behavior, per the task
requirements, is: **never hide geometry because one texture failed.**

- First confirm (task checklist step 7) whether this is *already* three.js's behavior — the
  current symptom (geometry renders, only texture is missing) is itself evidence that per-texture
  failures already don't propagate to the whole-model `onError` callback. If confirmed, **no new
  fallback code is needed** — the CSP fix alone is sufficient, and the existing behavior already
  satisfies "geometry always renders, textures degrade gracefully."
- If disproven (a single bad texture *does* currently kill the whole model load), the minimal fix
  is a `try/catch` (or `.catch()`) around the per-mesh texture/material assignment in the
  `gltf.load()` success callback in `measure-viewer.tsx` (~lines 399-410), falling back to a
  neutral `THREE.MeshStandardMaterial` (flat gray, matching the current "mostly white/flat" look
  users would already be used to) for just that mesh, while still calling `setLoadState("ready")`
  and keeping `fitObjectToViewer(group)` — i.e. the rest of the model and all measurement tooling
  stays fully functional.

## Explicitly out of scope

- No rewrite of `measure-viewer.tsx` or `hub-model-viewer.tsx`.
- No change to the measurement/tool/edit-point/quote workflow logic.
- No change to `lib/roof-extraction-service.ts`, `lib/nodeodm-client.ts`, or how the GLB itself is
  generated/served — the GLB and its embedded textures are not corrupt; the browser is blocking a
  legitimate load.
- No loosening of any CSP directive other than `img-src`, and only by adding `blob:`.

## Resolution

The `img-src: blob:` fix above was applied first, verified via response headers and a synthetic
`<img>` + blob: test in the live browser — and it did **not** resolve the bug. Every texture still
failed identically after a hard reload. That forced a second round of investigation, done by
instrumenting the live page directly (patching `URL.createObjectURL`, `console.error`, and
`document.createElementNS` in-page, then triggering a real model load) rather than reasoning about
the code alone:

- The failing blob URLs' raw bytes were valid, correctly-typed JPEGs (confirmed via
  `blob.slice().arrayBuffer()` and independent decode) — not a corrupt-texture-data problem.
- `URL.revokeObjectURL` was never called on any of the failing URLs before they errored — not a
  premature-revocation race (an earlier working theory, disproven by direct instrumentation).
- The real cause: **`node_modules/three/examples/jsm/loaders/GLTFLoader.js`, in Chrome (non-Safari,
  non-old-Firefox), uses `THREE.ImageBitmapLoader`** for texture loading, not the `<img>`-based
  `TextureLoader` assumed above. `ImageBitmapLoader.load()`
  (`node_modules/three/src/loaders/ImageBitmapLoader.js`) does `fetch(url, fetchOptions)` on the
  blob: URL before calling `createImageBitmap()`. `fetch()` is governed by CSP's **`connect-src`**,
  not `img-src` — and `connect-src` never had `blob:` added. That's what was actually blocking
  every texture.

**Fix applied:** added `"connect-src": ["blob:"]` alongside the existing `"img-src": ["blob:", ...storageImgSrc]`
in `proxy.ts`'s `contentSecurityPolicy.directives`. Both are kept: `connect-src` covers the
`ImageBitmapLoader`/`fetch()` path Chrome actually uses; `img-src` covers the `<img>`-based
`TextureLoader` fallback path (Safari <17, Firefox <98).

The unrelated `THREE.Cache.enabled = true` change (added while chasing the premature-revocation
theory) was reverted from both `measure-viewer.tsx` and `hub-model-viewer.tsx` once that theory was
disproven — it wasn't the fix and wasn't justified by evidence.

**Verified live** (job `cmpiuam8b00019kjkypgfvei7`, hard-reloaded, console cleared first): zero
`GLTFLoader`/texture console errors, zero console errors of any kind, and the model renders with
real photogrammetric texture (visible shingle/foliage color, not flat white). Measurement tools
(Auto-detect roof, Edit points, area list), the workflow status card, and the roof-faces report
below the viewer all rendered normally — no regression observed. Did not separately re-verify
`hub-model-viewer.tsx` in-browser (no public hub job with a completed model was on hand this
session) — same fix, same mechanism, same file pattern, but flagging it as unverified rather than
assuming.
