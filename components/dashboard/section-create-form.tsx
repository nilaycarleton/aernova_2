"use client";

import { useActionState } from "react";
import {
  createRoofSectionAction,
  type SectionFormState,
} from "@/app/(dashboard)/projects/[projectId]/section-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { FieldError, errorAttrs } from "@/components/dashboard/form-feedback";

const NUM =
  "rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-instrument";

export function SectionCreateForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState<SectionFormState, FormData>(createRoofSectionAction, {});
  const labelError = state.fieldErrors?.label;

  return (
    <form action={formAction} className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="md:col-span-2">
        <input
          name="label"
          placeholder="Garage rear slope"
          className={`w-full rounded-xl border bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted ${labelError ? "border-rose-400 focus:border-rose-300" : "border-hairline focus:border-instrument"}`}
          required
          {...errorAttrs("section-label", labelError)}
        />
        <FieldError fieldId="section-label" message={labelError} />
      </div>
      <input name="pitchRatio" placeholder="6/12" className={NUM} />
      <input name="surfaceAreaSqft" type="number" step="0.01" placeholder="Area sq ft" className={NUM} />
      <input name="ridgeLengthFt" type="number" step="0.01" placeholder="Ridge ft" className={NUM} />
      <input name="hipLengthFt" type="number" step="0.01" placeholder="Hip ft" className={NUM} />
      <input name="valleyLengthFt" type="number" step="0.01" placeholder="Valley ft" className={NUM} />
      <input name="eaveLengthFt" type="number" step="0.01" placeholder="Eave ft" className={NUM} />
      <input name="rakeLengthFt" type="number" step="0.01" placeholder="Rake ft" className={NUM} />
      <SubmitButton
        pendingText="Adding..."
        className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-signal-blue disabled:opacity-40"
      >
        Add Facet
      </SubmitButton>
    </form>
  );
}
