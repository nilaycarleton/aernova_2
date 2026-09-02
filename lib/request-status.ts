/**
 * How an inbound ask reads on screen.
 *
 * Same doctrine as `lib/job-status.ts` and `lib/client-status.ts`: standing is
 * state, so it reads tonally. The one exception is the *waiting* figure, which
 * is not state at all — it is a measurement of how long someone has been left
 * hanging, and that is the one thing on this page worth colouring.
 */
import type { RequestStatus } from "@prisma/client";
import type { StatusTone } from "@/lib/status-tone";

type RequestStatusMeta = {
  label: string;
  /** What this stage means, in a roofer's words. */
  description: string;
};

export const REQUEST_STATUS_META: Record<RequestStatus, RequestStatusMeta> = {
  NEW: {
    label: "New",
    description: "Nobody has answered this yet.",
  },
  CONTACTED: {
    label: "Contacted / Qualified",
    description: "Someone has reached them, and it's worth pursuing.",
  },
  ASSESSING: {
    label: "Looking at it",
    description: "Someone is going out to see it, or has.",
  },
  CONVERTED: {
    label: "Became a job",
    description: "This turned into work.",
  },
  CLOSED: {
    label: "Closed",
    description: "Not going ahead.",
  },
};

/**
 * Status-consolidation adapter (Premium UI Redesign final completion pass) —
 * feeds the shared `Status` primitive instead of a hand-rolled badge pill.
 * CONVERTED is the one success state; everything else (including CLOSED,
 * previously a slightly dimmer gray) reads as an ordinary neutral state.
 */
export function requestStatusTone(status: RequestStatus): StatusTone {
  if (status === "CONVERTED") return "success";
  return "neutral";
}

/** The three states that are still somebody's problem. */
export const OPEN_REQUEST_STATUSES: RequestStatus[] = ["NEW", "CONTACTED", "ASSESSING"];

export function isOpenRequest(status: RequestStatus): boolean {
  return OPEN_REQUEST_STATUSES.includes(status);
}

export type RequestFilter = "OPEN" | "NEW" | "CONTACTED" | "ASSESSING" | "CONVERTED" | "CLOSED";

export const REQUEST_FILTERS: { value: RequestFilter; label: string }[] = [
  { value: "OPEN", label: "Still open" },
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted / Qualified" },
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
