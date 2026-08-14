import assert from "node:assert/strict";
import { test } from "node:test";
import { JobStatus } from "@prisma/client";
import { statusTone } from "../lib/job-status.ts";

test("every in-flight status reads as neutral, matching STATUS_META's IN_FLIGHT badge tier", () => {
  for (const status of [
    JobStatus.LEAD,
    JobStatus.INSPECTION,
    JobStatus.PROCESSING,
    JobStatus.READY_FOR_QUOTE,
    JobStatus.QUOTED,
    JobStatus.SCHEDULED,
    JobStatus.IN_PROGRESS,
  ]) {
    assert.equal(statusTone(status), "neutral");
  }
});

test("COMPLETED reads as success, matching STATUS_META's COMPLETE badge tier", () => {
  assert.equal(statusTone(JobStatus.COMPLETED), "success");
});

test("ARCHIVED reads as neutral, matching STATUS_META's muted ARCHIVED_BADGE tier", () => {
  assert.equal(statusTone(JobStatus.ARCHIVED), "neutral");
});
