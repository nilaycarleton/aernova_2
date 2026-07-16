import { Measurement } from "@prisma/client";
import {
  createMeasurementAction,
  updateMeasurementAction,
  deleteMeasurementAction,
} from "@/app/(dashboard)/projects/[projectId]/measurement-actions";

type Props = {
  projectId: string;
  measurements: Measurement[];
};

const measurementTemplates = [
  { label: "Total roof area", type: "AREA", unit: "SQFT", displayValue: "3,240 sq ft", value: "3240" },
  { label: "Total ridge length", type: "RIDGE", unit: "FT", displayValue: "64 ft", value: "64" },
  { label: "Average roof pitch", type: "PITCH", unit: "RATIO", displayValue: "8/12", value: "8" },
  { label: "Recommended waste factor", type: "WASTE_FACTOR", unit: "PERCENT", displayValue: "12%", value: "12" },
  { label: "Total eave length", type: "EAVE", unit: "FT", displayValue: "110 ft", value: "110" },
  { label: "Total valley length", type: "VALLEY", unit: "FT", displayValue: "28 ft", value: "28" },
  { label: "Total hip length", type: "HIP", unit: "FT", displayValue: "34 ft", value: "34" },
];

export function MeasurementManager({ projectId, measurements }: Props) {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
        <h3 className="text-xl font-semibold text-ink-primary">Add measurement</h3>
        <p className="mt-2 text-sm text-ink-muted">
          Add roof metrics like area, ridge, pitch, waste factor, eaves, valleys, and hips.
        </p>

        <form action={createMeasurementAction} className="mt-6 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="projectId" value={projectId} />

          <div>
            <label htmlFor="new-measurement-label" className="mb-2 block text-sm text-ink-secondary">Label</label>
            <input
              id="new-measurement-label"
              name="label"
              type="text"
              placeholder="Total roof area"
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary placeholder:text-ink-muted outline-none focus:border-signal-blue"
              required
            />
          </div>

          <div>
            <label htmlFor="new-measurement-displayValue" className="mb-2 block text-sm text-ink-secondary">Display Value</label>
            <input
              id="new-measurement-displayValue"
              name="displayValue"
              type="text"
              placeholder="3,240 sq ft"
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary placeholder:text-ink-muted outline-none focus:border-signal-blue"
              required
            />
          </div>

          <div>
            <label htmlFor="new-measurement-type" className="mb-2 block text-sm text-ink-secondary">Type</label>
            <select
              id="new-measurement-type"
              name="type"
              defaultValue="AREA"
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-signal-blue"
            >
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
            <select
              id="new-measurement-unit"
              name="unit"
              defaultValue="SQFT"
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-signal-blue"
            >
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
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary placeholder:text-ink-muted outline-none focus:border-signal-blue"
              required
            />
          </div>

          <div>
            <label htmlFor="new-measurement-source" className="mb-2 block text-sm text-ink-secondary">Source</label>
            <select
              id="new-measurement-source"
              name="source"
              defaultValue="MANUAL"
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-signal-blue"
            >
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
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary placeholder:text-ink-muted outline-none focus:border-signal-blue"
            />
          </div>

          <div>
            <label htmlFor="new-measurement-sortOrder" className="mb-2 block text-sm text-ink-secondary">Sort Order</label>
            <input
              id="new-measurement-sortOrder"
              name="sortOrder"
              type="number"
              defaultValue="0"
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-signal-blue"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-signal-blue"
            >
              Add Measurement
            </button>
          </div>
        </form>

        <div className="mt-6">
          <p className="mb-3 text-sm text-ink-muted">
            Quick add — one click drops in a starter metric you can edit below
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {measurementTemplates.map((item) => (
              <form
                key={item.label}
                action={createMeasurementAction}
                className="rounded-2xl border border-hairline bg-ground/40 p-4 text-left transition hover:border-blue-400/40 hover:bg-ground/60"
              >
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="label" value={item.label} />
                <input type="hidden" name="displayValue" value={item.displayValue} />
                <input type="hidden" name="type" value={item.type} />
                <input type="hidden" name="unit" value={item.unit} />
                <input type="hidden" name="value" value={item.value} />
                <input type="hidden" name="source" value="MANUAL" />
                <button type="submit" className="w-full text-left">
                  <p className="font-medium text-ink-primary">{item.label}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {item.displayValue} · {item.type} · {item.unit}
                  </p>
                  <p className="mt-2 text-xs font-medium text-blue-300">+ Add this metric</p>
                </button>
              </form>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-ink-primary">Existing measurements</h3>
          <p className="mt-2 text-sm text-ink-muted">
            Update or remove roof metrics for this project.
          </p>
        </div>

        {measurements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-hairline p-8 text-ink-muted">
            No measurements yet. Add your first one above.
          </div>
        ) : (
          <div className="space-y-4">
            {measurements.map((measurement) => (
              <form
                key={measurement.id}
                action={updateMeasurementAction}
                className="rounded-3xl border border-hairline bg-surface-raised p-5"
              >
                <input type="hidden" name="measurementId" value={measurement.id} />
                <input type="hidden" name="projectId" value={projectId} />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label htmlFor={`measurement-${measurement.id}-label`} className="mb-2 block text-sm text-ink-secondary">Label</label>
                    <input
                      id={`measurement-${measurement.id}-label`}
                      name="label"
                      defaultValue={measurement.label}
                      className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-signal-blue"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor={`measurement-${measurement.id}-displayValue`} className="mb-2 block text-sm text-ink-secondary">Display Value</label>
                    <input
                      id={`measurement-${measurement.id}-displayValue`}
                      name="displayValue"
                      defaultValue={measurement.displayValue}
                      className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-signal-blue"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor={`measurement-${measurement.id}-type`} className="mb-2 block text-sm text-ink-secondary">Type</label>
                    <select
                      id={`measurement-${measurement.id}-type`}
                      name="type"
                      defaultValue={measurement.type}
                      className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-signal-blue"
                    >
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
                    <label htmlFor={`measurement-${measurement.id}-unit`} className="mb-2 block text-sm text-ink-secondary">Unit</label>
                    <select
                      id={`measurement-${measurement.id}-unit`}
                      name="unit"
                      defaultValue={measurement.unit}
                      className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-signal-blue"
                    >
                      <option value="SQFT">SQFT</option>
                      <option value="FT">FT</option>
                      <option value="RATIO">RATIO</option>
                      <option value="PERCENT">PERCENT</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`measurement-${measurement.id}-value`} className="mb-2 block text-sm text-ink-secondary">Numeric Value</label>
                    <input
                      id={`measurement-${measurement.id}-value`}
                      name="value"
                      type="number"
                      step="0.01"
                      defaultValue={measurement.value}
                      className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-signal-blue"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor={`measurement-${measurement.id}-source`} className="mb-2 block text-sm text-ink-secondary">Source</label>
                    <select
                      id={`measurement-${measurement.id}-source`}
                      name="source"
                      defaultValue={measurement.source}
                      className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-signal-blue"
                    >
                      <option value="MANUAL">MANUAL</option>
                      <option value="DRONE">DRONE</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`measurement-${measurement.id}-confidence`} className="mb-2 block text-sm text-ink-secondary">Confidence %</label>
                    <input
                      id={`measurement-${measurement.id}-confidence`}
                      name="confidence"
                      type="number"
                      step="0.01"
                      defaultValue={measurement.confidence ?? ""}
                      className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-signal-blue"
                    />
                  </div>

                  <div>
                    <label htmlFor={`measurement-${measurement.id}-sortOrder`} className="mb-2 block text-sm text-ink-secondary">Sort Order</label>
                    <input
                      id={`measurement-${measurement.id}-sortOrder`}
                      name="sortOrder"
                      type="number"
                      defaultValue={measurement.sortOrder}
                      className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-signal-blue"
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-signal-blue"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>

      {measurements.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-ink-primary">Delete measurements</h3>
          <div className="space-y-3">
            {measurements.map((measurement) => (
              <form
                key={`delete-${measurement.id}`}
                action={deleteMeasurementAction}
                className="flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 md:flex-row md:items-center md:justify-between"
              >
                <input type="hidden" name="measurementId" value={measurement.id} />
                <input type="hidden" name="projectId" value={projectId} />

                <div>
                  <p className="font-medium text-ink-primary">{measurement.label}</p>
                  <p className="text-sm text-ink-muted">
                    {measurement.displayValue} · {measurement.type}
                  </p>
                </div>

                <button
                  type="submit"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
                >
                  Delete
                </button>
              </form>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
