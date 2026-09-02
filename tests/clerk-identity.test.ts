import assert from "node:assert/strict";
import { test } from "node:test";
import { hasVerifiedPrimaryEmail, primaryEmail } from "../lib/clerk-identity.ts";

/**
 * These two functions are what stand between a matching email string and an
 * account takeover (see `getCurrentDbUser`) — the negative cases here matter
 * more than the happy path, same reasoning as tests/permissions.test.ts.
 */

const verified = (id: string, emailAddress: string) => ({
  id,
  emailAddress,
  verification: { status: "verified" },
});
const unverified = (id: string, emailAddress: string) => ({
  id,
  emailAddress,
  verification: { status: "unverified" },
});

test("primaryEmail picks the address matching primaryEmailAddressId, not array position", () => {
  const clerkUser = {
    primaryEmailAddressId: "email_2",
    emailAddresses: [verified("email_1", "old@example.com"), verified("email_2", "current@example.com")],
  };
  assert.equal(primaryEmail(clerkUser), "current@example.com");
});

test("primaryEmail falls back to the first address when primaryEmailAddressId doesn't match anything", () => {
  const clerkUser = {
    primaryEmailAddressId: "email_missing",
    emailAddresses: [verified("email_1", "fallback@example.com")],
  };
  assert.equal(primaryEmail(clerkUser), "fallback@example.com");
});

test("primaryEmail returns empty string for an account with no email addresses at all", () => {
  assert.equal(primaryEmail({ primaryEmailAddressId: null, emailAddresses: [] }), "");
});

test("hasVerifiedPrimaryEmail is true only when the primary address is actually verified", () => {
  const clerkUser = {
    primaryEmailAddressId: "email_1",
    emailAddresses: [verified("email_1", "owner@example.com")],
  };
  assert.equal(hasVerifiedPrimaryEmail(clerkUser), true);
});

test("hasVerifiedPrimaryEmail is false when the primary address is unverified — this is the account-takeover gate", () => {
  // An attacker adding a victim's email as an unverified secondary address to
  // their own Clerk account must never be treated as proof of ownership.
  const clerkUser = {
    primaryEmailAddressId: "email_1",
    emailAddresses: [unverified("email_1", "victim@example.com")],
  };
  assert.equal(hasVerifiedPrimaryEmail(clerkUser), false);
});

test("hasVerifiedPrimaryEmail is false when a *different* address is verified but not the primary one", () => {
  const clerkUser = {
    primaryEmailAddressId: "email_1",
    emailAddresses: [unverified("email_1", "primary@example.com"), verified("email_2", "secondary@example.com")],
  };
  assert.equal(hasVerifiedPrimaryEmail(clerkUser), false);
});

test("hasVerifiedPrimaryEmail is false when there is no primary address at all", () => {
  assert.equal(hasVerifiedPrimaryEmail({ primaryEmailAddressId: null, emailAddresses: [] }), false);
});
