"use client";

import { useState } from "react";
import type { Measurement } from "@prisma/client";
import { deleteMeasurementAction } from "@/app/(dashboard)/projects/[projectId]/measurement-actions";
import { useUndoToast } from "@/components/dashboard/undo-toast";
import { BulkActionBar } from "@/components/dashboard/bulk-action-bar";

/**
 * The "Delete measurements" list, made undoable. On delete the row is hidden
 * immediately and the real server delete is deferred behind a "Deleted — Undo"
 * toast (see undo-toast.tsx). The parent manager stays a server component; only
 * this list needs to be interactive.
 *
 * Rows can also be checked and cleared in bulk — the per-row Delete stays for
 * the one-off case, and the checkboxes are the accelerator (Nielsen #7).
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
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = measurements.filter((m) => !hidden.has(m.id));
  if (visible.length === 0) return null;

  const allSelected = visible.every((m) => selected.has(m.id));

  function deselect(id: string) {
    setSelected((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(visible.map((m) => m.id)));
  }

  // One toast for the whole batch: hide all now, commit every delete when the
  // grace window closes, restore all on Undo.
  function deferDelete(ids: string[], label: string) {
    if (ids.length === 0) return;
    setHidden((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      return next;
    });
    show({
      label,
      onCommit: () => {
        for (const id of ids) {
          const formData = new FormData();
          formData.set("measurementId", id);
          formData.set("projectId", projectId);
          void deleteMeasurementAction(formData).catch((error) =>
            console.error("[measurement] delete failed", error)
          );
        }
      },
      onUndo: () =>
        setHidden((current) => {
          const next = new Set(current);
          ids.forEach((id) => next.delete(id));
          return next;
        }),
    });
  }

  function requestDelete(measurement: Measurement) {
    deselect(measurement.id);
    deferDelete([measurement.id], "Measurement");
  }

  function requestBulkDelete() {
    const ids = [...selected].filter((id) => !hidden.has(id));
    setSelected(new Set());
    deferDelete(ids, ids.length === 1 ? "Measurement" : `${ids.length} measurements`);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink-primary">Delete measurements</h3>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 accent-instrument"
            aria-label="Select all measurements"
          />
          Select all
        </label>
      </div>

      <BulkActionBar
        count={selected.size}
        noun="measurement"
        onDelete={requestBulkDelete}
        onClear={() => setSelected(new Set())}
      />

      <div className="space-y-3">
        {visible.map((measurement) => (
          <div
            key={`delete-${measurement.id}`}
            className="flex flex-col gap-3 rounded-2xl border border-danger/25 bg-danger/10 p-4 md:flex-row md:items-center md:justify-between"
          >
            <label className="flex min-w-0 items-center gap-3">
              <input
                type="checkbox"
                checked={selected.has(measurement.id)}
                onChange={() => toggleOne(measurement.id)}
                className="h-4 w-4 shrink-0 accent-instrument"
                aria-label={`Select ${measurement.label}`}
              />
              <span className="min-w-0">
                <span className="block font-medium text-ink-primary">{measurement.label}</span>
                <span className="block text-sm text-ink-muted">
                  {measurement.displayValue} · {measurement.type}
                </span>
              </span>
            </label>

            <button
              type="button"
              onClick={() => requestDelete(measurement)}
              className="shrink-0 rounded-xl border border-danger/25 bg-danger/10 px-4 py-2 text-sm font-medium text-danger-fg transition hover:bg-danger/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
