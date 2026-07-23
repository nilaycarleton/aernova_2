"use client";

import { useState } from "react";
import type { RoofSection } from "@prisma/client";
import { deleteRoofSectionAction } from "@/app/(dashboard)/projects/[projectId]/section-actions";
import { useUndoToast } from "@/components/dashboard/undo-toast";
import { BulkActionBar } from "@/components/dashboard/bulk-action-bar";
import { SectionEditForm } from "@/components/dashboard/section-edit-form";

/**
 * The roof-facet list, made undoable. Delete hides the whole card immediately
 * and defers the real server delete behind the shared "Deleted — Undo" toast
 * (see undo-toast.tsx). The edit form keeps its plain server action; only the
 * delete needs client deferral.
 */
export function DeletableSectionList({
  projectId,
  sections,
}: {
  projectId: string;
  sections: RoofSection[];
}) {
  const { show } = useUndoToast();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = sections.filter((s) => !hidden.has(s.id));

  if (sections.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-hairline p-6 text-sm text-ink-muted">
        Add each roof plane or detached structure so pitch, area, and line lengths can drive Phase 4
        calculations.
      </div>
    );
  }

  if (visible.length === 0) return null;

  const allSelected = visible.every((s) => selected.has(s.id));

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(visible.map((s) => s.id)));
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
          formData.set("projectId", projectId);
          formData.set("sectionId", id);
          void deleteRoofSectionAction(formData).catch((error) =>
            console.error("[section] delete failed", error)
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

  function requestDelete(section: RoofSection) {
    setSelected((current) => {
      if (!current.has(section.id)) return current;
      const next = new Set(current);
      next.delete(section.id);
      return next;
    });
    deferDelete([section.id], "Facet");
  }

  function requestBulkDelete() {
    const ids = [...selected].filter((id) => !hidden.has(id));
    setSelected(new Set());
    deferDelete(ids, ids.length === 1 ? "Facet" : `${ids.length} facets`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 accent-instrument"
            aria-label="Select all facets"
          />
          Select all
        </label>
      </div>

      <BulkActionBar
        count={selected.size}
        noun="facet"
        onDelete={requestBulkDelete}
        onClear={() => setSelected(new Set())}
      />

      {visible.map((section) => (
        <div key={section.id} className="rounded-2xl border border-hairline bg-ground/45 p-4">
          <SectionEditForm projectId={projectId} section={section} />
          <div className="mt-3 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={selected.has(section.id)}
                onChange={() => toggleOne(section.id)}
                className="h-4 w-4 accent-instrument"
                aria-label={`Select ${section.label}`}
              />
              Select
            </label>
            <button
              type="button"
              onClick={() => requestDelete(section)}
              className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
            >
              Delete Facet
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
