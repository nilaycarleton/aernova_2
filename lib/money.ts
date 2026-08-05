/**
 * Money is stored as an integer number of cents, never as a float.
 *
 * A quote total is the number a contractor stakes a bid on and a homeowner
 * signs — `0.1 + 0.2 === 0.30000000000000004` is not an acceptable failure mode
 * for it. Floats were tolerable while a quote total was a single estimate;
 * once line items multiply out, deposits take a percentage, and payments are
 * subtracted from a balance, the drift becomes visible money.
 *
 * The rule: `Int` columns in Prisma, cents everywhere in application code,
 * dollars only at the two edges — parsing what a user typed, and formatting
 * what they read.
 */

/** A whole number of cents. Negative is legal (credits, adjustments). */
export type Cents = number;

/**
 * Dollars → cents, for values that were *computed* in floating point — the
 * output of `report-generator`, a legacy `totalAmount` column, a third-party
 * API that speaks dollars.
 *
 * Deliberately not used for anything a person typed. By the time a decimal
 * literal is a double the half-cent information is already gone: `1.005` is
 * really `1.00499999999999989`, so this returns 100, not 101. No amount of
 * rounding here recovers it — the fix is to never make the trip through a
 * float, which is what `parseMoneyToCents` does with the original string.
 *
 * The sub-cent ambiguity is immaterial for a computed estimate. It would not be
 * immaterial for an amount a homeowner is charged, and that path is exact.
 */
export function toCents(dollars: number): Cents {
  if (!Number.isFinite(dollars)) return 0;
  return Math.round(dollars * 100);
}

/** Cents → dollars. Only for display and for third-party APIs that want dollars. */
export function toDollars(cents: Cents): number {
  return cents / 100;
}

/**
 * Multiply a unit price by a quantity, landing on a whole cent.
 *
 * Quantities are frequently fractional (230.5 linear feet, 33.67 squares), so
 * the product rarely falls on a cent boundary. Rounding here — once, at the
 * line — is what makes lines both multiply out correctly *and* sum to the
 * subtotal, with no per-line drift for a homeowner to spot.
 */
export function lineAmountCents(unitCostCents: Cents, quantity: number): Cents {
  if (!Number.isFinite(quantity)) return 0;
  return Math.round(unitCostCents * quantity);
}

/** Apply a percentage (markup, tax, deposit) to a cent amount. */
export function percentOfCents(cents: Cents, percent: number): Cents {
  if (!Number.isFinite(percent)) return 0;
  return Math.round(cents * (percent / 100));
}

/**
 * A tax rate as parts per million, which is how `TaxRate.rateMicros` is stored:
 * 13% is 130_000, and Quebec's 9.975% is 99_750 exactly.
 *
 * Percent is kept out of the storage format on purpose. 9.975 has no exact
 * binary representation, and it multiplies every taxable dollar a Quebec
 * contractor ever bills; an integer of millionths does not drift.
 */
export type RateMicros = number;

/** Percent → the stored integer. `13` → `130_000`. Input is a literal, not money. */
export function percentToMicros(percent: number): RateMicros {
  if (!Number.isFinite(percent)) return 0;
  return Math.round(percent * 10_000);
}

/** The stored integer → percent, for display. `99_750` → `9.975`. */
export function microsToPercent(micros: RateMicros): number {
  return micros / 10_000;
}

/** Tax owed on an amount, rounded to the cent once. */
export function taxOnCents(cents: Cents, micros: RateMicros): Cents {
  if (!Number.isFinite(micros)) return 0;
  return Math.round((cents * micros) / 1_000_000);
}

/**
 * Format for display: always two decimal places.
 *
 * `$8,950` and `$8,950.00` are the same number, but only one of them reads as a
 * price. Every money figure a homeowner sees on a quote is a price.
 */
export function formatMoney(cents: Cents | null | undefined): string {
  const value = toDollars(cents ?? 0);
  return value.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    currencyDisplay: "narrowSymbol",
  });
}

/**
 * Parse what a user typed into cents, exactly — the digits are read straight
 * off the string and never become a float, so "1.005" is unambiguously 101
 * cents rather than whatever the nearest double rounds to.
 *
 * Accepts the ways money is actually entered — "$1,200", "1200.5", " 1200 " —
 * because rejecting a dollar sign is a rule the user broke on our behalf.
 * Returns null for blank (the field is optional; blank must not silently become
 * $0.00) and an error for anything that isn't an amount, so callers can report
 * it rather than throw — the returned-not-thrown convention the quote draft
 * action already follows.
 */
export function parseMoneyToCents(raw: string): { cents: Cents | null; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { cents: null };

  const cleaned = trimmed.replace(/[$,\s]/g, "");

  if (cleaned.startsWith("-")) {
    return { cents: null, error: "Enter an amount that isn't negative." };
  }

  const match = cleaned.match(/^(\d*)(?:\.(\d*))?$/);
  if (!match || (!match[1] && !match[2])) {
    return { cents: null, error: "Enter an amount, or leave this blank." };
  }

  const whole = match[1] || "0";
  const fraction = match[2] || "";
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));

  // Anything past two decimals rounds the cent, half up, still on the digits.
  const beyondCents = fraction.slice(2);
  const roundUp = beyondCents !== "" && Number(beyondCents[0]) >= 5;

  return { cents: cents + (roundUp ? 1 : 0) };
}
