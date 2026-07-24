"use client";

import { useActionState } from "react";
import {
  createRoofSectionAction,
  type SectionFormState,
} from "@/app/(dashboard)/projects/[projectId]/section-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { FieldError, FormError, errorAttrs } from "@/components/dashboard/form-feedback";

const NUM =
  "rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-instrument";

export function SectionCreateForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState<SectionFormState, FormData>(createRoofSectionAction, {});
  const labelError = state.fieldErrors?.label;

  return (
    <>
    <FormError message={state.formError} />
    <form action={formAction} className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="md:col-span-2">
        <input
          name="label"
          placeholder="Garage rear slope"
          className={`w-full rounded-xl border bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted ${labelError ? "border-danger focus:border-danger" : "border-hairline focus:border-instrument"}`}
          required
          {...errorAttrs("section-label", labelError)}
        />
        <FieldError fieldId="section-label" message={labelError} />
      </div>
      <input name="pitchRatio" aria-label="Pitch ratio" placeholder="6/12" className={NUM} />
      <input name="surfaceAreaSqft" type="number" step="0.01" aria-label="Surface area, square feet" placeholder="Area sq ft" className={NUM} />
      <input name="ridgeLengthFt" type="number" step="0.01" aria-label="Ridge length, feet" placeholder="Ridge ft" className={NUM} />
      <input name="hipLengthFt" type="number" step="0.01" aria-label="Hip length, feet" placeholder="Hip ft" className={NUM} />
      <input name="valleyLengthFt" type="number" step="0.01" aria-label="Valley length, feet" placeholder="Valley ft" className={NUM} />
      <input name="eaveLengthFt" type="number" step="0.01" aria-label="Eave length, feet" placeholder="Eave ft" className={NUM} />
      <input name="rakeLengthFt" type="number" step="0.01" aria-label="Rake length, feet" placeholder="Rake ft" className={NUM} />
      <SubmitButton
        pendingText="Adding…"
        className="rounded-xl border border-instrument-bright/30 bg-instrument/10 px-5 py-3 text-sm font-medium text-instrument-fg transition hover:bg-instrument/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument disabled:opacity-40"
      >
        Add Facet
      </SubmitButton>
    </form>
    </>
  );
}
