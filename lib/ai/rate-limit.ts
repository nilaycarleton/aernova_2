import { prisma } from "@/lib/prisma";
import {
  DAY_MS,
  MINUTE_MS,
  evaluateAiLimits,
  type AiUsageKind,
  type RateLimitDecision,
} from "@/lib/ai/rate-limit-policy";

export { AI_LIMITS, evaluateAiLimits } from "@/lib/ai/rate-limit-policy";
export type { AiUsageKind, RateLimitDecision } from "@/lib/ai/rate-limit-policy";

/**
 * Count usage in the rolling windows and apply the policy.
 *
 * Windows roll (last 24h / last 60s) rather than resetting at midnight, so a
 * user can't burn two days' budget by straddling a calendar boundary.
 *
 * Note: check-then-write is not atomic, so two truly simultaneous requests can
 * both pass at the boundary. Overshooting by one call is acceptable for a soft
 * cost guard — worth revisiting only if these become hard billing quotas.
 */
export async function checkAiRateLimit(input: {
  projectId: string;
  userId: string;
}): Promise<RateLimitDecision> {
  const now = Date.now();
  const [projectDay, userMinute] = await Promise.all([
    prisma.aiUsageEvent.count({
      where: { projectId: input.projectId, createdAt: { gte: new Date(now - DAY_MS) } },
    }),
    prisma.aiUsageEvent.count({
      where: { userId: input.userId, createdAt: { gte: new Date(now - MINUTE_MS) } },
    }),
  ]);
  return evaluateAiLimits({ projectDay, userMinute });
}

/** Record an allowed AI call. Only called once a request is past the limiter. */
export async function recordAiUsage(input: {
  projectId: string;
  userId: string;
  kind: AiUsageKind;
}) {
  await prisma.aiUsageEvent.create({ data: input });
}
