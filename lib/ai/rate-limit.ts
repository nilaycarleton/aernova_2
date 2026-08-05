import { prisma } from "@/lib/prisma";
import {
  DAY_MS,
  MINUTE_MS,
  evaluateAiLimits,
  evaluateCaptureLimits,
  type AiUsageKind,
  type RateLimitDecision,
} from "@/lib/ai/rate-limit-policy";

export { AI_LIMITS, evaluateAiLimits, evaluateCaptureLimits } from "@/lib/ai/rate-limit-policy";
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
  jobId: string;
  userId: string;
}): Promise<RateLimitDecision> {
  const now = Date.now();
  const [projectDay, userMinute] = await Promise.all([
    prisma.aiUsageEvent.count({
      where: { jobId: input.jobId, createdAt: { gte: new Date(now - DAY_MS) } },
    }),
    prisma.aiUsageEvent.count({
      where: { userId: input.userId, createdAt: { gte: new Date(now - MINUTE_MS) } },
    }),
  ]);
  return evaluateAiLimits({ projectDay, userMinute });
}

/** Record an allowed AI call. Only called once a request is past the limiter. */
export async function recordAiUsage(input: {
  jobId: string;
  userId: string;
  kind: AiUsageKind;
}) {
  await prisma.aiUsageEvent.create({ data: input });
}

/** Item 49's sibling of `checkAiRateLimit` — same shape, keyed by company instead of job. */
export async function checkCaptureRateLimit(input: {
  companyId: string;
  userId: string;
}): Promise<RateLimitDecision> {
  const now = Date.now();
  const [companyDay, userMinute] = await Promise.all([
    prisma.aiUsageEvent.count({
      where: { companyId: input.companyId, kind: "capture", createdAt: { gte: new Date(now - DAY_MS) } },
    }),
    prisma.aiUsageEvent.count({
      where: { userId: input.userId, createdAt: { gte: new Date(now - MINUTE_MS) } },
    }),
  ]);
  return evaluateCaptureLimits({ companyDay, userMinute });
}

/** Item 49's sibling of `recordAiUsage` — `jobId` stays null; there isn't one yet. */
export async function recordCaptureUsage(input: { companyId: string; userId: string }) {
  await prisma.aiUsageEvent.create({
    data: { companyId: input.companyId, userId: input.userId, kind: "capture" },
  });
}
