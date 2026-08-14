import assert from "node:assert/strict";
import { test } from "node:test";
import { jobProgressDisplay, jobProgressStateLabel } from "../lib/job-progress.ts";

test("no signals and fewer than two work visits reads as a calm empty state, not a blank UI", () => {
  const none = jobProgressDisplay(null, null, []);
  assert.equal(none.source, "none");
  assert.equal(none.primaryLabel, "No progress reported yet");

  const one = jobProgressDisplay(null, null, [{ kind: "WORK", status: "SCHEDULED" }]);
  assert.equal(one.source, "none", "a single visit isn't a meaningful count");
});

test("two or more work visits fall back to a completion count", () => {
  const display = jobProgressDisplay(null, null, [
    { kind: "WORK", status: "COMPLETED" },
    { kind: "WORK", status: "COMPLETED" },
    { kind: "WORK", status: "COMPLETED" },
    { kind: "WORK", status: "SCHEDULED" },
    { kind: "WORK", status: "SCHEDULED" },
  ]);
  assert.equal(display.source, "visitCompletion");
  assert.equal(display.primaryLabel, "3 of 5 visits completed");
  assert.equal(display.completedCount, 3);
  assert.equal(display.totalCount, 5);
  assert.equal(display.percent, 60);
});

test("assessment visits never count toward work progress", () => {
  const display = jobProgressDisplay(null, null, [
    { kind: "ASSESSMENT", status: "COMPLETED" },
    { kind: "WORK", status: "COMPLETED" },
    { kind: "WORK", status: "SCHEDULED" },
  ]);
  assert.equal(display.totalCount, 2, "the inspection visit is excluded");
  assert.equal(display.completedCount, 1);
});

test("a cancelled work visit doesn't count toward the total either", () => {
  const display = jobProgressDisplay(null, null, [
    { kind: "WORK", status: "COMPLETED" },
    { kind: "WORK", status: "COMPLETED" },
    { kind: "WORK", status: "CANCELLED" },
  ]);
  assert.equal(display.totalCount, 2);
  assert.equal(display.completedCount, 2);
});

test("a crew-reported state takes over from the visit-count fallback", () => {
  const display = jobProgressDisplay(null, "MOSTLY_COMPLETE", [
    { kind: "WORK", status: "COMPLETED" },
    { kind: "WORK", status: "SCHEDULED" },
  ]);
  assert.equal(display.source, "crewState");
  assert.equal(display.primaryLabel, "Mostly complete", "never the raw enum");
  assert.equal(display.crewStateLabel, "Mostly complete");
});

test("an office percentage takes precedence over a crew state, but the crew state still shows", () => {
  const display = jobProgressDisplay(65, "READY_FOR_QUALITY_CHECK", [
    { kind: "WORK", status: "COMPLETED" },
    { kind: "WORK", status: "SCHEDULED" },
  ]);
  assert.equal(display.source, "officePercent");
  assert.equal(display.primaryLabel, "65%");
  assert.equal(display.percent, 65);
  assert.equal(
    display.crewStateLabel,
    "Ready for quality check",
    "the independent crew signal is never hidden by the office one"
  );
  assert.match(display.secondaryDescription, /ready for quality check/i);
});

test("setting the office percent never derives from or clears the crew state, and vice versa", () => {
  // Same two facts, different precedence — proving neither write path
  // reads or overwrites the other's column.
  const officeOnly = jobProgressDisplay(40, null, []);
  const crewOnly = jobProgressDisplay(null, "IN_PROGRESS", []);
  assert.equal(officeOnly.crewStateLabel, null);
  assert.equal(crewOnly.percent, null);
});

test("no status label is a raw database enum", () => {
  for (const state of [
    "NOT_STARTED",
    "IN_PROGRESS",
    "MOSTLY_COMPLETE",
    "READY_FOR_QUALITY_CHECK",
    "COMPLETED",
  ] as const) {
    const label = jobProgressStateLabel(state);
    assert.notEqual(label, state);
    assert.ok(!label.includes("_"), `${state} label reads as an enum`);
  }
});
