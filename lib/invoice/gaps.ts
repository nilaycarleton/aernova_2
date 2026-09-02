/**
 * What has to be true before an invoice can go out.
 *
 * The plan's rule, applied at the last step: **required to advance, not
 * required to exist.** An invoice can be raised against almost nothing — that
 * is the whole reason `quoteId` is optional — but the moment it is *sent* it
 * becomes a document a homeowner may hand to an accountant, and a couple of
 * things have to be on it.
 *
 * Pure, so the rules can be tested without a company, and phrased as work to do
 * rather than rules that were broken — the same shape as `jobGaps()`.
 */
export type InvoiceGap = {
  id: "businessNumber" | "email" | "lines";
  /** What is missing, as a thing to add. */
  need: string;
  /** Why it matters, in the present tense. */
  because: string;
  /** Where to go and fix it. */
  href?: string;
};

export type InvoiceSendFacts = {
  /** Is this invoice charging tax? */
  chargesTax: boolean;
  hasBusinessNumber: boolean;
  hasLines: boolean;
};

export function invoiceSendGaps(facts: InvoiceSendFacts): InvoiceGap[] {
  const gaps: InvoiceGap[] = [];

  if (!facts.hasLines) {
    gaps.push({
      id: "lines",
      need: "Something to charge for",
      because: "This invoice has no lines on it, so it asks for nothing.",
    });
  }

  // Only when tax is actually being charged. A contractor under the small
  // supplier threshold charges no GST/HST, has no number to give, and must not
  // be stopped from billing for a $450 flashing repair over a registration they
  // are not required to hold. Charge tax and it is a different matter: an
  // invoice that collects HST without printing the number it was collected
  // under is one the homeowner's accountant will send straight back.
  if (facts.chargesTax && !facts.hasBusinessNumber) {
    gaps.push({
      id: "businessNumber",
      need: "Your business number",
      because: "This invoice charges tax, and a tax invoice has to say who collected it.",
      href: "/settings",
    });
  }

  return gaps;
}

/**
 * The email gap is kept apart from the two above because it only blocks *one*
 * of the two doors. A contractor who copies the link into a text message needs
 * no email address on file, and folding it in with the rest would put a wall in
 * front of the way most of these actually go out.
 */
export function invoiceEmailGap(facts: { hasClientEmail: boolean }): InvoiceGap | null {
  if (facts.hasClientEmail) return null;
  return {
    id: "email",
    need: "An email address for this client",
    because: "There's nowhere to send it — copy the link instead, or add one.",
  };
}
