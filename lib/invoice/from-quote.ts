/**
 * Turning an approved quote into the document that asks for the money.
 *
 * Pure, and the one place that decides two things: **which lines cross**, and
 * **what the invoice's own money columns are**. Both are worth stating rather
 * than inlining into a server action, because getting either wrong bills a
 * homeowner for something they declined.
 *
 * Which lines cross: everything that is work, plus the prose. A required line
 * crosses. An optional line the homeowner **ticked** crosses, as an ordinary
 * line — they said yes, so it is work now, and an invoice has no concept of an
 * extra still on offer. An optional line they left alone does **not** cross,
 * and that is the whole point of the flag: "and if you want the skylight
 * flashing done too, that's another $800" must never turn up on a bill.
 *
 * What does not cross at all is cost. `InvoiceLineItem` has no `unitCostCents`
 * and no markup, so there is nothing here for a stray print, export or emailed
 * PDF to leak. A contractor's margin is not the homeowner's business, and the
 * safest way to keep a column out of a document is for the column not to exist.
 */
import { computeTotals, type DiscountInput } from "../quote/totals.ts";
import type { Cents } from "../money.ts";

/** The subset of `QuoteLineItem` this reads. */
export type QuoteLineForInvoice = {
  kind: "ITEM" | "TEXT";
  group: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  sortOrder: number;
  isOptional: boolean;
  /** The homeowner ticked this extra on the public page and approved. */
  clientSelected: boolean;
};

/** A row ready to be written as an `InvoiceLineItem`. No cost, by construction. */
export type InvoiceLineDraft = {
  kind: "ITEM" | "TEXT";
  group: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unitPriceCents: Cents;
  amountCents: Cents;
  sortOrder: number;
};

export type InvoiceDraft = {
  lineItems: InvoiceLineDraft[];
  subtotalCents: Cents;
  discountCents: Cents;
  taxCents: Cents;
  totalAmountCents: Cents;
};

/** Work the homeowner is on the hook for: required, or an extra they accepted. */
export function billableOnInvoice(line: QuoteLineForInvoice): boolean {
  if (line.kind === "TEXT") return true;
  return !line.isOptional || line.clientSelected;
}

export function invoiceFromQuote(
  lines: QuoteLineForInvoice[],
  options: { discount?: DiscountInput; taxRateMicros?: number | null } = {}
): InvoiceDraft {
  // The totals run over the lines in their *quote* shape — optional flags
  // intact — and only then are they flattened for storage. That ordering is
  // load-bearing: `computeTotals` applies a percentage discount to the required
  // subtotal and adds accepted extras afterwards, on purpose (see totals.ts), so
  // flattening first would silently discount an $800 extra that was agreed at
  // the price printed beside its checkbox.
  const crossing = lines.filter(billableOnInvoice);

  const totals = computeTotals(
    crossing.map((line) => ({
      kind: line.kind,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      isOptional: line.isOptional,
      isAccepted: line.clientSelected,
    })),
    { discount: options.discount ?? null, taxRateMicros: options.taxRateMicros ?? null }
  );

  const lineItems: InvoiceLineDraft[] = crossing
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((line, index) => ({
      kind: line.kind,
      group: line.group,
      name: line.name,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitPriceCents: line.unitPriceCents,
      amountCents: line.kind === "TEXT" ? 0 : Math.round(line.unitPriceCents * line.quantity),
      // Renumbered from zero rather than carried across. The quote's ordering
      // had gaps wherever a declined extra used to sit, and a document whose
      // rows are 0, 1, 4, 7 sorts fine but tells the next reader nothing.
      sortOrder: index,
    }));

  return {
    lineItems,
    // The invoice's subtotal is the sum of the rows actually printed on it —
    // accepted extras included, since they are no longer extras. That is what
    // makes the document check out under a homeowner's pen: the lines add to
    // the subtotal, less the discount, plus the tax, equals the total.
    subtotalCents: totals.subtotalCents + totals.acceptedOptionalCents,
    discountCents: totals.discountCents,
    taxCents: totals.taxCents,
    totalAmountCents: totals.totalCents,
  };
}

/**
 * What to call it.
 *
 * Not the quote's own title verbatim — "Re-roof — 36 Wetherby" is what was
 * being sold, and it reads oddly at the top of a bill. The number is what a
 * contractor and a homeowner both refer to on the phone; the title is context
 * underneath it, so this keeps the quote's words and lets the invoice number
 * carry the identity.
 */
export function invoiceTitleFromQuote(quoteTitle: string): string {
  return quoteTitle.trim() || "Invoice";
}
