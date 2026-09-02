/**
 * The arithmetic of a change order — deliberately smaller than
 * `lib/quote/totals.ts`. A change order has no tax, discount, deposit, or
 * optional-extras concept (§14.2); it is a flat sum of its own line items,
 * added on top of the quote it amends once approved.
 */
import { lineTotalCents } from "./quote/totals.ts";

export type ChangeOrderLineForTotal = {
  quantity: number;
  unitPriceCents: number;
};

/** One line's amount — the same floor-then-multiply arithmetic every other line item in this app uses. */
export function changeOrderLineTotalCents(line: ChangeOrderLineForTotal): number {
  return lineTotalCents({ quantity: line.quantity, unitPriceCents: line.unitPriceCents });
}

/** The change order's own total: the sum of its lines, nothing else. */
export function changeOrderTotalCents(lines: ChangeOrderLineForTotal[]): number {
  return lines.reduce((sum, line) => sum + changeOrderLineTotalCents(line), 0);
}

/**
 * §19.1's own numeric example: "Original approved quote: $16,000. Approved
 * change order: +$1,200. Updated job value: $17,200." Computed, never
 * stored — same doctrine as `Quote.totalAmountCents` being a cache and
 * `lib/quote/totals.ts` being the truth.
 */
export function effectiveContractValueCents(
  quoteTotalCents: number,
  approvedChangeOrderCents: number
): number {
  return quoteTotalCents + approvedChangeOrderCents;
}
