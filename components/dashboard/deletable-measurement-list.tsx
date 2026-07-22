"use client";

import { useState } from "react";
import type { Measurement } from "@prisma/client";
import { deleteMeasurementAction } from "@/app/(dashboard)/projects/[projectId]/measurement-actions";
import { useUndoToast } from "@/components/dashboard/undo-toast";

/**
 * The "Delete measurements" list, made undoable. On delete the row is hidden
 * immediately and the real server delete is deferred behind a "Deleted — Undo"
 * toast (see undo-toast.tsx). The parent manager stays a server component; only
 * this list needs to be interactive.
 */
export function DeletableMeasurementList({
  projectId,
  measurements,
}: {
  projectId: string;
  measurements: Measurement[];
}) {
  const { show } = useUndoToast();
  // Ids hidden optimistically while their delete is pending or committed.
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visible = measurements.filter((m) => !hidden.has(m.id));
  if (visible.length === 0) return null;

  function requestDelete(measurement: Measurement) {
    setHidden((current) => new Set(current).add(measurement.id));
    show({
      label: "Measurement",
      onCommit: () => {
        const formData = new FormData();
        formData.set("measurementId", measurement.id);
        formData.set("projectId", projectId);
        // Already hidden; revalidation confirms. A failure here leaves the row
        // hidden until the next load, when it reappears — safe, nothing lost.
        void deleteMeasurementAction(formData).catch((error) =>
          console.error("[measurement] delete failed", error)
        );
      },
      onUndo: () =>
        setHidden((current) => {
          const next = new Set(current);
          next.delete(measurement.id);
          return next;
        }),
    });
  }

  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold text-ink-primary">Delete measurements</h3>
      <div className="space-y-3">
        {visible.map((measurement) => (
          <div
            key={`delete-${measurement.id}`}
            className="flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="font-medium text-ink-primary">{measurement.label}</p>
              <p className="text-sm text-ink-muted">
                {measurement.displayValue} · {measurement.type}
              </p>
            </div>

            <button
              type="button"
              onClick={() => requestDelete(measurement)}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
