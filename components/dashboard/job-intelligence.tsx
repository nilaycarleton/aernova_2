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

function Row({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-2.5">
      <dt className="text-sm text-ink-secondary">{label}</dt>
      <dd
        className={`text-sm font-semibold tabular-nums text-ink-primary${
          capitalize ? " capitalize" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

export function JobIntelligence({ measurements, sections }: Props) {
  const pitchRows = buildPitchBreakdown(sections);
  const waste = buildWasteRecommendation(measurements, sections);
  const totals = buildRoofSectionTotals(sections);

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-lg border border-hairline bg-surface-raised p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">
              Roof summary
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-ink-primary">
              Areas by pitch
            </h3>
          </div>
          <div className="text-sm text-ink-muted">
            {pitchRows.length} pitch group{pitchRows.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {pitchRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-hairline p-6 text-sm text-ink-muted">
              Add roof structures or facets to generate a pitch breakdown.
            </div>
          ) : (
            pitchRows.map((row) => (
              <div key={row.pitch}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-primary">{row.pitch}</span>
                  <span className="text-ink-muted">
                    {row.area.toLocaleString()} sq ft · {row.percent}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-ground/70">
                  <div
                    className="h-full rounded-full bg-instrument"
                    style={{ width: pctLabel(row.percent) }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-lg border border-hairline bg-surface-raised p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">
          Material estimate
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-ink-primary">
          {waste.complexity[0].toUpperCase() + waste.complexity.slice(1)} roof complexity
        </h3>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-ink-muted">Complexity score</span>
            <span className="font-medium text-ink-primary">{waste.complexityScore}/100</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-ground/70">
            <div
              className="h-full rounded-full bg-instrument"
              style={{ width: `${Math.max(waste.complexityScore, 4)}%` }}
            />
          </div>
        </div>

        {/* Six read-only figures, so six rows rather than six boxes. Squares are
            grouped apart from how the estimate was arrived at, because the first
            three are what a roofer orders against and the last three are why. */}
        <dl className="mt-6 grid gap-x-10 sm:grid-cols-2">
          <Row label="Measured squares" value={waste.measuredSquares.toFixed(2)} />
          <Row label="Suggested squares" value={waste.suggestedSquares.toFixed(2)} />
          <Row label="Waste" value={`${waste.measuredWaste ?? waste.recommendedWaste}%`} />
          <Row label="Measured from" value={waste.areaSource} capitalize />
          <Row label="Total edge length" value={`${waste.totalLineLengthFt.toLocaleString()} ft`} />
          <Row label="Labor factor" value={`${waste.laborMultiplier.toFixed(2)}x`} />
        </dl>

        <p className="mt-5 border-t border-hairline pt-4 text-sm leading-6 text-ink-secondary">
          Suggested waste is based on {waste.reasons.join(", ")}. Facet totals include{" "}
          {totals.facetCount} sections, {totals.valleyLengthFt.toLocaleString()} ft valleys, and{" "}
          {totals.hipLengthFt.toLocaleString()} ft hips.
        </p>
      </div>
    </section>
  );
}
