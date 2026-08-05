/**
 * A client's name, in three optional parts.
 *
 * Trades sell to a homeowner, to a business, and to a person at a business, and
 * a single `name` column serves only the first. A property manager who is the
 * contact for forty buildings is a first and last name *and* a company name,
 * and a strata corporation is a company name and nothing else.
 *
 * The rule is that at least one part is present. Not "first and last are
 * required" — that would make "Riverside Property Management" unenterable
 * without inventing a person.
 */

export type ClientNameParts = {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
};

function clean(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

/**
 * What to show in a list, on a quote, and in the address bar of someone's
 * memory. A person with a company reads as "Dave Chen — Acme Roofing"; either
 * one alone reads as itself.
 */
export function clientDisplayName(parts: ClientNameParts): string {
  const person = [clean(parts.firstName), clean(parts.lastName)].filter(Boolean).join(" ");
  const company = clean(parts.companyName);
  if (person && company) return `${person} — ${company}`;
  return person || company || "";
}

/** The name to greet someone by: a person if we have one, else the business. */
export function clientGreetingName(parts: ClientNameParts): string {
  const first = clean(parts.firstName);
  if (first) return first;
  const last = clean(parts.lastName);
  if (last) return last;
  return clean(parts.companyName);
}

export type ClientNameError = string | null;

/**
 * Returned, not thrown — the new-job form keeps what the user typed, following
 * the convention already set by `lib/job-validation.ts`. The message names
 * what to do rather than which rule was broken.
 */
export function validateClientName(parts: ClientNameParts): ClientNameError {
  const any = clean(parts.firstName) || clean(parts.lastName) || clean(parts.companyName);
  return any ? null : "Who is this job for? A name or a business name is enough.";
}

/**
 * A name typed into the job form's client box, split into the parts we store.
 *
 * Distinct from `parseClientName` below, and deliberately so. That one guesses
 * at strings nobody is around to correct, so it is cautious. This one runs while
 * a person is looking at the screen with a "this is a business" toggle beside
 * the box: `isBusiness` is their answer, not an inference, and the split is
 * therefore allowed to be simple. Last word is the surname, everything before
 * it is the given name — which handles "Dave Chen", "Mary Anne Chen" and
 * "Jean-Luc de Vries" the way a person would write them on a work order.
 *
 * A wrong split costs nothing: `displayName` reads the same either way, and the
 * client detail page can move the words. What it buys is that creating a client
 * costs one field instead of a form.
 */
export function splitTypedName(raw: string, isBusiness: boolean): ClientNameParts {
  const value = clean(raw);
  if (!value) return {};
  if (isBusiness) return { companyName: value };

  const words = value.split(" ");
  if (words.length === 1) return { firstName: value };
  return { firstName: words.slice(0, -1).join(" "), lastName: words[words.length - 1] };
}

/**
 * True when a typed name looks like a business, used only to *preselect* the
 * toggle. It never decides on its own — the toggle is visible and the person
 * can flip it, which is the whole difference between this and a silent guess.
 */
export function looksLikeBusiness(raw: string): boolean {
  return BUSINESS_MARKERS.test(clean(raw));
}

/**
 * Words that mean the string in front of them is a business, not a person.
 * Kept short and unambiguous — "Group" and "Services" are common in surnames'
 * company forms but also in ordinary phrases, so they are left out.
 */
const BUSINESS_MARKERS =
  /\b(inc|llc|ltd|limited|corp|corporation|co|company|holdings|properties|property|management|enterprises|contracting|construction|realty|strata|condo|association|&)\b/i;

/**
 * Best-effort split of a name that was only ever stored as one string.
 *
 * Used by the backfill, and nowhere else — from here on the three parts are
 * what a person types, so nothing has to be guessed. The guess is deliberately
 * cautious: anything that looks like a business, or has more than two words,
 * goes to `companyName` whole rather than being carved into a first and last
 * name that were never there.
 *
 * The original string is kept verbatim as the display name regardless, so a
 * wrong guess is invisible until someone opens the record to edit it.
 */
export function parseClientName(raw: string | null | undefined): ClientNameParts {
  const value = clean(raw);
  if (!value) return {};

  if (BUSINESS_MARKERS.test(value)) return { companyName: value };

  const words = value.split(" ");
  if (words.length === 2) return { firstName: words[0], lastName: words[1] };

  // One word could be either, and three or more is more often a business than
  // a person with two middle names. Both land in the part that needs no
  // structure to be correct.
  return { companyName: value };
}
