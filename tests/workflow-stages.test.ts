import assert from "node:assert/strict";
import { test } from "node:test";
import { JobStatus } from "@prisma/client";
import { STATUS_FLOW, STATUS_META } from "../lib/job-status.ts";
import {
  effectiveStageFlow,
  effectiveStageMeta,
  nextEnabledStatus,
  parseStageOverridesJson,
  type StageOverride,
} from "../lib/workflow-stages.ts";

test("with no CompanyWorkflowStage rows, every stage renders exactly as it does today", () => {
  for (const status of STATUS_FLOW) {
    const meta = effectiveStageMeta(status, []);
    assert.equal(meta.label, STATUS_META[status].label);
    assert.equal(meta.description, STATUS_META[status].description);
    assert.equal(meta.isEnabled, true);
    assert.equal(meta.isCurrentDisabled, false);
  }
});

test("a set label overrides the default", () => {
  const overrides: StageOverride[] = [
    { jobStatus: JobStatus.READY_FOR_QUOTE, label: "Ready to price", isEnabled: true },
  ];
  const meta = effectiveStageMeta(JobStatus.READY_FOR_QUOTE, overrides);
  assert.equal(meta.label, "Ready to price");
  assert.equal(meta.defaultLabel, "Ready for quote");
});

test("a null or blank label falls back to the default, not an empty string", () => {
  const overrides: StageOverride[] = [
    { jobStatus: JobStatus.QUOTED, label: null, isEnabled: true },
    { jobStatus: JobStatus.SCHEDULED, label: "   ", isEnabled: true },
  ];
  assert.equal(effectiveStageMeta(JobStatus.QUOTED, overrides).label, "Quoted");
  assert.equal(effectiveStageMeta(JobStatus.SCHEDULED, overrides).label, "Scheduled");
});

test("a disabled stage reports isEnabled: false", () => {
  const overrides: StageOverride[] = [
    { jobStatus: JobStatus.PROCESSING, label: null, isEnabled: false },
  ];
  assert.equal(effectiveStageMeta(JobStatus.PROCESSING, overrides).isEnabled, false);
});

test("isCurrentDisabled is true only when the job's own status is the disabled one", () => {
  const overrides: StageOverride[] = [
    { jobStatus: JobStatus.PROCESSING, label: null, isEnabled: false },
  ];
  assert.equal(
    effectiveStageMeta(JobStatus.PROCESSING, overrides, JobStatus.PROCESSING).isCurrentDisabled,
    true
  );
  // Disabled, but not the job's current stage — no warning, just hidden going forward.
  assert.equal(
    effectiveStageMeta(JobStatus.PROCESSING, overrides, JobStatus.LEAD).isCurrentDisabled,
    false
  );
  // The job's current stage, but not a disabled one — no warning.
  assert.equal(effectiveStageMeta(JobStatus.LEAD, overrides, JobStatus.LEAD).isCurrentDisabled, false);
});

test("effectiveStageFlow returns every STATUS_FLOW stage in the fixed underlying order", () => {
  const flow = effectiveStageFlow([]);
  assert.deepEqual(
    flow.map((m) => m.status),
    STATUS_FLOW
  );
});

test("nextEnabledStatus skips a disabled stage and returns the next active one", () => {
  const overrides: StageOverride[] = [
    { jobStatus: JobStatus.PROCESSING, label: null, isEnabled: false },
  ];
  assert.equal(nextEnabledStatus(JobStatus.INSPECTION, overrides), JobStatus.READY_FOR_QUOTE);
});

test("nextEnabledStatus with no overrides matches the plain next stage", () => {
  assert.equal(nextEnabledStatus(JobStatus.LEAD, []), JobStatus.INSPECTION);
});

test("nextEnabledStatus returns null at the end of the flow", () => {
  assert.equal(nextEnabledStatus(JobStatus.COMPLETED, []), null);
});

test("parseStageOverridesJson reads a WorkflowTemplate's stagesJson into StageOverride[]", () => {
  const parsed = parseStageOverridesJson([
    { jobStatus: "PROCESSING", label: null, isEnabled: false },
    { jobStatus: "READY_FOR_QUOTE", label: "Ready to price", isEnabled: true },
  ]);
  assert.deepEqual(parsed, [
    { jobStatus: JobStatus.PROCESSING, label: null, isEnabled: false },
    { jobStatus: JobStatus.READY_FOR_QUOTE, label: "Ready to price", isEnabled: true },
  ]);
});

test("parseStageOverridesJson drops malformed entries instead of throwing", () => {
  assert.deepEqual(parseStageOverridesJson(null), []);
  assert.deepEqual(parseStageOverridesJson("not an array"), []);
  assert.deepEqual(
    parseStageOverridesJson([
      { jobStatus: "NOT_A_REAL_STATUS", isEnabled: true },
      { jobStatus: "LEAD" /* missing isEnabled */ },
      { jobStatus: "QUOTED", isEnabled: true, label: "  " },
    ]),
    [{ jobStatus: JobStatus.QUOTED, label: null, isEnabled: true }]
  );
});

test("no raw enum name ever appears where a label should render", () => {
  for (const status of STATUS_FLOW) {
    const meta = effectiveStageMeta(status, [{ jobStatus: status, label: null, isEnabled: true }]);
    assert.ok(!meta.label.includes("_"), `${status} label "${meta.label}" looks like a raw enum`);
    assert.notEqual(meta.label, status);
  }
});
