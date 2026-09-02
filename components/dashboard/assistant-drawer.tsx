"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { RoofAssistant } from "@/components/dashboard/roof-assistant";
import { AiSummary } from "@/components/dashboard/ai-summary";

/**
 * The roof assistant lives in a slide-over drawer, not inline. It used to sit as
 * a 520px panel between the job header and the workspace tabs, pushing the
 * actual work below the fold. It is a helper, not a stage of the job — so it
 * gets a recessive floating trigger (never Instrument Cyan; that is reserved for
 * readouts) and opens on demand over a scrim.
 *
 * The panel stays mounted and is marked `inert` when closed, so the conversation
 * survives closing the drawer and hidden content stays out of the tab order and
 * the accessibility tree.
 */
export function AssistantDrawer({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Move focus into the drawer so a keyboard/screen-reader user lands in the
    // dialog rather than on the now-obscured trigger. (Not a strict focus trap;
    // Esc and the scrim close it, and focus returns to the trigger.)
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Return focus to the trigger when the drawer closes, so keyboard users don't
  // lose their place.
  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full border border-hairline bg-surface-lifted px-4 py-3 text-sm font-medium text-ink-primary transition hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument"
      >
        <MessageCircle size={18} strokeWidth={2} aria-hidden="true" />
        Assistant
      </button>

      {/* Scrim over the workspace. Blur is legitimate here: unpredictable content
          sits underneath (The Scrim Rule). Click to dismiss. */}
      <div
        aria-hidden="true"
        onClick={close}
        className={`fixed inset-0 z-40 bg-ground/60 backdrop-blur transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-title"
        tabIndex={-1}
        inert={open ? undefined : true}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-hairline bg-ground transition-transform duration-300 focus-visible:outline-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <AiSummary jobId={jobId} />
        <div className="min-h-0 flex-1">
          <RoofAssistant jobId={jobId} onClose={close} />
        </div>
      </div>
    </>
  );
}
