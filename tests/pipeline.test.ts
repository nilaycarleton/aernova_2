import assert from "node:assert/strict";
import { test } from "node:test";
import {
  pipelineDropTargets,
  requestStatusForStage,
  stageForJob,
  stageForRequest,
} from "../lib/pipeline.ts";

test("an open request is a Lead, Contacted, or Assessing card", () => {
  assert.equal(stageForRequest("NEW"), "LEAD");
  assert.equal(stageForRequest("CONTACTED"), "CONTACTED");
  assert.equal(stageForRequest("ASSESSING"), "ASSESSING");
});

test("a converted request isn't a card of its own", () => {
  assert.equal(stageForRequest("CONVERTED"), null);
});

test("a closed request is Lost", () => {
  assert.equal(stageForRequest("CLOSED"), "LOST");
});

test("a job with no live quote yet reads as Assessing", () => {
  assert.equal(stageForJob("LEAD", null), "ASSESSING");
  assert.equal(stageForJob("READY_FOR_QUOTE", null), "ASSESSING");
});

test("a job's stage follows its most recent quote", () => {
  assert.equal(stageForJob("QUOTED", "DRAFT"), "DRAFT");
  assert.equal(stageForJob("QUOTED", "SENT"), "AWAITING_RESPONSE");
  assert.equal(stageForJob("QUOTED", "VIEWED"), "OPENED");
  assert.equal(stageForJob("QUOTED", "CHANGES_REQUESTED"), "CHANGES_REQUESTED");
});

test("an approved quote is Won even before the job is scheduled", () => {
  assert.equal(stageForJob("QUOTED", "APPROVED"), "WON");
});

test("a scheduled-or-beyond job is Won regardless of the quote", () => {
  for (const status of ["SCHEDULED", "IN_PROGRESS", "COMPLETED"] as const) {
    assert.equal(stageForJob(status, "DRAFT"), "WON");
    assert.equal(stageForJob(status, null), "WON");
  }
});

test("a rejected or expired quote is Lost; an archived job has no card", () => {
  assert.equal(stageForJob("QUOTED", "REJECTED"), "LOST");
  assert.equal(stageForJob("QUOTED", "EXPIRED"), "LOST");
  assert.equal(stageForJob("ARCHIVED", "APPROVED"), null);
});

test("a request can also be dropped straight onto Lost", () => {
  assert.deepEqual(pipelineDropTargets({ kind: "request", stage: "LEAD" }), [
    "CONTACTED",
    "ASSESSING",
    "LOST",
  ]);
  assert.deepEqual(pipelineDropTargets({ kind: "request", stage: "ASSESSING" }), [
    "LEAD",
    "CONTACTED",
    "LOST",
  ]);
});

test("Contacted sits between Lead and Assessing, reachable from and back to both", () => {
  assert.deepEqual(pipelineDropTargets({ kind: "request", stage: "CONTACTED" }), [
    "LEAD",
    "ASSESSING",
    "LOST",
  ]);
});

test("a Lead can still be dropped straight onto Assessing — Contacted is optional, not mandatory", () => {
  assert.ok(pipelineDropTargets({ kind: "request", stage: "LEAD" }).includes("ASSESSING"));
});

test("a draft quote can be sent, approved, or declined outright", () => {
  assert.deepEqual(pipelineDropTargets({ kind: "job", stage: "DRAFT" }), [
    "AWAITING_RESPONSE",
    "WON",
    "LOST",
  ]);
});

test("any live sent quote can only be dropped on Won or Lost", () => {
  for (const stage of ["AWAITING_RESPONSE", "OPENED", "CHANGES_REQUESTED"] as const) {
    assert.deepEqual(pipelineDropTargets({ kind: "job", stage }), ["WON", "LOST"]);
  }
});

test("Won and Lost have nowhere further to go", () => {
  assert.deepEqual(pipelineDropTargets({ kind: "job", stage: "WON" }), []);
  assert.deepEqual(pipelineDropTargets({ kind: "job", stage: "LOST" }), []);
  assert.deepEqual(pipelineDropTargets({ kind: "request", stage: "LOST" }), []);
});

test("requestStatusForStage is the inverse of stageForRequest, for the stages a request can be dropped on", () => {
  assert.equal(requestStatusForStage("LEAD"), "NEW");
  assert.equal(requestStatusForStage("CONTACTED"), "CONTACTED");
  assert.equal(requestStatusForStage("ASSESSING"), "ASSESSING");
  assert.equal(requestStatusForStage("LOST"), "CLOSED");
});

test("requestStatusForStage refuses stages a request can never carry", () => {
  for (const stage of ["DRAFT", "AWAITING_RESPONSE", "OPENED", "CHANGES_REQUESTED", "WON"] as const) {
    assert.equal(requestStatusForStage(stage), null);
  }
});
