"use client";

import { useEffect, useRef, useState } from "react";
import { fitObjectToViewer } from "@/lib/viewer-fit";
import { createSceneCore, observeContextLoss } from "@/components/viewer/scene-core";
import { detectWebglSupport } from "@/components/viewer/webgl-capability";
import { markFirstFrame, markModelLoaded, startViewerPerf } from "@/components/viewer/viewer-perf";
import type { ViewerAnimeController } from "@/components/viewer/anime-scene";

type LoadState = "loading" | "ready" | "error" | "unsupported";

/**
 * The homeowner's own roof, in 3D — orbit, pan, zoom, and nothing else.
 *
 * Not `MeasureViewer` with the tools hidden. That component exists to *edit*
 * a model — draft points, BVH raycasting for picking, undo/redo, an
 * always-listening pointer pipeline for placing measurements — and every one
 * of those is attack surface and bundle weight this page has no use for. A
 * homeowner on a phone gets the same GLTFLoader/DRACOLoader/OrbitControls
 * core `MeasureViewer` uses and stops there.
 *
 * Phase 7: both viewers' scene bootstrap now comes from the shared,
 * viewer-local `components/viewer/scene-core.ts` (low-level scene/loader/
 * framing → each viewer, not one viewer importing the other — Phase 7 Step
 * 89) so the CSP/texture fix and any future loader change only needs to be
 * made once. This component still does NOT import anything from
 * `measure-viewer.tsx` — no editing tools, no BVH raycasting, no measurement
 * bundle reaches the public Hub (Phase 7 Step 47).
 *
 * Stays dark regardless of the paper page around it, same reasoning
 * DESIGN.md's Dark-Instrument Rule gives `MeasureViewer` itself: a live 3D
 * surface is an instrument panel, not a document, and it reads as one
 * embedded object rather than fighting the page's own theme.
 */
export function HubModelViewer({ glbUrl }: { glbUrl: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();
    setLoadState("loading");
    setContextLost(false);

    const reportUnsupported = () => setLoadState("unsupported");
    if (detectWebglSupport() === "unsupported") {
      reportUnsupported();
      return;
    }

    const perf = startViewerPerf("hub-model-viewer");
    const core = createSceneCore(host);
    let animeController: ViewerAnimeController | null = null;
    let cancelled = false;

    import("@/components/viewer/anime-scene").then(({ createViewerAnimeController, prefersReducedMotion }) => {
      if (cancelled) return;
      if (!prefersReducedMotion()) animeController = createViewerAnimeController(host);
    });

    core.loadModel(glbUrl, {
      // Guarded by `cancelled` — see the matching comment in
      // measure-viewer.tsx: StrictMode dev double-invokes this effect and
      // `loadModel` can't abort an in-flight fetch/parse, so a stale first
      // mount's load can still resolve after cleanup and act on an
      // already-disposed scene.
      onLoaded: (root) => {
        if (cancelled) return;
        core.group.add(root);
        fitObjectToViewer(core.group);
        markModelLoaded(perf);
        setLoadState("ready");
        animeController?.revealModel(core.group);
      },
      onError: () => {
        if (cancelled) return;
        setLoadState("error");
      },
    });

    core.observeResize(host);
    const disconnectContextLoss = observeContextLoss(core.renderer, {
      onLost: () => setContextLost(true),
      onRestored: () => setContextLost(false),
    });
    core.startLoop(() => markFirstFrame(perf, core.renderer));

    return () => {
      cancelled = true;
      animeController?.revert();
      core.stopLoop();
      core.disconnectResize();
      disconnectContextLoss();
      core.disposeCore();
      host.replaceChildren();
    };
  }, [glbUrl]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-paper-rule">
      <div
        ref={hostRef}
        role="img"
        aria-label="Interactive 3D model of your roof — drag to rotate, scroll to zoom"
        className="h-full w-full"
      />
      {loadState === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b1418] text-sm text-white/70">
          Loading your roof…
        </div>
      ) : null}
      {loadState === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b1418] px-6 text-center text-sm text-white/70">
          Couldn&rsquo;t load the 3D model right now — everything else on this page still works.
        </div>
      ) : null}
      {loadState === "unsupported" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b1418] px-6 text-center text-sm text-white/70">
          Your browser can&rsquo;t show the 3D model here — everything else on this page still works.
        </div>
      ) : null}
      {contextLost ? (
        <div className="absolute inset-x-4 bottom-4 rounded-lg border border-paper-rule bg-[#0b1418]/90 px-3 py-2 text-center text-xs text-white/70">
          The 3D view paused to save graphics memory. It will pick back up shortly.
        </div>
      ) : null}
    </div>
  );
}
