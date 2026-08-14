"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Dialog } from "@astryxdesign/core/Dialog";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { SPLIT_INSPECTOR_BREAKPOINT_PX } from "@/lib/split-inspector";

/**
 * The Workbench's stable master/detail pane — the structural reason Phase 0
 * selected Workbench in the first place (docs/phase-0/04-decision-record.md).
 *
 * >= SPLIT_INSPECTOR_BREAKPOINT_PX (1280px, see lib/split-inspector.ts for
 * why this differs from the shell's own 1024px sidebar breakpoint): a true
 * two-pane split via Astryx Layout's `end` slot (Decision B) — LayoutPanel
 * already handles the divider, width, and landmark role.
 *
 * Below that: the inspector opens as an Astryx Dialog anchored to the
 * bottom edge (`position={{ bottom: 0 }}`, full width) rather than an
 * awkward narrow second column — Phase 0 already concluded a cramped split
 * below ~1024px destroys the interaction model. Reusing Dialog here instead
 * of hand-rolling a sheet keeps the native `<dialog>` focus trap, Escape
 * handling, backdrop, and scroll lock — the same guarantees Phase 2's
 * command palette and mobile drawer already rely on — rather than
 * re-deriving them (Step 41: no swizzle, no bespoke overlay mechanics
 * without a documented gap).
 */
export function SplitInspector({
  main,
  inspector,
  isInspectorOpen,
  onInspectorOpenChange,
  inspectorTitle,
  inspectorWidth = 380,
}: {
  main: ReactNode;
  inspector: ReactNode;
  /** Whether a row/item is selected. Drives the mobile sheet's visibility; on desktop, the pane only occupies space once something is selected. */
  isInspectorOpen: boolean;
  onInspectorOpenChange: (open: boolean) => void;
  inspectorTitle: string;
  inspectorWidth?: number;
}) {
  const isSplit = useIsSplitViewport();

  if (isSplit) {
    return (
      <Layout
        height="auto"
        content={main}
        end={
          isInspectorOpen ? (
            <LayoutPanel hasDivider width={inspectorWidth} role="complementary" label={inspectorTitle}>
              {inspector}
            </LayoutPanel>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      {main}
      <Dialog
        isOpen={isInspectorOpen}
        onOpenChange={onInspectorOpenChange}
        purpose="info"
        width="100%"
        maxHeight="85vh"
        position={{ bottom: 0 }}
      >
        <DialogHeader title={inspectorTitle} onOpenChange={onInspectorOpenChange} />
        <LayoutContent>{inspector}</LayoutContent>
      </Dialog>
    </>
  );
}

/** Client-only viewport check — SplitInspector always renders the (correct, matching) mobile sheet markup during SSR/first paint, then reconciles once the real width is known, same pattern as the shell's own breakpoint hooks. */
function useIsSplitViewport() {
  const [isSplit, setIsSplit] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${SPLIT_INSPECTOR_BREAKPOINT_PX}px)`);
    const update = () => setIsSplit(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isSplit;
}
