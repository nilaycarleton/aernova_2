import test from "node:test";
import assert from "node:assert/strict";
import { clientKey, propertyKey, formatAddress } from "../lib/client-matching.ts";

test("clientKey ignores the ways a name gets typed twice", () => {
  assert.equal(clientKey("Dave Chen"), clientKey("dave chen "));
  assert.equal(clientKey("Dave  Chen"), clientKey("Dave Chen"));
  assert.equal(clientKey("O'Brien Holdings"), clientKey("OBrien Holdings"));
});

test("clientKey keeps different people apart", () => {
  assert.notEqual(clientKey("Dave Chen"), clientKey("Dave Chan"));
  assert.notEqual(clientKey("Dave Chen"), clientKey("D Chen"));
});

test("clientKey returns empty for nothing, which callers must not match on", () => {
  // An empty key that matched would merge every unnamed client into one person.
  assert.equal(clientKey(""), "");
  assert.equal(clientKey(null), "");
  assert.equal(clientKey("   "), "");
});

test("propertyKey treats abbreviated street types as the same building", () => {
  const spelled = { addressLine1: "36 Wetherby Drive", city: "Toronto", province: "ON" };
  const short = { addressLine1: "36 Wetherby Dr.", city: "toronto", province: "on" };
  assert.equal(propertyKey(spelled), propertyKey(short));
});

test("propertyKey ignores the postal code", () => {
  // The most-skipped and most-mistyped field on the form. Including it would
  // split one roof into two properties over a missing M4C 1B5.
  const withPostal = { addressLine1: "36 Wetherby Dr", city: "Toronto", province: "ON", postalCode: "M4C 1B5" };
  const without = { addressLine1: "36 Wetherby Dr", city: "Toronto", province: "ON" };
  assert.equal(propertyKey(withPostal), propertyKey(without));
});

test("propertyKey keeps the same street in different cities apart", () => {
  const toronto = { addressLine1: "36 Wetherby Dr", city: "Toronto", province: "ON" };
  const ottawa = { addressLine1: "36 Wetherby Dr", city: "Ottawa", province: "ON" };
  assert.notEqual(propertyKey(toronto), propertyKey(ottawa));
});

test("propertyKey is empty when there is no address, so nothing matches", () => {
  assert.equal(propertyKey({}), "");
  assert.equal(propertyKey({ addressLine1: "", city: null, province: undefined }), "");
});

test("formatAddress reads as an address, or returns null", () => {
  assert.equal(
    formatAddress({ addressLine1: "36 Wetherby Dr", city: "Toronto", province: "ON", postalCode: "M4C 1B5" }),
    "36 Wetherby Dr, Toronto, ON M4C 1B5"
  );
  // A partial address is legal now that an address is required to schedule,
  // not to exist — and must not render as a row of stray commas.
  assert.equal(formatAddress({ city: "Toronto", province: "ON" }), "Toronto, ON");
  assert.equal(formatAddress({}), null);
});
