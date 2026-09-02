import assert from "node:assert/strict";
import { test } from "node:test";
import { isNodeOdmTaskMissingError } from "../lib/nodeodm-client.ts";

// The one thing that must never happen: a transient failure (network drop,
// 5xx, unconfigured URL) getting misclassified as "permanently gone" and
// retiring a job that would have recovered on the next sweep.

test("a purged task's exact WebODM Lightning error message is detected", () => {
  const error = new Error("Invalid route for taskId abc-123:info, no task table entry.");
  assert.equal(isNodeOdmTaskMissingError(error), true);
});

test("either half of the message alone is enough to detect it", () => {
  assert.equal(isNodeOdmTaskMissingError(new Error("no task table entry")), true);
  assert.equal(isNodeOdmTaskMissingError(new Error("Invalid route for taskId xyz")), true);
});

test("a string error (not an Error instance) is still checked", () => {
  assert.equal(isNodeOdmTaskMissingError("no task table entry"), true);
});

test("a transient network failure is not mistaken for a purged task", () => {
  assert.equal(isNodeOdmTaskMissingError(new Error("fetch failed")), false);
  assert.equal(isNodeOdmTaskMissingError(new Error("NodeODM status check failed with 503")), false);
});

test("an unconfigured worker error is not mistaken for a purged task", () => {
  assert.equal(isNodeOdmTaskMissingError(new Error("NODEODM_URL is not configured")), false);
});

test("a non-Error, non-string value never matches", () => {
  assert.equal(isNodeOdmTaskMissingError(undefined), false);
  assert.equal(isNodeOdmTaskMissingError(null), false);
  assert.equal(isNodeOdmTaskMissingError({ message: "no task table entry" }), false);
});
