/**
 * Item 35 — deposit / progress / final draws, the ad hoc version.
 *
 * No `InvoiceSchedule` naming milestones up front. A contractor raises the
 * next draw when they need it, says how much — a flat amount or a percentage
 * of the contract — and this decides whether that's a real number: greater
 * than zero, and no more than what the quote has left to invoice. The same
 * two-column shape `Quote.depositKind`/`depositCents` already commits a
 * contractor to *a* deposit before the homeowner ever sees the quote; this is
 * the invoicing-side version, asked later and however many times the job
 * needs it.
 */
import { formatMoney, taxOnCents, type Cents, type RateMicros } from "../money.ts";
import type { DiscountInput } from "../quote/totals.ts";

export type DrawResult = { ok: true; amountCents: Cents } | { ok: false; error: string };

/**
 * A percentage is a share of the quote's own total, not of whatever remains —
 * "the second half" means 50% of the contract, not 50% of whatever rounding
 * left over after the first draw. `remainingCents` is still the ceiling two
 * draws that each correctly read "50%" must not be allowed to clear.
 */
export function drawAmountCents(amount: DiscountInput, quoteTotalCents: Cents): Cents {
  if (!amount) return 0;
  if (amount.kind === "AMOUNT") return amount.cents;
  return taxOnCents(quoteTotalCents, amount.micros);
}

export function resolveDraw(
  amount: DiscountInput,
  quoteTotalCents: Cents,
  remainingCents: Cents
): DrawResult {
  if (remainingCents <= 0) {
    return { ok: false, error: "This quote has already been fully invoiced." };
  }

  const amountCents = drawAmountCents(amount, quoteTotalCents);
  if (amountCents <= 0) return { ok: false, error: "Enter an amount greater than zero." };
  if (amountCents > remainingCents) {
    return {
      ok: false,
      error: `That's more than the ${formatMoney(remainingCents)} still left to invoice.`,
    };
  }
  return { ok: true, amountCents };
}

export type { Cents, RateMicros };
