/**
 * The email-selection logic `getCurrentDbUser` (lib/auth.ts) needs to decide
 * who a Clerk session actually belongs to — split out into its own
 * dependency-free file so it's testable under plain `node --test` without
 * dragging in `@clerk/nextjs/server`, which only resolves inside Next's own
 * build system.
 */

export type ClerkEmail = { id: string; emailAddress: string; verification: { status: string } | null };
export type ClerkUserEmails = { primaryEmailAddressId: string | null; emailAddresses: ClerkEmail[] };

/**
 * The account's primary email, for display/storage. Selected by
 * `primaryEmailAddressId` rather than array position — `emailAddresses[0]`
 * is just whichever address Clerk happens to list first, which is not
 * necessarily the one the account owner picked as primary.
 */
export function primaryEmail(clerkUser: ClerkUserEmails): string {
  const primary = clerkUser.emailAddresses.find((a) => a.id === clerkUser.primaryEmailAddressId);
  return primary?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? "";
}

/**
 * Whether the primary email has actually been verified — the signal a
 * security-sensitive decision (matching an existing account by email) needs.
 * Clerk normally won't let an unverified address become primary, but this
 * checks explicitly rather than assuming it, since the cost of being wrong
 * in the cautious direction is nothing (falls through to the unique-email
 * constraint) and the cost of being wrong in the other direction is an
 * account takeover.
 */
export function hasVerifiedPrimaryEmail(clerkUser: ClerkUserEmails): boolean {
  const primary = clerkUser.emailAddresses.find((a) => a.id === clerkUser.primaryEmailAddressId);
  return primary?.verification?.status === "verified";
}
