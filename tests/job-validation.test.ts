import test from "node:test";
import assert from "node:assert/strict";
import {
  jobDisplayName,
  jobGaps,
  validateNewJob,
  type NewJobFields,
} from "../lib/job-validation.ts";

const valid: NewJobFields = {
  name: "Maple Street Full Replacement",
  clientName: "Dave Chen",
};

test("a complete job reports no problems", () => {
  assert.deepEqual(validateNewJob(valid), {});
});

test("the client is the only thing that blocks a save", () => {
  const errors = validateNewJob({ name: "", clientId: "", clientName: "" });
  assert.deepEqual(Object.keys(errors), ["client"]);
});

test("a job with no name saves fine", () => {
  // Required-to-advance: a name you have to invent is the last thing between a
  // phone call and a written-down job, so it is not required at all.
  assert.deepEqual(validateNewJob({ ...valid, name: "" }), {});
  assert.deepEqual(validateNewJob({ clientId: "clnt_1" }), {});
});

test("either half of the client box satisfies it", () => {
  // Picking an existing client sends an id and no name; adding someone new
  // sends a name and no id. Both are complete answers.
  assert.deepEqual(validateNewJob({ name: "Gutter repair", clientId: "clnt_1" }), {});
  assert.deepEqual(validateNewJob({ name: "Gutter repair", clientName: "Riverside Strata" }), {});
});

test("whitespace-only input is caught — the path native `required` misses", () => {
  // `required` only tests for emptiness, so " " sails past the browser.
  assert.ok(validateNewJob({ name: "Repair", clientName: "  ", clientId: "  " }).client);
});

test("messages speak the trade's language, not the rule that broke", () => {
  const errors = validateNewJob({ name: "", clientName: "" });
  for (const message of Object.values(errors)) {
    assert.ok(
      !/is required|invalid|must not be|null|undefined/i.test(message),
      `message leaks rule-speak: ${message}`
    );
  }
});

test("the address no longer blocks a save", () => {
  // The whole point of the change: a $450 flashing repair described over the
  // phone gets written down now, and gets an address when someone asks for one.
  assert.deepEqual(validateNewJob(valid), {});
});

test("an unnamed job is called after whoever it is for", () => {
  assert.equal(jobDisplayName("", "Dave Chen", 4), "Job for Dave Chen");
  assert.equal(jobDisplayName("   ", "Riverside Strata", 4), "Job for Riverside Strata");
  // A typed name always wins — the fallback never overwrites an intent.
  assert.equal(jobDisplayName("Maple St tear-off", "Dave Chen", 4), "Maple St tear-off");
  // Last resort: a client can be renamed, and the job still has to be findable.
  assert.equal(jobDisplayName(null, "", 4), "Job #4");
  assert.equal(jobDisplayName(null, "", null), "Untitled job");
});

test("a complete job has nothing left to add", () => {
  assert.deepEqual(jobGaps({ hasAddress: true, hasContact: true, hasQuote: true }), []);
});

test("each gap says what it costs, not which rule broke", () => {
  const gaps = jobGaps({ hasAddress: false, hasContact: false, hasQuote: false });
  assert.deepEqual(gaps.map((gap) => gap.id), ["address", "contact", "quote"]);
  for (const gap of gaps) {
    assert.ok(gap.because.length > 0, `${gap.id} gives no reason`);
    assert.ok(
      !/is required|invalid|must |cannot be null/i.test(gap.need + gap.because),
      `gap leaks rule-speak: ${gap.need} — ${gap.because}`
    );
  }
});

test("gaps name only what is actually missing", () => {
  const gaps = jobGaps({ hasAddress: false, hasContact: true, hasQuote: true });
  assert.deepEqual(gaps.map((gap) => gap.id), ["address"]);
});

test("the gap copy promises no feature that does not exist yet", () => {
  // Scheduling is Phase 4. A roofer reading "add an address to schedule this"
  // would go looking for a calendar that isn't there.
  for (const gap of jobGaps({ hasAddress: false, hasContact: false, hasQuote: false })) {
    assert.ok(
      !/schedul|calendar|invoice|book it in/i.test(gap.because),
      `gap copy promises an unbuilt feature: ${gap.because}`
    );
  }
});
