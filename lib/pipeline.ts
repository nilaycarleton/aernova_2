/**
 * One board, over two models that don't share a status enum.
 *
 * A deal starts as a `Request` (or nothing — a job created directly skips
 * straight to being one), and once it's real it's a `Job` carrying its own
 * quote through DRAFT → sent → answered. Neither model needed to know about
 * the other's states before this; this file is the one place that decides how
 * they line up into a single ordered pipeline, kept pure and free of `prisma`
 * so the ordering rule can be tested without a database — same doctrine as
 * `lib/job-status.ts` and `lib/client-lifecycle.ts`, which this reuses for the
 * one signal it doesn't have to invent (`isWonJobStatus`).
 *
 * **Lost**, added by item 42, is one column over two different kinds of loss.
 * A quote that reaches `REJECTED` (now written by `markQuoteDeclinedAction`)
 * or lapses to `EXPIRED` carries a reason — see `lib/quote-status.ts`'s
 * `QUOTE_DECLINE_REASON_META` — and a request closed without converting does
 * not, because `Request` has no reason field to give it one. Both still
 * belong on the same column: a lead that went cold and a quote that got
 * turned down are the same fact — this deal didn't close — at two different
 * points in the funnel, and a board that only showed one of them would
 * understate how much was actually lost.
 */
import type { JobStatus, QuoteStatus, RequestStatus } from "@prisma/client";
import { isWonJobStatus } from "./client-lifecycle.ts";

export const PIPELINE_STAGES = [
  "LEAD",
  "ASSESSING",
  "DRAFT",
  "AWAITING_RESPONSE",
  "OPENED",
  "CHANGES_REQUESTED",
  "WON",
  "LOST",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

type StageMeta = { label: string; hint: string };

export const PIPELINE_STAGE_META: Record<PipelineStage, StageMeta> = {
  LEAD: { label: "Lead", hint: "Nobody has answered this yet." },
  ASSESSING: {
    label: "Assessing",
    hint: "Being looked at or measured — no quote written yet.",
  },
  DRAFT: { label: "Draft", hint: "A quote exists. Not sent." },
  AWAITING_RESPONSE: { label: "Awaiting response", hint: "Sent, and they haven't opened it yet." },
  OPENED: { label: "Opened", hint: "They've read it. No answer yet." },
  CHANGES_REQUESTED: { label: "Changes asked for", hint: "They want something different." },
  WON: { label: "Won", hint: "They said yes." },
  LOST: { label: "Lost", hint: "This one didn't close." },
};

/**
 * An open request, not yet converted. `CONVERTED` becomes a job and reads
 * through `stageForJob` instead; `CLOSED` is a lost lead and lands on `LOST`.
 */
export function stageForRequest(status: RequestStatus): PipelineStage | null {
  if (status === "NEW") return "LEAD";
  if (status === "ASSESSING") return "ASSESSING";
  if (status === "CLOSED") return "LOST";
  return null;
}

/**
 * A job, and the status of its most recent quote if it has one.
 *
 * `isWonJobStatus` (SCHEDULED or beyond) wins over the quote's own status —
 * scheduling is the more advanced fact when both are true. An `APPROVED`
 * quote is also `WON` on its own, because `markQuoteApprovedAction` moves the
 * job only as far as `QUOTED`; the sale is won the moment they say yes, not
 * the moment a visit gets booked.
 */
export function stageForJob(
  jobStatus: JobStatus,
  latestQuoteStatus: QuoteStatus | null
): PipelineStage | null {
  if (jobStatus === "ARCHIVED") return null;
  if (isWonJobStatus(jobStatus) || latestQuoteStatus === "APPROVED") return "WON";
  if (latestQuoteStatus === "REJECTED" || latestQuoteStatus === "EXPIRED") return "LOST";
  if (latestQuoteStatus === "DRAFT") return "DRAFT";
  if (latestQuoteStatus === "SENT") return "AWAITING_RESPONSE";
  if (latestQuoteStatus === "VIEWED") return "OPENED";
  if (latestQuoteStatus === "CHANGES_REQUESTED") return "CHANGES_REQUESTED";
  return "ASSESSING";
}

/**
 * The inverse of `stageForRequest` — what to write when a request card is
 * dropped on a stage. Not the identity function: `NEW` is the column's real
 * status, "Lead" is only what this board calls it out loud (see
 * `stageForRequest`'s own comment), and the same gap exists for `LOST`/
 * `CLOSED`. `null` for any stage a request card can never legitimately carry
 * (`CONVERTED` is written by `convertRequestToJobAction`, never by a drop).
 */
export function requestStatusForStage(stage: PipelineStage): RequestStatus | null {
  if (stage === "LEAD") return "NEW";
  if (stage === "ASSESSING") return "ASSESSING";
  if (stage === "LOST") return "CLOSED";
  return null;
}

/**
 * Where a card may be dropped, given what kind it is and where it sits today.
 *
 * Only transitions a real action already covers. A request moves between
 * `LEAD`/`ASSESSING`/`LOST` via `updateRequestStatusAction` (through
 * `requestStatusForStage` above). A job's quote moves `DRAFT` →
 * `AWAITING_RESPONSE` via `shareQuoteAction` — the one write that mints the
 * link — any live quote stage can drop straight onto `WON` via
 * `markQuoteApprovedAction`, because most quotes are approved on the phone,
 * not by opening a link first (see that action's own comment), and the same
 * live stages can drop onto `LOST` via `markQuoteDeclinedAction` — which,
 * unlike every other transition here, needs a reason collected first, so the
 * board opens a dialog for it rather than firing on drop (see
 * `pipeline-board.tsx`). Nothing here invents a transition without a real
 * write behind it.
 */
export function pipelineDropTargets(card: {
  kind: "request" | "job";
  stage: PipelineStage;
}): PipelineStage[] {
  if (card.kind === "request") {
    if (card.stage === "LEAD") return ["ASSESSING", "LOST"];
    if (card.stage === "ASSESSING") return ["LEAD", "LOST"];
    return [];
  }
  if (card.stage === "DRAFT") return ["AWAITING_RESPONSE", "WON", "LOST"];
  if (
    card.stage === "AWAITING_RESPONSE" ||
    card.stage === "OPENED" ||
    card.stage === "CHANGES_REQUESTED"
  ) {
    return ["WON", "LOST"];
  }
  return [];
}
