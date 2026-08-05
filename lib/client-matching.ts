/**
 * Matching a typed name or address to a client and property that may already
 * exist.
 *
 * Used twice: once by `prisma/backfill-domain.ts`, which has to collapse years
 * of jobs typed by hand into one client per customer, and again by the job
 * form, where selecting an existing client is what saves a roofer from typing
 * an address they have typed before.
 *
 * The keys here are deliberately forgiving — "Dave Chen", "dave chen " and
 * "Dave  Chen" are the same person, and "36 Wetherby Dr." is the same building
 * as "36 Wetherby Drive". They are not identity: two different Dave Chens in
 * one company will collide, which is why matching offers a suggestion in the UI
 * rather than merging silently. The backfill is the one place it merges without
 * asking, and there the alternative — a duplicate client per historical job —
 * is worse.
 */

/** Address pieces as they arrive from a form, a job row, or a property. */
export type AddressParts = {
  addressLine1?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
};

/**
 * Street-type words that get abbreviated as often as they get spelled out.
 * Only unambiguous ones: "Pl" could be Place or Plaza, so it is left alone.
 */
const STREET_WORDS: Record<string, string> = {
  street: "st",
  road: "rd",
  drive: "dr",
  avenue: "ave",
  av: "ave",
  boulevard: "blvd",
  crescent: "cres",
  court: "crt",
  ct: "crt",
  lane: "ln",
  terrace: "terr",
  parkway: "pkwy",
  highway: "hwy",
  north: "n",
  south: "s",
  east: "e",
  west: "w",
};

/**
 * Lowercase, strip punctuation, collapse whitespace. The shared first pass.
 *
 * Apostrophes are deleted rather than replaced with a space — "O'Brien" and
 * "OBrien" are one name, and splitting it into "o brien" would match neither.
 * Hyphens and periods do become spaces, because "36 Wetherby Dr." and
 * "Sainte-Foy" are separated words wearing punctuation.
 */
function normalizeWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[.,#-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Any name string reduced to a comparison key. Empty string when there is
 * nothing to compare, which callers must treat as "no match", never as a key —
 * otherwise every unnamed client matches every other one.
 */
export function clientKey(name: string | null | undefined): string {
  if (!name) return "";
  return normalizeWords(name).join(" ");
}

/**
 * The keys a client can be recognised by: the person, and the business.
 *
 * Two keys rather than one because the two halves of a name are matched
 * independently. Typing "Dave Chen" should find the existing "Dave Chen —
 * Acme Roofing", and typing "Acme Roofing" should find him too — the person
 * and the company are each sufficient to identify the record, and a combined
 * key would recognise neither.
 */
export function clientMatchKeys(parts: {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
}): string[] {
  const person = clientKey([parts.firstName, parts.lastName].filter(Boolean).join(" "));
  const company = clientKey(parts.companyName);
  return [person, company].filter(Boolean);
}

/** True when two clients share any identifying key. */
export function clientsMatch(
  a: Parameters<typeof clientMatchKeys>[0],
  b: Parameters<typeof clientMatchKeys>[0]
): boolean {
  const keys = new Set(clientMatchKeys(a));
  return clientMatchKeys(b).some((key) => keys.has(key));
}

/**
 * A property's address reduced to a comparison key.
 *
 * The postal code is deliberately *not* part of the key. It is the field most
 * often left blank and most often typed wrong, so including it would split one
 * building into two properties on a missing "M4C 1B5".
 */
export function propertyKey(parts: AddressParts): string {
  const street = normalizeWords(parts.addressLine1 ?? "")
    .map((word) => STREET_WORDS[word] ?? word)
    .join(" ");
  const city = normalizeWords(parts.city ?? "").join(" ");
  const province = normalizeWords(parts.province ?? "").join(" ");
  const key = [street, city, province].filter(Boolean).join("|");
  return key;
}

/**
 * The address on one line, the way it is read aloud. Returns null rather than a
 * string of stray commas when there is nothing worth showing — callers render
 * "No address yet" in that case, which is a real state now that an address is
 * required to schedule rather than to exist.
 */
export function formatAddress(parts: AddressParts): string | null {
  const line = [parts.addressLine1, parts.city, parts.province]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  const withPostal = [line, parts.postalCode?.trim()].filter(Boolean).join(" ");
  return withPostal || null;
}
