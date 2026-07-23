import { defaultPricingTemplate } from "@/lib/pricing-template";

// Grouped like a real price sheet, not 11 identical boxes — materials, labor,
// and the rates that ride on top of them read as three ledgers, so the eye can
// scan a column instead of hunting a grid.
const groups: { heading: string; rows: [string, string][] }[] = [
  {
    heading: "Materials",
    rows: [
      ["Shingle bundle", `$${defaultPricingTemplate.shingleBundleCost}`],
      ["Underlayment roll", `$${defaultPricingTemplate.underlaymentRollCost}`],
      ["Ridge cap bundle", `$${defaultPricingTemplate.ridgeCapBundleCost}`],
      ["Starter bundle", `$${defaultPricingTemplate.starterBundleCost}`],
      ["Drip edge", `$${defaultPricingTemplate.dripEdgeCostPerFt}/ft`],
    ],
  },
  {
    heading: "Labor",
    rows: [
      ["Simple", `$${defaultPricingTemplate.laborRateSimple}/sq ft`],
      ["Normal", `$${defaultPricingTemplate.laborRateNormal}/sq ft`],
      ["Complex", `$${defaultPricingTemplate.laborRateComplex}/sq ft`],
    ],
  },
  {
    heading: "Fees & rates",
    rows: [
      ["Disposal", `$${defaultPricingTemplate.disposalFee}`],
      ["Markup", `${defaultPricingTemplate.markupPercent}%`],
      ["Tax rate", `${defaultPricingTemplate.taxRatePercent}%`],
    ],
  },
];

export function PricingTemplatePanel() {
  return (
    <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
      <h3 className="text-2xl font-semibold text-ink-primary">
        Company pricing defaults
      </h3>
      <p className="mt-1 text-sm text-ink-muted">
        Used by proposal generation
      </p>
      <div className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <div key={group.heading}>
            <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">
              {group.heading}
            </p>
            <dl className="mt-2">
              {group.rows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 border-b border-hairline py-2.5 last:border-b-0"
                >
                  <dt className="text-sm text-ink-secondary">{label}</dt>
                  <dd className="text-sm font-semibold tabular-nums text-ink-primary">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
