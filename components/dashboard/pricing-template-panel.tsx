import { defaultPricingTemplate } from "@/lib/pricing-template";

const rows = [
  ["Shingle bundle", `$${defaultPricingTemplate.shingleBundleCost}`],
  ["Underlayment roll", `$${defaultPricingTemplate.underlaymentRollCost}`],
  ["Ridge cap bundle", `$${defaultPricingTemplate.ridgeCapBundleCost}`],
  ["Starter bundle", `$${defaultPricingTemplate.starterBundleCost}`],
  ["Drip edge", `$${defaultPricingTemplate.dripEdgeCostPerFt}/ft`],
  ["Labor simple", `$${defaultPricingTemplate.laborRateSimple}/sq ft`],
  ["Labor normal", `$${defaultPricingTemplate.laborRateNormal}/sq ft`],
  ["Labor complex", `$${defaultPricingTemplate.laborRateComplex}/sq ft`],
  ["Disposal", `$${defaultPricingTemplate.disposalFee}`],
  ["Markup", `${defaultPricingTemplate.markupPercent}%`],
  ["Tax rate", `${defaultPricingTemplate.taxRatePercent}%`],
];

export function PricingTemplatePanel() {
  return (
    <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
      <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">
        Pricing Template
      </p>
      <h3 className="mt-2 text-2xl font-semibold text-ink-primary">
        Company defaults used by proposal generation
      </h3>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-hairline bg-ground/50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">
              {label}
            </p>
            <p className="mt-2 text-lg font-semibold text-ink-primary">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
