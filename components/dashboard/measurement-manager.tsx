import { Measurement } from "@prisma/client";
import { createMeasurementAction } from "@/app/(dashboard)/projects/[projectId]/measurement-actions";
import { DeletableMeasurementList } from "@/components/dashboard/deletable-measurement-list";
import { MeasurementCreateForm } from "@/components/dashboard/measurement-create-form";
import { MeasurementEditForm } from "@/components/dashboard/measurement-edit-form";

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

        <MeasurementCreateForm projectId={projectId} />

        <div className="mt-6">
          <p className="mb-3 text-sm text-ink-muted">
            Quick add — one click drops in a starter metric you can edit below
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {measurementTemplates.map((item) => (
              <form
                key={item.label}
                action={createMeasurementAction}
                className="rounded-2xl border border-hairline bg-ground/40 p-4 text-left transition hover:border-signal-blue/40 hover:bg-ground/60"
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
                  <p className="mt-2 text-xs font-medium text-info-fg">+ Add this metric</p>
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
              <MeasurementEditForm key={measurement.id} projectId={projectId} measurement={measurement} />
            ))}
          </div>
        )}
      </section>

      {measurements.length > 0 && (
        <DeletableMeasurementList projectId={projectId} measurements={measurements} />
      )}
    </div>
  );
}
