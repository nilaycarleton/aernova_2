"use client";

import { useState, useTransition } from "react";
import { useUndoToast } from "@/components/dashboard/undo-toast";

/**
 * Wraps one already-rendered item and gives it an undoable delete. Both surfaces
 * that needed this — before/after sheets and inspection photos — live in server
 * components, so the item's markup stays there and only the delete crosses the
 * boundary as a prop (the documented way to hand a server function to a client
 * component).
 *
 * Delay-the-delete, per undo-toast.tsx: the card hides immediately and the real
 * server call runs only when the grace window closes. Nothing is destroyed while
 * the toast is up, which is what makes it safe to remove the stored file too —
 * bytes can't be restored, so they must never leave before the window does.
 */
export function DeletableItem({
  jobId,
  itemId,
  idField,
  label,
  deleteAction,
  children,
}: {
  jobId: string;
  itemId: string;
  /** The form field the action reads the id from, e.g. "comparisonId". */
  idField: string;
  /** What was removed, in the trade's words: "Before & after sheet", "Photo". */
  label: string;
  deleteAction: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  const { show } = useUndoToast();
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (hidden) return null;

  function requestDelete() {
    setError(null);
    setHidden(true);
    show({
      label,
      onUndo: () => setHidden(false),
      onCommit: () => {
        const formData = new FormData();
        formData.set("jobId", jobId);
        formData.set(idField, itemId);
        startTransition(async () => {
          try {
            await deleteAction(formData);
          } catch (err) {
            // The delete failed after the window closed, so the item is real
            // again. Bring it back rather than leaving a card that looks gone
            // but still exists on the next load.
            setHidden(false);
            setError(err instanceof Error ? err.message : "Could not delete that.");
          }
        });
      },
    });
  }

  return (
    <div className="relative">
      {children}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={requestDelete}
          disabled={pending}
          className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger-fg transition hover:bg-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:opacity-50"
        >
          Delete
        </button>
        {error ? (
          <p role="alert" className="text-xs text-danger-fg">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
