/**
 * The arithmetic of a quote, in one place and with no database in sight.
 *
 * Every number a homeowner reads and every number a contractor makes a living
 * by comes out of this file, so it is pure: rows in, figures out, testable to
 * the cent. The builder, the public page, the PDF and the eventual invoice all
 * call it rather than each doing their own sum — three implementations of a
 * subtotal is three chances to show a homeowner a different total than the one
 * on the contract.
 *
 * Order of operations, taken from Jobber's totals block (PLAN-CRM.md,
 * 2026-07-28): subtotal → discount → accepted extras → tax → total. Tax lands
 * on the discounted amount, which is the only defensible reading: you are not
 * taxed on money you were never charged.
 *
 * Extras the homeowner ticked go in *after* the discount on purpose. A 10% off
 * the roof was agreed on the roof; an extra they add themselves at the price
 * printed beside the checkbox should cost what it says it costs. Discounting it
 * silently would also break the one rule this page cannot break — that ticking
 * a $800 box moves the total by $800 and not by some number nobody can derive.
 */
import {
  lineAmountCents,
  taxOnCents,
  type Cents,
  type RateMicros,
} from "../money.ts";

/** The shape the totals need. Deliberately narrower than the Prisma row. */
export type LineForTotals = {
  kind?: "ITEM" | "TEXT";
  quantity: number;
  unitPriceCents: number;
  unitCostCents?: number | null;
  isOptional?: boolean;
  /**
   * An optional line the homeowner ticked. Meaningless on a required line —
   * required work is not something anyone accepts, it is the quote.
   */
  isAccepted?: boolean;
};

export type DiscountInput =
  | { kind: "AMOUNT"; cents: number }
  | { kind: "PERCENT"; micros: RateMicros }
  | null;

/**
 * The three columns a discount or a deposit is stored in, collapsed into the
 * one shape the arithmetic wants.
 *
 * `AmountKind` plus two value columns is deliberate storage (see the schema:
 * "500" is five dollars or five hundred percent depending on a sibling column),
 * but every caller then has to write the same nested ternary to read it back.
 * There were four copies of it — the builder, the public page, the approve
 * action, the quote page — before the invoice wanted a fifth, and four copies
 * of a money conversion is four chances for one of them to read the wrong
 * column.
 *
 * Typed on the string literals rather than Prisma's `AmountKind` so this file
 * stays free of the database. The enum's values are exactly these two.
 */
export function amountInput(source: {
  kind: "PERCENT" | "AMOUNT" | null;
  cents?: number | null;
  percentMicros?: number | null;
}): DiscountInput {
  if (source.kind === "PERCENT") {
    return { kind: "PERCENT", micros: source.percentMicros ?? 0 };
  }
  if (source.kind === "AMOUNT") {
    return { kind: "AMOUNT", cents: source.cents ?? 0 };
  }
  return null;
}

export type QuoteTotals = {
  /** Line amounts, excluding optional upsells and text rows. */
  subtotalCents: Cents;
  /** What the extras still on offer would add. Zero when there are none. */
  optionalCents: Cents;
  /** What the extras they said yes to did add. Part of the total. */
  acceptedOptionalCents: Cents;
  discountCents: Cents;
  /** Subtotal, less discount, plus accepted extras — what tax is charged on. */
  taxableCents: Cents;
  taxCents: Cents;
  totalCents: Cents;
  /** What the work costs the contractor. Never client-visible. */
  costCents: Cents;
  /** Total less cost. Never client-visible. */
  marginCents: Cents;
  /**
   * Margin as a percentage of **price**, matching Jobber: $3,145 on a $7,500
   * quote reads 41.93%, not 72.2%. Null when the total is zero — a margin
   * percentage of nothing is not 0%, it is undefined, and printing "0.00%"
   * beside a blank quote reads as "you are making nothing on this."
   */
  marginPercent: number | null;
  /**
   * The aggregate of the per-line `markupPercent()` below — `(price − cost) /
   * cost` over the whole quote, using the same price/cost pair `marginCents`
   * already sums. Null when there's no cost to mark up, same doctrine as the
   * per-line version: a quote with no cost data has no markup, not 0%.
   */
  markupPercent: number | null;
  depositCents: Cents;
};

/**
 * One row's money. Optional rows still compute; they just don't count yet.
 *
 * Quantity and unit price are each floored at zero before multiplying —
 * unlike the standalone discount/deposit fields (where a negative value is
 * a legitimate credit), a negative quantity or price on a line item isn't a
 * feature anyone asked for; it's the one input this function was trusting
 * unchecked while the discount two lines below was carefully clamped. A
 * negative line used to subtract from the subtotal with no floor at all —
 * see `Math.min(Math.max(discountCents, 0), subtotalCents)` below for the
 * pattern this now matches. Clamping both factors (rather than just the
 * product) also stops two negative inputs from multiplying into a
 * positive-looking amount that would otherwise slip past a product-only check.
 */
export function lineTotalCents(line: LineForTotals): Cents {
  if (line.kind === "TEXT") return 0;
  return lineAmountCents(Math.max(0, line.unitPriceCents), Math.max(0, line.quantity));
}

/** Floored the same way as `lineTotalCents` — a negative cost would fabricate margin instead of representing anything real. */
function lineCostCents(line: LineForTotals): Cents {
  if (line.kind === "TEXT" || line.unitCostCents == null) return 0;
  return lineAmountCents(Math.max(0, line.unitCostCents), Math.max(0, line.quantity));
}

/**
 * Markup, derived from the cost/price pair rather than stored — `(price − cost)
 * / cost`, which is what Jobber's popover shows: $4,100 → $6,800 is 65.85%.
 *
 * Null when there is no cost to mark up. A price with no cost behind it has no
 * markup; it is not "infinite" and it is certainly not 0%.
 */
export function markupPercent(
  unitCostCents: number | null | undefined,
  unitPriceCents: number
): number | null {
  if (unitCostCents == null || unitCostCents === 0) return null;
  return ((unitPriceCents - unitCostCents) / unitCostCents) * 100;
}

/** The inverse, for when someone types a markup and expects a price back. */
export function priceFromMarkup(unitCostCents: number, markup: number): Cents {
  if (!Number.isFinite(markup)) return unitCostCents;
  return Math.round(unitCostCents * (1 + markup / 100));
}

export function computeTotals(
  lines: LineForTotals[],
  options: {
    discount?: DiscountInput;
    taxRateMicros?: RateMicros | null;
    deposit?: DiscountInput;
  } = {}
): QuoteTotals {
  let subtotalCents = 0;
  let optionalCents = 0;
  let acceptedOptionalCents = 0;
  let costCents = 0;

  for (const line of lines) {
    const amount = lineTotalCents(line);
    if (line.isOptional && !line.isAccepted) {
      // An upsell must not inflate the number the homeowner compares against
      // the other guy's quote. It is counted, and counted separately.
      optionalCents += amount;
      continue;
    }
    if (line.isOptional) {
      // They ticked it. It is work now, and it costs what work costs.
      acceptedOptionalCents += amount;
      costCents += lineCostCents(line);
      continue;
    }
    subtotalCents += amount;
    costCents += lineCostCents(line);
  }

  const discount = options.discount ?? null;
  let discountCents = 0;
  if (discount?.kind === "AMOUNT") {
    discountCents = discount.cents;
  } else if (discount?.kind === "PERCENT") {
    discountCents = taxOnCents(subtotalCents, discount.micros);
  }
  // A discount larger than the quote is a typo, not a refund. Clamped rather
  // than rejected: the roofer is mid-edit, and a negative total on screen is
  // more alarming than a discount that stops at the subtotal.
  discountCents = Math.min(Math.max(discountCents, 0), subtotalCents);

  const taxableCents = subtotalCents - discountCents + acceptedOptionalCents;
  const taxCents = options.taxRateMicros
    ? taxOnCents(taxableCents, options.taxRateMicros)
    : 0;
  const totalCents = taxableCents + taxCents;

  const marginCents = taxableCents - costCents;

  const deposit = options.deposit ?? null;
  let depositCents = 0;
  if (deposit?.kind === "AMOUNT") {
    depositCents = deposit.cents;
  } else if (deposit?.kind === "PERCENT") {
    // A deposit is a share of what they will actually be billed, tax included.
    depositCents = taxOnCents(totalCents, deposit.micros);
  }
  depositCents = Math.min(Math.max(depositCents, 0), totalCents);

  return {
    subtotalCents,
    optionalCents,
    acceptedOptionalCents,
    discountCents,
    taxableCents,
    taxCents,
    totalCents,
    costCents,
    marginCents,
    marginPercent: taxableCents === 0 ? null : (marginCents / taxableCents) * 100,
    markupPercent: costCents === 0 ? null : (marginCents / costCents) * 100,
    depositCents,
  };
}
