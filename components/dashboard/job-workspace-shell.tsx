"use client";

import { useEffect, useState, type ReactNode } from "react";
import { m } from "motion/react";
import { SplitInspector } from "@/components/ui/split-inspector";
import { SPLIT_INSPECTOR_BREAKPOINT_PX } from "@/lib/split-inspector";
import { fadeUp } from "@/lib/motion";

/**
 * The job workspace's Workbench composition — a narrow client controller
 * around Server-rendered `main`/`inspector` children (Step 58), so the panels
 * inside each slot stay whatever component type they already were.
 *
 * The inspector's content fades and rises in on mount (`fadeUp`, lib/motion.ts)
 * — "contextual panel entry" from the Phase 4 motion plan. This is Motion's
 * to own, not Astryx's: `SplitInspector`'s desktop split conditionally mounts
 * `LayoutPanel` itself with no transition of its own, so nothing here
 * competes with an Astryx-owned animation (Step 44's ownership table). The
 * mobile sheet's own open/close motion stays entirely Astryx `Dialog`'s —
 * this wrapper only touches the content inside it, never the sheet chrome.
 *
 * `SplitInspector` starts every mount with its pane closed/sheet-mode until
 * its own viewport check resolves (Step 65's no-flash requirement met by
 * matching its SSR-safe default). This wrapper runs the identical
 * `matchMedia` check to decide whether the inspector should default to open
 * — true once real width says `>= SPLIT_INSPECTOR_BREAKPOINT_PX` (a stable
 * side pane), false otherwise (nothing auto-opens over mobile content on
 * load). Below that width, the "Job details" trigger at the top of `main`
 * (hidden at `xl:` — Tailwind's default 1280px matches the constant exactly)
 * is the only way in, same as any other sheet trigger in this app.
 */
export function JobWorkspaceShell({
  main,
  inspector,
  inspectorTitle,
}: {
  main: ReactNode;
  inspector: ReactNode;
  inspectorTitle: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${SPLIT_INSPECTOR_BREAKPOINT_PX}px)`);
    const sync = () => setIsOpen(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <SplitInspector
      main={
        <div className="space-y-8">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="min-h-11 rounded-xl border border-hairline bg-surface-raised px-4 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument xl:hidden"
          >
            Job details
          </button>
          {main}
        </div>
      }
      inspector={
        // Sticky so the inspector stays in view while `main`'s tabs — the
        // scan tab especially, with photo grids and a 3D model — scroll well
        // past the inspector's own shorter content (Step 36).
        <m.div
          key={String(isOpen)}
          initial="initial"
          animate="animate"
          variants={fadeUp}
          className="sticky top-6"
        >
          {inspector}
        </m.div>
      }
      isInspectorOpen={isOpen}
      onInspectorOpenChange={setIsOpen}
      inspectorTitle={inspectorTitle}
    />
  );
}
