import { Measurement } from "@prisma/client";

export function MeasurementList({
  measurements,
}: {
  measurements: Measurement[];
}) {
  if (measurements.length === 0) {
    return <p className="mt-4 text-sm text-slate-400">No measurements yet.</p>;
  }

  return (
    <div className="mt-6 grid gap-3">
      {measurements.map((measurement) => (
        <div
          key={measurement.id}
          className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                {measurement.type}
              </p>
              <p className="mt-1 font-medium text-white">{measurement.label}</p>
            </div>

            <div className="text-right">
              <p className="text-lg font-semibold text-blue-300">
                {measurement.displayValue}
              </p>
              <p className="text-xs text-slate-500">{measurement.unit}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>Source: {measurement.source}</span>
            <span>
              Confidence:{" "}
              {measurement.confidence !== null && measurement.confidence !== undefined
                ? `${measurement.confidence}%`
                : "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}