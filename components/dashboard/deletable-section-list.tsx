"use client";

import { useState } from "react";
import type { RoofSection } from "@prisma/client";
import {
  deleteRoofSectionAction,
  updateRoofSectionAction,
} from "@/app/(dashboard)/projects/[projectId]/section-actions";
import { useUndoToast } from "@/components/dashboard/undo-toast";

const FIELD =
  "rounded-xl border border-hairline bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none placeholder:text-ink-muted focus:border-blue-400";

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

  function requestDelete(section: RoofSection) {
    setHidden((current) => new Set(current).add(section.id));
    show({
      label: "Facet",
      onCommit: () => {
        const formData = new FormData();
        formData.set("projectId", projectId);
        formData.set("sectionId", section.id);
        void deleteRoofSectionAction(formData).catch((error) =>
          console.error("[section] delete failed", error)
        );
      },
      onUndo: () =>
        setHidden((current) => {
          const next = new Set(current);
          next.delete(section.id);
          return next;
        }),
    });
  }

  return (
    <>
      {visible.map((section) => (
        <div key={section.id} className="rounded-2xl border border-hairline bg-ground/45 p-4">
          <form action={updateRoofSectionAction} className="grid gap-3 md:grid-cols-4 xl:grid-cols-9">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="sectionId" value={section.id} />
            <input name="label" defaultValue={section.label} className={`${FIELD} md:col-span-2`} required />
            <input name="pitchRatio" defaultValue={section.pitchRatio ?? ""} placeholder="Pitch" className={FIELD} />
            <input name="projectedAreaSqft" type="number" step="0.01" defaultValue={section.projectedAreaSqft ?? ""} placeholder="Projected" className={FIELD} />
            <input name="surfaceAreaSqft" type="number" step="0.01" defaultValue={section.surfaceAreaSqft ?? ""} placeholder="Surface" className={FIELD} />
            <input name="ridgeLengthFt" type="number" step="0.01" defaultValue={section.ridgeLengthFt ?? ""} placeholder="Ridge" className={FIELD} />
            <input name="hipLengthFt" type="number" step="0.01" defaultValue={section.hipLengthFt ?? ""} placeholder="Hip" className={FIELD} />
            <input name="valleyLengthFt" type="number" step="0.01" defaultValue={section.valleyLengthFt ?? ""} placeholder="Valley" className={FIELD} />
            <input name="eaveLengthFt" type="number" step="0.01" defaultValue={section.eaveLengthFt ?? ""} placeholder="Eave" className={FIELD} />
            <input name="rakeLengthFt" type="number" step="0.01" defaultValue={section.rakeLengthFt ?? ""} placeholder="Rake" className={FIELD} />
            <div className="flex gap-2 md:col-span-4 xl:col-span-9">
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-signal-blue"
              >
                Save Facet
              </button>
            </div>
          </form>
          <div className="mt-3">
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
    </>
  );
}
