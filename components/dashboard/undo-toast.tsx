"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * The one "Deleted — Undo" affordance for the whole app. A delete is *deferred*,
 * not undone: the caller hides the item immediately and hands us a commit that
 * runs only after the grace window elapses, so the row never leaves the database
 * until the window closes. Undo cancels the commit before it fires.
 *
 * This is the delay-the-delete model. It needs no schema change and no soft
 * delete, with one honest limit: if the tab is closed or reloaded during the
 * window, the commit never runs and the item reappears. That is safe (nothing
 * was destroyed), just occasionally surprising.
 *
 * Note: measure-viewer.tsx keeps its own richer undo/redo stack (40 deep, with
 * DB reconciliation) and deliberately does NOT use this — a single toast would
 * be a downgrade there.
 */

const DEFAULT_DURATION_MS = 6000;

type ToastInput = {
  /** What was deleted, in the trade's words: "Measurement", "Facet". */
  label: string;
  /** Runs when the grace window elapses. This is the real, irreversible delete. */
  onCommit: () => void;
  /** Runs if the user hits Undo. Restore the optimistic hide here. */
  onUndo?: () => void;
  durationMs?: number;
};

type ActiveToast = ToastInput & { id: string; durationMs: number };

type UndoToastApi = { show: (input: ToastInput) => void };

const UndoToastContext = createContext<UndoToastApi | null>(null);

export function useUndoToast(): UndoToastApi {
  const ctx = useContext(UndoToastContext);
  if (!ctx) throw new Error("useUndoToast must be used inside <UndoToastProvider>");
  return ctx;
}

export function UndoToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const clearTimer = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID();
      const durationMs = input.durationMs ?? DEFAULT_DURATION_MS;
      setToasts((current) => [...current, { ...input, id, durationMs }]);
      const timer = setTimeout(() => {
        timers.current.delete(id);
        remove(id);
        input.onCommit();
      }, durationMs);
      timers.current.set(id, timer);
    },
    [remove]
  );

  const handleUndo = useCallback(
    (toast: ActiveToast) => {
      clearTimer(toast.id);
      remove(toast.id);
      toast.onUndo?.();
    },
    [clearTimer, remove]
  );

  // Clear any outstanding timers if the provider unmounts. Pending commits do
  // not fire on unmount by design — see the module comment.
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) clearTimeout(timer);
      map.clear();
    };
  }, []);

  return (
    <UndoToastContext.Provider value={{ show }}>
      {children}
      {toasts.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              aria-live="polite"
              className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border border-hairline bg-surface-lifted backdrop-blur"
            >
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-ink-primary">{toast.label} deleted</span>
                <button
                  type="button"
                  onClick={() => handleUndo(toast)}
                  className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-instrument-fg transition hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument"
                >
                  Undo
                </button>
              </div>
              <div
                className="undo-countdown-bar h-0.5 origin-left bg-instrument"
                style={{ animation: `undo-countdown ${toast.durationMs}ms linear forwards` }}
              />
            </div>
          ))}
        </div>
      ) : null}
    </UndoToastContext.Provider>
  );
}
