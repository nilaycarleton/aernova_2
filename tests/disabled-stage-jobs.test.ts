import assert from "node:assert/strict";
import { test } from "node:test";
import { sortDisabledStageJobs, type DisabledStageJobFacts } from "../lib/disabled-stage-jobs.ts";

function job(overrides: Partial<DisabledStageJobFacts> & { id: string }): DisabledStageJobFacts {
  return {
    title: "Job",
    jobNumber: null,
    stageEnteredAt: new Date("2026-01-01"),
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

test("sorts oldest stage-entry first, primarily", () => {
  const older = job({ id: "a", stageEnteredAt: new Date("2026-01-01") });
  const newer = job({ id: "b", stageEnteredAt: new Date("2026-02-01") });
  assert.deepEqual(sortDisabledStageJobs([newer, older]).map((j) => j.id), ["a", "b"]);
});

test("ties on stage-entry fall back to oldest job created", () => {
  const same = new Date("2026-01-01");
  const olderCreated = job({ id: "a", stageEnteredAt: same, createdAt: new Date("2025-06-01") });
  const newerCreated = job({ id: "b", stageEnteredAt: same, createdAt: new Date("2025-12-01") });
  assert.deepEqual(
    sortDisabledStageJobs([newerCreated, olderCreated]).map((j) => j.id),
    ["a", "b"]
  );
});

test("ties on stage-entry and created fall back to numbered-before-unnumbered", () => {
  const same = new Date("2026-01-01");
  const numbered = job({ id: "a", stageEnteredAt: same, createdAt: same, jobNumber: 42 });
  const unnumbered = job({ id: "b", stageEnteredAt: same, createdAt: same, jobNumber: null });
  assert.deepEqual(
    sortDisabledStageJobs([unnumbered, numbered]).map((j) => j.id),
    ["a", "b"]
  );
});

test("ties down to jobNumber ascending among numbered jobs", () => {
  const same = new Date("2026-01-01");
  const low = job({ id: "a", stageEnteredAt: same, createdAt: same, jobNumber: 5 });
  const high = job({ id: "b", stageEnteredAt: same, createdAt: same, jobNumber: 12 });
  assert.deepEqual(sortDisabledStageJobs([high, low]).map((j) => j.id), ["a", "b"]);
});

test("ties down to title ascending among unnumbered jobs", () => {
  const same = new Date("2026-01-01");
  const a = job({ id: "x", stageEnteredAt: same, createdAt: same, title: "Alpha job" });
  const b = job({ id: "y", stageEnteredAt: same, createdAt: same, title: "Zeta job" });
  assert.deepEqual(sortDisabledStageJobs([b, a]).map((j) => j.id), ["x", "y"]);
});

test("a full tie on every level falls back to id, fully deterministic", () => {
  const same = new Date("2026-01-01");
  const b = job({ id: "b", stageEnteredAt: same, createdAt: same, title: "Same title" });
  const a = job({ id: "a", stageEnteredAt: same, createdAt: same, title: "Same title" });
  assert.deepEqual(sortDisabledStageJobs([b, a]).map((j) => j.id), ["a", "b"]);
});

test("does not mutate the input array", () => {
  const jobs = [job({ id: "b", stageEnteredAt: new Date("2026-02-01") }), job({ id: "a", stageEnteredAt: new Date("2026-01-01") })];
  const original = [...jobs];
  sortDisabledStageJobs(jobs);
  assert.deepEqual(jobs, original);
});
