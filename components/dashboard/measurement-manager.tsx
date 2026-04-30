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
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-xl font-semibold text-white">Add measurement</h3>
        <p className="mt-2 text-sm text-slate-400">
          Add roof metrics like area, ridge, pitch, waste factor, eaves, valleys, and hips.
        </p>

        <form action={createMeasurementAction} className="mt-6 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="projectId" value={projectId} />

          <div>
            <label className="mb-2 block text-sm text-slate-300">Label</label>
            <input
              name="label"
              type="text"
              placeholder="Total roof area"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Display Value</label>
            <input
              name="displayValue"
              type="text"
              placeholder="3,240 sq ft"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Type</label>
            <select
              name="type"
              defaultValue="AREA"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-500"
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
            <label className="mb-2 block text-sm text-slate-300">Unit</label>
            <select
              name="unit"
              defaultValue="SQFT"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-500"
            >
              <option value="SQFT">SQFT</option>
              <option value="FT">FT</option>
              <option value="RATIO">RATIO</option>
              <option value="PERCENT">PERCENT</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Numeric Value</label>
            <input
              name="value"
              type="number"
              step="0.01"
              placeholder="3240"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Source</label>
            <select
              name="source"
              defaultValue="MANUAL"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-500"
            >
              <option value="MANUAL">MANUAL</option>
              <option value="SATELLITE">SATELLITE</option>
              <option value="DRONE">DRONE</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Confidence %</label>
            <input
              name="confidence"
              type="number"
              step="0.01"
              placeholder="92"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Sort Order</label>
            <input
              name="sortOrder"
              type="number"
              defaultValue="0"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Add Measurement
            </button>
          </div>
        </form>

        <div className="mt-6">
          <p className="mb-3 text-sm text-slate-400">Quick examples</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {measurementTemplates.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
              >
                <p className="font-medium text-white">{item.label}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {item.displayValue} · {item.type} · {item.unit}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-white">Existing measurements</h3>
          <p className="mt-2 text-sm text-slate-400">
            Update or remove roof metrics for this project.
          </p>
        </div>

        {measurements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-slate-400">
            No measurements yet. Add your first one above.
          </div>
        ) : (
          <div className="space-y-4">
            {measurements.map((measurement) => (
              <form
                key={measurement.id}
                action={updateMeasurementAction}
                className="rounded-3xl border border-white/10 bg-white/5 p-5"
              >
                <input type="hidden" name="measurementId" value={measurement.id} />
                <input type="hidden" name="projectId" value={projectId} />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Label</label>
                    <input
                      name="label"
                      defaultValue={measurement.label}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Display Value</label>
                    <input
                      name="displayValue"
                      defaultValue={measurement.displayValue}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Type</label>
                    <select
                      name="type"
                      defaultValue={measurement.type}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-500"
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
                    <label className="mb-2 block text-sm text-slate-300">Unit</label>
                    <select
                      name="unit"
                      defaultValue={measurement.unit}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-500"
                    >
                      <option value="SQFT">SQFT</option>
                      <option value="FT">FT</option>
                      <option value="RATIO">RATIO</option>
                      <option value="PERCENT">PERCENT</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Numeric Value</label>
                    <input
                      name="value"
                      type="number"
                      step="0.01"
                      defaultValue={measurement.value}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Source</label>
                    <select
                      name="source"
                      defaultValue={measurement.source}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-500"
                    >
                      <option value="MANUAL">MANUAL</option>
                      <option value="SATELLITE">SATELLITE</option>
                      <option value="DRONE">DRONE</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Confidence %</label>
                    <input
                      name="confidence"
                      type="number"
                      step="0.01"
                      defaultValue={measurement.confidence ?? ""}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Sort Order</label>
                    <input
                      name="sortOrder"
                      type="number"
                      defaultValue={measurement.sortOrder}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
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
          <h3 className="text-lg font-semibold text-white">Delete measurements</h3>
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
                  <p className="font-medium text-white">{measurement.label}</p>
                  <p className="text-sm text-slate-400">
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