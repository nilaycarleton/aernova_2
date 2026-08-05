/**
 * How an inbound ask reads on screen.
 *
 * Same doctrine as `lib/job-status.ts` and `lib/client-status.ts`: standing is
 * state, so it reads tonally. The one exception is the *waiting* figure, which
 * is not state at all — it is a measurement of how long someone has been left
 * hanging, and that is the one thing on this page worth colouring.
 */
import type { RequestStatus } from "@prisma/client";

type RequestStatusMeta = {
  label: string;
  /** What this stage means, in a roofer's words. */
  description: string;
  badge: string;
};

export const REQUEST_STATUS_META: Record<RequestStatus, RequestStatusMeta> = {
  NEW: {
    label: "New",
    description: "Nobody has answered this yet.",
    badge: "text-ink-secondary bg-surface-lifted",
  },
  ASSESSING: {
    label: "Looking at it",
    description: "Someone is going out to see it, or has.",
    badge: "text-ink-secondary bg-surface-lifted",
  },
  CONVERTED: {
    label: "Became a job",
    description: "This turned into work.",
    badge: "text-confirm-fg bg-confirm/10",
  },
  CLOSED: {
    label: "Closed",
    description: "Not going ahead.",
    badge: "text-ink-muted bg-surface-lifted",
  },
};

/** The two states that are still somebody's problem. */
export const OPEN_REQUEST_STATUSES: RequestStatus[] = ["NEW", "ASSESSING"];

export function isOpenRequest(status: RequestStatus): boolean {
  return OPEN_REQUEST_STATUSES.includes(status);
}

export type RequestFilter = "OPEN" | "NEW" | "ASSESSING" | "CONVERTED" | "CLOSED";

export const REQUEST_FILTERS: { value: RequestFilter; label: string }[] = [
  { value: "OPEN", label: "Still open" },
  { value: "NEW", label: "New" },
  { value: "ASSESSING", label: "Looking at it" },
  { value: "CONVERTED", label: "Became a job" },
  { value: "CLOSED", label: "Closed" },
];

export function matchesRequestFilter(status: RequestStatus, filter: RequestFilter): boolean {
  if (filter === "OPEN") return isOpenRequest(status);
  return status === filter;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * When an unanswered request has been sitting long enough to be a problem.
 *
 * Three days, and only while it is still open — a converted request that took
 * a fortnight is not late, it is finished. The threshold is deliberately
 * generous: amber means *something is wrong*, and a request from yesterday
 * that nobody has touched is not wrong, it is Tuesday.
 */
export function isOverdue(
  status: RequestStatus,
  requestedAt: string | Date,
  now: Date = new Date()
): boolean {
  if (!isOpenRequest(status)) return false;
  return now.getTime() - new Date(requestedAt).getTime() > 3 * DAY;
}
