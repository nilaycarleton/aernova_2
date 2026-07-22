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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
