"use client";

import { useActionState } from "react";
import type { RoofSection } from "@prisma/client";
import {
  updateRoofSectionWithState,
  type SectionFormState,
} from "@/app/(dashboard)/projects/[projectId]/section-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { FieldError, FormError, errorAttrs } from "@/components/dashboard/form-feedback";

const FIELD =
  "w-full rounded-xl border border-hairline bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none placeholder:text-ink-muted focus:border-signal-blue";

/**
 * Inline edit for one roof facet. useActionState keeps a failed save (bad
 * number, DB, network) as returned state so the roofer's edits survive in the
 * still-mounted form, instead of throwing into the error boundary — the same
 * recovery contract as the create form.
 */
export function SectionEditForm({
  projectId,
  section,
}: {
  projectId: string;
  section: RoofSection;
}) {
  const [state, formAction] = useActionState<SectionFormState, FormData>(
    updateRoofSectionWithState,
    {}
  );
  const labelError = state.fieldErrors?.label;
  const labelId = `section-${section.id}-label`;

  return (
    <>
      <FormError message={state.formError} />
      <form action={formAction} className="grid gap-3 md:grid-cols-4 xl:grid-cols-9">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="sectionId" value={section.id} />
        <div className="md:col-span-2">
          <input
            name="label"
            defaultValue={section.label}
            aria-label="Facet name"
            className={
              labelError
                ? "w-full rounded-xl border border-danger bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-danger"
                : FIELD
            }
            required
            {...errorAttrs(labelId, labelError)}
          />
          <FieldError fieldId={labelId} message={labelError} />
        </div>
        <input name="pitchRatio" aria-label="Pitch ratio" defaultValue={section.pitchRatio ?? ""} placeholder="Pitch" className={FIELD} />
        <input name="projectedAreaSqft" type="number" step="0.01" aria-label="Projected area, square feet" defaultValue={section.projectedAreaSqft ?? ""} placeholder="Projected" className={FIELD} />
        <input name="surfaceAreaSqft" type="number" step="0.01" aria-label="Surface area, square feet" defaultValue={section.surfaceAreaSqft ?? ""} placeholder="Surface" className={FIELD} />
        <input name="ridgeLengthFt" type="number" step="0.01" aria-label="Ridge length, feet" defaultValue={section.ridgeLengthFt ?? ""} placeholder="Ridge" className={FIELD} />
        <input name="hipLengthFt" type="number" step="0.01" aria-label="Hip length, feet" defaultValue={section.hipLengthFt ?? ""} placeholder="Hip" className={FIELD} />
        <input name="valleyLengthFt" type="number" step="0.01" aria-label="Valley length, feet" defaultValue={section.valleyLengthFt ?? ""} placeholder="Valley" className={FIELD} />
        <input name="eaveLengthFt" type="number" step="0.01" aria-label="Eave length, feet" defaultValue={section.eaveLengthFt ?? ""} placeholder="Eave" className={FIELD} />
        <input name="rakeLengthFt" type="number" step="0.01" aria-label="Rake length, feet" defaultValue={section.rakeLengthFt ?? ""} placeholder="Rake" className={FIELD} />
        <div className="flex gap-2 md:col-span-4 xl:col-span-9">
          <SubmitButton
            pendingText="Saving…"
            className="rounded-xl border border-instrument-bright/30 bg-instrument/10 px-4 py-2 text-sm font-medium text-instrument-fg transition hover:bg-instrument/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument disabled:opacity-40"
          >
            Save Facet
          </SubmitButton>
        </div>
      </form>
    </>
  );
}
