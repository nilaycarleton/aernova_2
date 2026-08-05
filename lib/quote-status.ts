import { QuoteDeclineReason, QuoteStatus } from "@prisma/client";

/**
 * What a quote's standing is called out loud.
 *
 * The same rule `lib/job-status.ts` enforces: a database enum never reaches a
 * screen. `SENT` in particular is the wrong word for a contractor — what they
 * want to know is not that they sent it, it is that **nobody has answered**.
 * Jobber calls that "Awaiting response" and it is the better sentence.
 *
 * Where this differs from Jobber: they collapse sent and opened into one
 * status. We keep them apart because "have they even looked at it" is the
 * question asked on day three, and the answer changes what you do next —
 * unopened means chase the link, opened-and-silent means chase the price.
 */
export const QUOTE_STATUS_FLOW: QuoteStatus[] = [
  QuoteStatus.DRAFT,
  QuoteStatus.SENT,
  QuoteStatus.VIEWED,
  QuoteStatus.APPROVED,
  QuoteStatus.CHANGES_REQUESTED,
  QuoteStatus.REJECTED,
  QuoteStatus.EXPIRED,
];

/** Sent but not yet answered — the pipeline a contractor is waiting on. */
export const OUTSTANDING: QuoteStatus[] = [QuoteStatus.SENT, QuoteStatus.VIEWED];

/**
 * Deleting is only safe once nobody is actively looking at the link. `SENT`
 * and `VIEWED` mean the homeowner has (or may still have) the URL open;
 * `APPROVED` means an invoice may already exist against it. Everything else —
 * a draft nobody's seen, or an answer that already came back no — is a
 * mistake or a dead end, not a document somebody's relying on.
 */
const DELETABLE_QUOTE_STATUSES: QuoteStatus[] = [
  QuoteStatus.DRAFT,
  QuoteStatus.CHANGES_REQUESTED,
  QuoteStatus.REJECTED,
  QuoteStatus.EXPIRED,
];

export function canDeleteQuote(status: QuoteStatus): boolean {
  return DELETABLE_QUOTE_STATUSES.includes(status);
}

// Tone, not colour — status is state, and the Readout Rule keeps cyan for
// numbers. Only two statuses earn a hue, and both mean "something happened":
// one good, one needing an answer.
const NEUTRAL = "text-ink-secondary bg-surface-lifted";
const QUIET = "text-ink-muted bg-surface-lifted";

type QuoteStatusMeta = {
  label: string;
  /** What it means, in the words a roofer would use. */
  hint: string;
  badge: string;
};

export const QUOTE_STATUS_META: Record<QuoteStatus, QuoteStatusMeta> = {
  DRAFT: {
    label: "Draft",
    hint: "Not sent. Nobody has seen this but you.",
    badge: QUIET,
  },
  SENT: {
    label: "Awaiting response",
    hint: "Sent, and they haven't opened it yet.",
    badge: NEUTRAL,
  },
  VIEWED: {
    label: "Opened",
    hint: "They've read it. No answer yet.",
    badge: NEUTRAL,
  },
  APPROVED: {
    label: "Approved",
    hint: "They said yes. The job moved to quoted.",
    badge: "text-confirm-fg bg-confirm/10",
  },
  CHANGES_REQUESTED: {
    label: "Changes asked for",
    hint: "They want something different. Check the job's history.",
    badge: "text-caution-fg bg-caution/10",
  },
  REJECTED: {
    label: "Turned down",
    // "Rejected" is a word for a database, and a harsh one to read on the
    // morning after losing a job — named here so it never leaks out raw.
    // Written by `markQuoteDeclinedAction`, alongside the reason this label
    // doesn't repeat (see `QUOTE_DECLINE_REASON_META`).
    hint: "They went elsewhere. Worth a call in a year.",
    badge: QUIET,
  },
  EXPIRED: {
    label: "Expired",
    hint: "The price no longer holds. Re-quote it if they come back.",
    badge: QUIET,
  },
};

export function quoteStatusLabel(status: QuoteStatus): string {
  return QUOTE_STATUS_META[status]?.label ?? "Draft";
}

/**
 * Why a quote was turned down, in the words `markQuoteDeclinedAction` writes
 * and the win-rate view (item 42) groups by. Same closed-set reasoning as
 * `QUOTE_STATUS_META` — a reason nobody can pick from a list can't be counted
 * next quarter.
 */
export const QUOTE_DECLINE_REASON_META: Record<QuoteDeclineReason, { label: string }> = {
  PRICE: { label: "Price" },
  WENT_WITH_COMPETITOR: { label: "Went with another contractor" },
  BAD_TIMING: { label: "Bad timing" },
  NO_LONGER_NEEDED: { label: "No longer needed" },
  OTHER: { label: "Other" },
};

export function quoteDeclineReasonLabel(reason: QuoteDeclineReason): string {
  return QUOTE_DECLINE_REASON_META[reason]?.label ?? "Other";
}
