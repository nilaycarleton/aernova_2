/**
 * Turning the roof report into rows a homeowner reads.
 *
 * `generateRoofingReport()` produces lines priced at **cost** — bundles of
 * shingles at what the supplier charges — and then applies one markup at the
 * bottom. That was the right shape while a quote was a single number. It is the
 * wrong shape now: the builder shows cost and price per line, and a markup that
 * exists only in a footer cannot be adjusted for the one line where this roofer
 * knows he is being optimistic.
 *
 * So the template's markup is pushed *down* into every row. `unitCostCents` is
 * what the report said; `unitPriceCents` is that plus markup. The quote's
 * subtotal comes out the same, and the roofer can now see — and change — the
 * margin on the shingles separately from the margin on the labour.
 *
 * Pure, and it takes the markup as an argument rather than reading the pricing
 * template itself, so the arithmetic can be tested without a company.
 */
import { toCents, type Cents } from "../money.ts";
import { priceFromMarkup } from "./totals.ts";

/** The subset of `GeneratedReport["lineItems"]` this needs. */
export type ReportLine = {
  description: string;
  quantity: number;
  unit: string;
  /** Per-unit **cost** in dollars, as the report generator emits it. */
  unitCost: number;
};

export type GeneratedLine = {
  name: string;
  quantity: number;
  unit: string;
  unitCostCents: Cents;
  unitPriceCents: Cents;
  amountCents: Cents;
  sortOrder: number;
  /**
   * Marks the row as the pipeline's, following the convention `RoofSection`
   * already uses. Regenerating replaces only these — a sentence a roofer wrote
   * himself survives a re-measure, which is the whole point of the flag.
   */
  source: "auto";
};

export function toQuoteLines(
  lines: ReportLine[],
  markupPercent: number
): GeneratedLine[] {
  return lines.map((line, index) => {
    const unitCostCents = toCents(line.unitCost);
    const unitPriceCents = priceFromMarkup(unitCostCents, markupPercent);
    return {
      name: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitCostCents,
      unitPriceCents,
      // Rounded once, at the line — see lib/money.ts. Recomputed on every save
      // so a row can never disagree with its own arithmetic.
      amountCents: Math.round(unitPriceCents * line.quantity),
      sortOrder: index,
      source: "auto" as const,
    };
  });
}
