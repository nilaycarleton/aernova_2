import test from "node:test";
import assert from "node:assert/strict";
import {
  clientDisplayName,
  clientGreetingName,
  looksLikeBusiness,
  parseClientName,
  splitTypedName,
  validateClientName,
} from "../lib/client-name.ts";
import { clientMatchKeys, clientsMatch } from "../lib/client-matching.ts";

test("a person, a business, and a person at a business all read correctly", () => {
  assert.equal(clientDisplayName({ firstName: "Dave", lastName: "Chen" }), "Dave Chen");
  assert.equal(clientDisplayName({ companyName: "Riverside Strata" }), "Riverside Strata");
  assert.equal(
    clientDisplayName({ firstName: "Dave", lastName: "Chen", companyName: "Acme Roofing" }),
    "Dave Chen — Acme Roofing"
  );
  assert.equal(clientDisplayName({}), "");
});

test("the greeting name prefers the person, then falls back to the business", () => {
  assert.equal(clientGreetingName({ firstName: "Dave", companyName: "Acme" }), "Dave");
  assert.equal(clientGreetingName({ lastName: "Chen", companyName: "Acme" }), "Chen");
  assert.equal(clientGreetingName({ companyName: "Acme" }), "Acme");
});

test("any one part of a name is enough, and none is not", () => {
  assert.equal(validateClientName({ firstName: "Dave" }), null);
  assert.equal(validateClientName({ lastName: "Chen" }), null);
  assert.equal(validateClientName({ companyName: "Riverside Strata" }), null);
  assert.ok(validateClientName({}));
  assert.ok(validateClientName({ firstName: "  ", companyName: "" }));
});

test("parsing an old single-string name splits two words into a person", () => {
  assert.deepEqual(parseClientName("Dave Chen"), { firstName: "Dave", lastName: "Chen" });
  assert.deepEqual(parseClientName("  Dave   Chen "), { firstName: "Dave", lastName: "Chen" });
});

test("parsing keeps anything business-shaped whole", () => {
  // Carving "North Peak Roofing Inc" into a first and last name would invent a
  // person who does not exist. Whole, in companyName, is the cautious answer.
  assert.deepEqual(parseClientName("North Peak Roofing Inc"), {
    companyName: "North Peak Roofing Inc",
  });
  assert.deepEqual(parseClientName("Chen & Sons"), { companyName: "Chen & Sons" });
  assert.deepEqual(parseClientName("Riverside Property Management"), {
    companyName: "Riverside Property Management",
  });
  // One word is ambiguous, so it goes where no structure is claimed.
  assert.deepEqual(parseClientName("Cher"), { companyName: "Cher" });
  assert.deepEqual(parseClientName(""), {});
  assert.deepEqual(parseClientName(null), {});
});

test("a client is recognised by either the person or the business", () => {
  const existing = { firstName: "Dave", lastName: "Chen", companyName: "Acme Roofing" };
  // Typing just the person finds them…
  assert.ok(clientsMatch(existing, { firstName: "Dave", lastName: "Chen" }));
  // …and so does typing just the business.
  assert.ok(clientsMatch(existing, { companyName: "acme roofing" }));
  assert.ok(!clientsMatch(existing, { firstName: "Dave", lastName: "Chan" }));
});

test("a client with no name matches nothing, including another blank one", () => {
  assert.deepEqual(clientMatchKeys({}), []);
  assert.ok(!clientsMatch({}, {}));
});

test("a name typed into the client box splits on the last word", () => {
  // Simple on purpose: the person is looking at the screen with a toggle beside
  // the box, so `isBusiness` is their answer and nothing has to be inferred.
  assert.deepEqual(splitTypedName("Dave Chen", false), { firstName: "Dave", lastName: "Chen" });
  assert.deepEqual(splitTypedName("Mary Anne Chen", false), {
    firstName: "Mary Anne",
    lastName: "Chen",
  });
  // One word is a first name, not a mystery — they can add the rest later.
  assert.deepEqual(splitTypedName("Cher", false), { firstName: "Cher" });
  assert.deepEqual(splitTypedName("  Dave   Chen ", false), {
    firstName: "Dave",
    lastName: "Chen",
  });
  assert.deepEqual(splitTypedName("", false), {});
});

test("the business toggle overrides the split entirely", () => {
  assert.deepEqual(splitTypedName("Riverside Property Management", true), {
    companyName: "Riverside Property Management",
  });
  // Even a two-word name goes over whole once someone says it's a business.
  assert.deepEqual(splitTypedName("Dave Chen", true), { companyName: "Dave Chen" });
});

test("the business toggle is preset from the name, never decided by it", () => {
  assert.ok(looksLikeBusiness("Riverside Property Management"));
  assert.ok(looksLikeBusiness("Acme Roofing Inc"));
  assert.ok(!looksLikeBusiness("Dave Chen"));
  // The preset is only a starting position: splitTypedName still takes the
  // caller's boolean, so a wrong guess is one click to correct.
  assert.deepEqual(splitTypedName("Acme Roofing Inc", false), {
    firstName: "Acme Roofing",
    lastName: "Inc",
  });
});
