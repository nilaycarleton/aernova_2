import { Measurement, RoofSection } from "@prisma/client";
import {
  buildPitchBreakdown,
  buildRoofSectionTotals,
  buildWasteRecommendation,
} from "@/lib/roof-intelligence";

type Props = {
  measurements: Measurement[];
  sections: RoofSection[];
};

function pctLabel(percent: number) {
  return `${Math.max(percent, 4)}%`;
}

export function ProjectIntelligence({ measurements, sections }: Props) {
  const pitchRows = buildPitchBreakdown(sections);
  const waste = buildWasteRecommendation(measurements, sections);
  const totals = buildRoofSectionTotals(sections);

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
              Roof summary
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              Areas by pitch
            </h3>
          </div>
          <div className="text-sm text-slate-400">
            {pitchRows.length} pitch group{pitchRows.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {pitchRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
              Add roof structures or facets to generate a pitch breakdown.
            </div>
          ) : (
            pitchRows.map((row) => (
              <div key={row.pitch}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-white">{row.pitch}</span>
                  <span className="text-slate-400">
                    {row.area.toLocaleString()} sq ft · {row.percent}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-950/70">
                  <div
                    className="h-full rounded-full bg-cyan-400"
                    style={{ width: pctLabel(row.percent) }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
          Material estimate
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-white">
          {waste.complexity[0].toUpperCase() + waste.complexity.slice(1)} roof complexity
        </h3>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-400">Complexity score</span>
            <span className="font-medium text-white">{waste.complexityScore}/100</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-950/70">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${Math.max(waste.complexityScore, 4)}%` }}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">
              Measured
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {waste.measuredSquares.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">
              Suggested
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {waste.suggestedSquares.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">
              Waste
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {waste.measuredWaste ?? waste.recommendedWaste}%
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">
              Area Source
            </p>
            <p className="mt-2 text-lg font-semibold capitalize text-white">
              {waste.areaSource}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">
              Line Density
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {waste.totalLineLengthFt.toLocaleString()} ft
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">
              Labor Factor
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {waste.laborMultiplier.toFixed(2)}x
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm leading-6 text-slate-300">
          Suggested waste is based on {waste.reasons.join(", ")}. Facet totals include{" "}
          {totals.facetCount} sections, {totals.valleyLengthFt.toLocaleString()} ft valleys, and{" "}
          {totals.hipLengthFt.toLocaleString()} ft hips.
        </div>
      </div>
    </section>
  );
}
