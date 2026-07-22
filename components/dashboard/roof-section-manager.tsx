import { RoofSection } from "@prisma/client";
import { DeletableSectionList } from "@/components/dashboard/deletable-section-list";
import { SectionCreateForm } from "@/components/dashboard/section-create-form";
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

      <SectionCreateForm projectId={projectId} />

      <div className="mt-6 space-y-4">
        <DeletableSectionList projectId={projectId} sections={sections} />
      </div>
    </section>
  );
}
