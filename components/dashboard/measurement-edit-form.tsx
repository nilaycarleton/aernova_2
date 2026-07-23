"use client";

import { useActionState } from "react";
import type { Measurement } from "@prisma/client";
import {
  updateMeasurementWithState,
  type MeasurementFormState,
} from "@/app/(dashboard)/projects/[projectId]/measurement-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { FieldError, FormError, errorAttrs } from "@/components/dashboard/form-feedback";

const SELECT =
  "w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-signal-blue";

function textCls(error?: string) {
  return `w-full rounded-xl border bg-ground/50 px-4 py-3 text-ink-primary outline-none ${
    error ? "border-rose-400 focus:border-rose-300" : "border-hairline focus:border-signal-blue"
  }`;
}

/**
 * Inline edit for one saved measurement. useActionState keeps a failed save as
 * returned state so the roofer's edits survive in the still-mounted form instead
 * of throwing into the error boundary — the same recovery contract as the create
 * form.
 */
export function MeasurementEditForm({
  projectId,
  measurement,
}: {
  projectId: string;
  measurement: Measurement;
}) {
  const [state, formAction] = useActionState<MeasurementFormState, FormData>(
    updateMeasurementWithState,
    {}
  );
  const errors = state.fieldErrors ?? {};
  const base = `measurement-${measurement.id}`;

  return (
    <>
      <FormError message={state.formError} />
      <form action={formAction} className="rounded-3xl border border-hairline bg-surface-raised p-5">
        <input type="hidden" name="measurementId" value={measurement.id} />
        <input type="hidden" name="projectId" value={projectId} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor={`${base}-label`} className="mb-2 block text-sm text-ink-secondary">Label</label>
            <input
              id={`${base}-label`}
              name="label"
              defaultValue={measurement.label}
              className={textCls(errors.label)}
              required
              {...errorAttrs(`${base}-label`, errors.label)}
            />
            <FieldError fieldId={`${base}-label`} message={errors.label} />
          </div>

          <div>
            <label htmlFor={`${base}-displayValue`} className="mb-2 block text-sm text-ink-secondary">Display Value</label>
            <input
              id={`${base}-displayValue`}
              name="displayValue"
              defaultValue={measurement.displayValue}
              className={textCls(errors.displayValue)}
              required
              {...errorAttrs(`${base}-displayValue`, errors.displayValue)}
            />
            <FieldError fieldId={`${base}-displayValue`} message={errors.displayValue} />
          </div>

          <div>
            <label htmlFor={`${base}-type`} className="mb-2 block text-sm text-ink-secondary">Type</label>
            <select id={`${base}-type`} name="type" defaultValue={measurement.type} className={SELECT}>
              <option value="AREA">AREA</option>
              <option value="RIDGE">RIDGE</option>
              <option value="PITCH">PITCH</option>
              <option value="WASTE_FACTOR">WASTE_FACTOR</option>
              <option value="EAVE">EAVE</option>
              <option value="VALLEY">VALLEY</option>
              <option value="HIP">HIP</option>
            </select>
          </div>

          <div>
            <label htmlFor={`${base}-unit`} className="mb-2 block text-sm text-ink-secondary">Unit</label>
            <select id={`${base}-unit`} name="unit" defaultValue={measurement.unit} className={SELECT}>
              <option value="SQFT">SQFT</option>
              <option value="FT">FT</option>
              <option value="RATIO">RATIO</option>
              <option value="PERCENT">PERCENT</option>
            </select>
          </div>

          <div>
            <label htmlFor={`${base}-value`} className="mb-2 block text-sm text-ink-secondary">Numeric Value</label>
            <input id={`${base}-value`} name="value" type="number" step="0.01" defaultValue={measurement.value} className={textCls()} required />
          </div>

          <div>
            <label htmlFor={`${base}-source`} className="mb-2 block text-sm text-ink-secondary">Source</label>
            <select id={`${base}-source`} name="source" defaultValue={measurement.source} className={SELECT}>
              <option value="MANUAL">MANUAL</option>
              <option value="DRONE">DRONE</option>
            </select>
          </div>

          <div>
            <label htmlFor={`${base}-confidence`} className="mb-2 block text-sm text-ink-secondary">Confidence %</label>
            <input id={`${base}-confidence`} name="confidence" type="number" step="0.01" defaultValue={measurement.confidence ?? ""} className={textCls()} />
          </div>

          <div>
            <label htmlFor={`${base}-sortOrder`} className="mb-2 block text-sm text-ink-secondary">Sort Order</label>
            <input id={`${base}-sortOrder`} name="sortOrder" type="number" defaultValue={measurement.sortOrder} className={textCls()} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <SubmitButton
            pendingText="Saving…"
            className="rounded-xl border border-instrument-bright/30 bg-instrument/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-instrument/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument disabled:opacity-40"
          >
            Save Changes
          </SubmitButton>
        </div>
      </form>
    </>
  );
}
