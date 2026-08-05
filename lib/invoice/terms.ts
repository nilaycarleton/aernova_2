/**
 * When a new invoice is due.
 *
 * Net 30 — which is what a contractor means by "end of the month" and what a
 * homeowner assumes when nobody says otherwise. A default rather than a stored
 * `terms` column: the *date* is the fact that matters (it is what makes an
 * invoice overdue, and it is what the homeowner reads), and a column holding
 * the word "NET_30" beside a date derived from it is two places for the same
 * thing to be true. The date is editable on the invoice, which is where the
 * conversation "give them till the end of the month" actually lands.
 */
export const DEFAULT_TERM_DAYS = 30;

export function dueDateFrom(issuedAt: Date, days: number = DEFAULT_TERM_DAYS): Date {
  const due = new Date(issuedAt);
  // `setDate` past the end of a month rolls into the next one, which is the
  // behaviour wanted: 30 days after the 15th of January is the 14th of
  // February, not an invalid date.
  due.setDate(due.getDate() + days);
  return due;
}
