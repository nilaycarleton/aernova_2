/**
 * Turning a template into the rows of a new quote.
 *
 * Pure, and separate from the action that writes them, because the interesting
 * part is a pricing rule rather than a database call: **the catalog governs the
 * money, the template governs the words.**
 *
 * A template row that came from the price list takes the *current* price when it
 * is applied, so raising your prices reaches every template at once — that is
 * the whole point of keeping a price list. But its name and description stay as
 * the roofer wrote them in the template, because those were worded on purpose
 * and a catalog description is generic by nature.
 *
 * Jobber propagates everything or nothing, and re-links by name, so renaming an
 * item silently detaches every template using it. We link by id and split the
 * two concerns instead.
 *
 * The chain ends here: catalog → template (live) → quote (frozen). Once the
 * quote exists it is a copy, and nothing reaches back into a document a
 * homeowner may already be reading.
 */
import { lineAmountCents, type Cents } from "../money.ts";

export type TemplateLine = {
  serviceId: string | null;
  kind: "ITEM" | "TEXT";
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unitCostCents: number | null;
  unitPriceCents: number;
  isOptional: boolean;
  imageUrl: string | null;
};

/** Only the fields a live price can come from. */
export type CatalogPrice = {
  id: string;
  unit: string;
  unitPriceCents: number;
  unitCostCents: number | null;
};

export type NewQuoteLine = {
  serviceId: string | null;
  kind: "ITEM" | "TEXT";
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unitCostCents: number | null;
  unitPriceCents: Cents;
  amountCents: Cents;
  isOptional: boolean;
  imageUrl: string | null;
  sortOrder: number;
  source: string;
};

export function applyTemplateLines(
  lines: TemplateLine[],
  catalog: Map<string, CatalogPrice>
): NewQuoteLine[] {
  return lines.map((line, index) => {
    // A row whose service has since been deleted keeps the price stored on the
    // template. Dropping the line instead would silently shorten a quote, which
    // is the one failure mode a roofer would not notice until the homeowner did.
    const live = line.serviceId ? catalog.get(line.serviceId) : undefined;

    const isText = line.kind === "TEXT";
    const unitPriceCents = isText ? 0 : (live?.unitPriceCents ?? line.unitPriceCents);
    const unitCostCents = isText ? null : (live ? live.unitCostCents : line.unitCostCents);
    const quantity = isText ? 0 : line.quantity;

    return {
      serviceId: line.serviceId,
      kind: line.kind,
      name: line.name,
      description: line.description,
      quantity,
      // The unit follows the price: a catalog that moved from "square" to
      // "sq ft" changed what the price *means*, and keeping the old word beside
      // the new number would misprice the job by a factor of a hundred.
      unit: isText ? "each" : (live?.unit ?? line.unit),
      unitCostCents,
      unitPriceCents,
      amountCents: isText ? 0 : lineAmountCents(unitPriceCents, quantity),
      isOptional: line.isOptional,
      imageUrl: isText ? null : line.imageUrl,
      sortOrder: index,
      // Never "auto". A templated row is the roofer's own writing, and a
      // re-measure must not overwrite it — see lib/quote/line-items.ts.
      source: "manual",
    };
  });
}
