/**
 * AI rate-limit policy — the decision only, with no storage dependency.
 *
 * Kept free of imports so the policy is directly unit-testable (and loadable
 * under plain Node), while lib/ai/rate-limit.ts owns the counting.
 *
 * Limits are grounded in the feature's cost model: a typical project sees ~15 AI
 * questions (~$0.15); 50/day caps a single project near the ~$0.50 worst case
 * modelled for a "chatty power user". The per-minute rule is a separate concern
 * — it stops a runaway loop or stuck client retry burning the daily budget in
 * seconds.
 */
export const AI_LIMITS = {
  perProjectPerDay: 50,
  perUserPerMinute: 20,
} as const;

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;

export type AiUsageKind = "chat" | "summary";

export type RateLimitDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: "project_daily" | "user_burst";
      message: string;
      retryAfterSeconds: number;
    };

/** Pure decision from the observed counts. */
export function evaluateAiLimits(counts: {
  projectDay: number;
  userMinute: number;
}): RateLimitDecision {
  // Burst first: it's the more urgent signal and the cheaper thing to retry.
  if (counts.userMinute >= AI_LIMITS.perUserPerMinute) {
    return {
      allowed: false,
      reason: "user_burst",
      message: "You're sending messages too quickly. Wait a moment and try again.",
      retryAfterSeconds: 60,
    };
  }
  if (counts.projectDay >= AI_LIMITS.perProjectPerDay) {
    return {
      allowed: false,
      reason: "project_daily",
      message: `This project has hit its daily limit of ${AI_LIMITS.perProjectPerDay} AI messages. It resets over the next 24 hours.`,
      retryAfterSeconds: 3600,
    };
  }
  return { allowed: true };
}
