"use client";

import { useActionState } from "react";
import {
  createMeasurementWithState,
  type MeasurementFormState,
} from "@/app/(dashboard)/projects/[projectId]/measurement-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { FieldError, errorAttrs } from "@/components/dashboard/form-feedback";

const SELECT =
  "w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-signal-blue";

function textCls(error?: string) {
  return `w-full rounded-xl border bg-ground/50 px-4 py-3 text-ink-primary placeholder:text-ink-muted outline-none ${error ? "border-rose-400 focus:border-rose-300" : "border-hairline focus:border-signal-blue"}`;
}

export function MeasurementCreateForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState<MeasurementFormState, FormData>(
    createMeasurementWithState,
    {}
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="mt-6 grid gap-4 md:grid-cols-2">
      <input type="hidden" name="projectId" value={projectId} />

      <div>
        <label htmlFor="new-measurement-label" className="mb-2 block text-sm text-ink-secondary">Label</label>
        <input
          id="new-measurement-label"
          name="label"
          type="text"
          placeholder="Total roof area"
          className={textCls(errors.label)}
          required
          {...errorAttrs("new-measurement-label", errors.label)}
        />
        <FieldError fieldId="new-measurement-label" message={errors.label} />
      </div>

      <div>
        <label htmlFor="new-measurement-displayValue" className="mb-2 block text-sm text-ink-secondary">Display Value</label>
        <input
          id="new-measurement-displayValue"
          name="displayValue"
          type="text"
          placeholder="3,240 sq ft"
          className={textCls(errors.displayValue)}
          required
          {...errorAttrs("new-measurement-displayValue", errors.displayValue)}
        />
        <FieldError fieldId="new-measurement-displayValue" message={errors.displayValue} />
      </div>

      <div>
        <label htmlFor="new-measurement-type" className="mb-2 block text-sm text-ink-secondary">Type</label>
        <select id="new-measurement-type" name="type" defaultValue="AREA" className={SELECT}>
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
        <label htmlFor="new-measurement-unit" className="mb-2 block text-sm text-ink-secondary">Unit</label>
        <select id="new-measurement-unit" name="unit" defaultValue="SQFT" className={SELECT}>
          <option value="SQFT">SQFT</option>
          <option value="FT">FT</option>
          <option value="RATIO">RATIO</option>
          <option value="PERCENT">PERCENT</option>
        </select>
      </div>

      <div>
        <label htmlFor="new-measurement-value" className="mb-2 block text-sm text-ink-secondary">Numeric Value</label>
        <input
          id="new-measurement-value"
          name="value"
          type="number"
          step="0.01"
          placeholder="3240"
          className={textCls()}
          required
        />
      </div>

      <div>
        <label htmlFor="new-measurement-source" className="mb-2 block text-sm text-ink-secondary">Source</label>
        <select id="new-measurement-source" name="source" defaultValue="MANUAL" className={SELECT}>
          <option value="MANUAL">MANUAL</option>
          <option value="DRONE">DRONE</option>
        </select>
      </div>

      <div>
        <label htmlFor="new-measurement-confidence" className="mb-2 block text-sm text-ink-secondary">Confidence %</label>
        <input
          id="new-measurement-confidence"
          name="confidence"
          type="number"
          step="0.01"
          placeholder="92"
          className={textCls()}
        />
      </div>

      <div>
        <label htmlFor="new-measurement-sortOrder" className="mb-2 block text-sm text-ink-secondary">Sort Order</label>
        <input id="new-measurement-sortOrder" name="sortOrder" type="number" defaultValue="0" className={SELECT} />
      </div>

      <div className="md:col-span-2 flex flex-wrap gap-3">
        <SubmitButton
          pendingText="Adding..."
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-signal-blue disabled:opacity-40"
        >
          Add Measurement
        </SubmitButton>
      </div>
    </form>
  );
}
