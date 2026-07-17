import { RoofSection } from "@prisma/client";
import { createRoofSectionAction } from "@/app/(dashboard)/projects/[projectId]/section-actions";
import { DeletableSectionList } from "@/components/dashboard/deletable-section-list";
import { buildRoofSectionTotals } from "@/lib/roof-intelligence";

type Props = {
  projectId: string;
  sections: RoofSection[];
};

export function RoofSectionManager({ projectId, sections }: Props) {
  const totals = buildRoofSectionTotals(sections);

  return (
    <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">
            Roof sections
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-ink-primary">
            Structures and roof facets
          </h3>
        </div>
        <p className="text-sm text-ink-muted">
          Editable facets for main house, garage, sheds, additions, and detached structures
        </p>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Facet count", totals.facetCount.toString()],
          ["Surface area", `${totals.totalAreaSqft.toLocaleString()} sq ft`],
          ["Projected area", `${totals.projectedAreaSqft.toLocaleString()} sq ft`],
          ["Ridge + hip", `${(totals.ridgeLengthFt + totals.hipLengthFt).toLocaleString()} ft`],
          ["Valley + drip", `${(totals.valleyLengthFt + totals.eaveLengthFt + totals.rakeLengthFt).toLocaleString()} ft`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-hairline bg-ground/50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">{label}</p>
            <p className="mt-2 text-lg font-semibold text-ink-primary">{value}</p>
          </div>
        ))}
      </div>

      <form action={createRoofSectionAction} className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <input type="hidden" name="projectId" value={projectId} />
        <input
          name="label"
          placeholder="Garage rear slope"
          className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-instrument md:col-span-2"
          required
        />
        <input
          name="pitchRatio"
          placeholder="6/12"
          className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-instrument"
        />
        <input
          name="surfaceAreaSqft"
          type="number"
          step="0.01"
          placeholder="Area sq ft"
          className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-instrument"
        />
        <input
          name="ridgeLengthFt"
          type="number"
          step="0.01"
          placeholder="Ridge ft"
          className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-instrument"
        />
        <input
          name="hipLengthFt"
          type="number"
          step="0.01"
          placeholder="Hip ft"
          className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-instrument"
        />
        <input
          name="valleyLengthFt"
          type="number"
          step="0.01"
          placeholder="Valley ft"
          className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-instrument"
        />
        <input
          name="eaveLengthFt"
          type="number"
          step="0.01"
          placeholder="Eave ft"
          className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-instrument"
        />
        <input
          name="rakeLengthFt"
          type="number"
          step="0.01"
          placeholder="Rake ft"
          className="rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-instrument"
        />
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-ink-primary transition hover:bg-signal-blue"
        >
          Add Facet
        </button>
      </form>

      <div className="mt-6 space-y-4">
        <DeletableSectionList projectId={projectId} sections={sections} />
      </div>
    </section>
  );
}
