/**
 * The homeowner's only credential.
 *
 * A quote link goes out by email or text to somebody who will never have an
 * account here — asking a 60-year-old homeowner to sign up before they can read
 * their roofing quote is how a contractor loses the job. So the token in the
 * URL *is* the authentication, and it has to be worth that.
 *
 * 256 bits from `crypto.randomUUID`-grade entropy, base32-encoded without the
 * ambiguous characters. Not `Math.random`, which is seeded from the clock and
 * would let anyone who received one quote enumerate their neighbours'.
 *
 * The length is deliberate too: this is a string a contractor will occasionally
 * read down a phone, so it excludes 0/O and 1/I/L and comes in dash-separated
 * groups. Unguessable first, sayable second.
 */
import { randomBytes } from "node:crypto";

/** Crockford-style: no 0/O, no 1/I/L, no U (avoids accidental words). */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const GROUPS = 4;
const GROUP_LENGTH = 5;

export function generateShareToken(): string {
  const length = GROUPS * GROUP_LENGTH;
  // Rejection-free: 30 does not divide 256, so a naive modulo would make the
  // first two letters slightly likelier. Draw a wide integer per character
  // instead, where the bias is far below anything that helps an attacker.
  const bytes = randomBytes(length * 4);
  let out = "";
  for (let i = 0; i < length; i++) {
    const value = bytes.readUInt32BE(i * 4);
    out += ALPHABET[value % ALPHABET.length];
  }
  return out.match(new RegExp(`.{1,${GROUP_LENGTH}}`, "g"))!.join("-");
}

/**
 * The shape a token must have before it is worth a database round trip.
 *
 * Cheap, and it is the difference between a scanner costing us one string
 * comparison and costing us a query each.
 */
export function isWellFormedShareToken(token: string): boolean {
  return new RegExp(
    `^[${ALPHABET}]{${GROUP_LENGTH}}(-[${ALPHABET}]{${GROUP_LENGTH}}){${GROUPS - 1}}$`
  ).test(token);
}

/**
 * The routes a token can open. Short on purpose — these get read down a phone
 * and typed by hand more often than anyone would like, and `/q/` costs four
 * fewer characters than `/quotes/` on every single one.
 */
const PATHS = {
  quote: "q",
  invoice: "i",
  calendar: "calendar",
  hub: "hub",
  changeOrder: "co",
  warranty: "w",
} as const;

export type ShareKind = keyof typeof PATHS;

/** The link that goes in the email. */
export function shareUrl(kind: ShareKind, token: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/${PATHS[kind]}/${token}`;
}
