import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateAiLimits, AI_LIMITS } from "../lib/ai/rate-limit-policy.ts";

// Every AI call spends real money, so these pin the caps. A future change that
// silently raises a limit (or drops a rule) should fail here rather than show up
// on the Anthropic bill.

test("a fresh project is allowed", () => {
  assert.deepEqual(evaluateAiLimits({ projectDay: 0, userMinute: 0 }), { allowed: true });
});

test("allowed right up to the daily cap", () => {
  const decision = evaluateAiLimits({
    projectDay: AI_LIMITS.perProjectPerDay - 1,
    userMinute: 0,
  });
  assert.equal(decision.allowed, true);
});

test("blocked at the daily cap, not one call past it", () => {
  const decision = evaluateAiLimits({ projectDay: AI_LIMITS.perProjectPerDay, userMinute: 0 });
  assert.equal(decision.allowed, false);
  if (decision.allowed) return;
  assert.equal(decision.reason, "project_daily");
  // The message must tell the roofer the actual number and that it recovers.
  assert.match(decision.message, new RegExp(String(AI_LIMITS.perProjectPerDay)));
  assert.ok(decision.retryAfterSeconds > 0);
});

test("blocked at the per-minute burst cap", () => {
  const decision = evaluateAiLimits({ projectDay: 0, userMinute: AI_LIMITS.perUserPerMinute });
  assert.equal(decision.allowed, false);
  if (decision.allowed) return;
  assert.equal(decision.reason, "user_burst");
  assert.equal(decision.retryAfterSeconds, 60);
});

test("burst wins when both caps are exceeded (cheaper to retry)", () => {
  const decision = evaluateAiLimits({
    projectDay: AI_LIMITS.perProjectPerDay + 10,
    userMinute: AI_LIMITS.perUserPerMinute + 10,
  });
  assert.equal(decision.allowed, false);
  if (decision.allowed) return;
  assert.equal(decision.reason, "user_burst");
});

test("caps stay at the modelled values", () => {
  // ~15 questions/project is typical; 50/day caps a project near the ~$0.50
  // worst case that was budgeted for. Changing these is a cost decision.
  assert.equal(AI_LIMITS.perProjectPerDay, 50);
  assert.equal(AI_LIMITS.perUserPerMinute, 20);
});
