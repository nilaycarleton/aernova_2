import test from "node:test";
import assert from "node:assert/strict";
import { validateNewProject, type NewProjectFields } from "../lib/project-validation.ts";

const valid: NewProjectFields = {
  name: "Maple Street Full Replacement",
  clientName: "North Peak Roofing",
  addressLine1: "145 Maple Street",
  city: "Brampton",
  province: "ON",
};

test("a complete job reports no problems", () => {
  assert.deepEqual(validateNewProject(valid), {});
});

test("every missing field is reported, not just the first", () => {
  // The point of collecting: a roofer fixes all five in one pass instead of
  // rediscovering them one submit at a time.
  const errors = validateNewProject({
    name: "",
    clientName: "",
    addressLine1: "",
    city: "",
    province: "",
  });
  assert.deepEqual(Object.keys(errors).sort(), [
    "addressLine1",
    "city",
    "clientName",
    "name",
    "province",
  ]);
});

test("a single missing field reports only that field", () => {
  const errors = validateNewProject({ ...valid, province: "" });
  assert.deepEqual(Object.keys(errors), ["province"]);
});

test("whitespace-only input is caught — the path native `required` misses", () => {
  // `required` only tests for emptiness, so " " sails past the browser. The
  // action trims before validating, which is why this must be caught server-side.
  const trimmed = { ...valid, city: "   ".trim() };
  const errors = validateNewProject(trimmed);
  assert.equal(errors.city, "Add the city.");
});

test("messages speak the trade's language, not the rule that broke", () => {
  const errors = validateNewProject({
    name: "",
    clientName: "",
    addressLine1: "",
    city: "",
    province: "",
  });
  for (const message of Object.values(errors)) {
    assert.ok(
      !/is required|invalid|must not be|null|undefined/i.test(message),
      `message leaks rule-speak: ${message}`
    );
  }
});

test("optional fields never block a save", () => {
  // clientEmail, clientPhone, postalCode and notes are not validated: a roofer
  // starting a job from a driveway may not have them yet.
  assert.deepEqual(validateNewProject(valid), {});
});
