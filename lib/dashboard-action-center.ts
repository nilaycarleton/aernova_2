/**
 * docs/AERNOVA_PROJECT_WORKFLOW.md §3/§11/§15/§25 Phase 12.
 *
 * One list, not three competing tiles. This is a pure derivation over
 * narrow input facts the dashboard page has already computed — zero
 * Prisma, fully unit-testable — mirroring the doctrine every prior phase's
 * display helper already follows (`lib/job-progress.ts`,
 * `lib/workflow-stages.ts`). It decides *whether* each signal is worth
 * surfacing, what it says, and what order it renders in; the page decides
 * *what the facts are*, and the component just renders whatever list this
 * returns.
 *
 * Deliberately not exhaustive: only what the plan names — overdue
 * invoices, new requests, quotes with changes requested (the one existing
 * pipeline signal with real "needs a response" meaning, unlike a raw stage
 * count), and Phase 11's disabled-stage jobs. No invented staleness
 * heuristics, no notification-severity model the app doesn't have.
 */
import { formatMoney } from "./money.ts";

export type ActionCenterPriority = "high" | "medium" | "low";
export type ActionCenterTone = "danger" | "caution" | "info" | "neutral";

export type ActionCenterItem = {
  id: string;
  priority: ActionCenterPriority;
  tone: ActionCenterTone;
  title: string;
  description?: string;
  count?: number;
  href: string;
};

export type ActionCenterFacts = {
  /** Gates both money items — a role without `viewMoney` sees neither, same as every other money surface in this app. */
  canViewMoney: boolean;
  overdueInvoiceCount: number;
  overdueInvoiceCents: number;
  newRequestCount: number;
  changesRequestedQuoteCount: number;
  disabledStageJobCount: number;
};

const PRIORITY_ORDER: Record<ActionCenterPriority, number> = { high: 0, medium: 1, low: 2 };

export function buildActionCenterItems(facts: ActionCenterFacts): ActionCenterItem[] {
  const items: ActionCenterItem[] = [];

  if (facts.canViewMoney && facts.overdueInvoiceCount > 0) {
    items.push({
      id: "overdue-invoices",
      priority: "high",
      tone: "danger",
      title: "Overdue invoices",
      description: `${formatMoney(facts.overdueInvoiceCents)} across ${facts.overdueInvoiceCount} ${
        facts.overdueInvoiceCount === 1 ? "invoice" : "invoices"
      }, past due.`,
      count: facts.overdueInvoiceCount,
      href: "/invoices?status=OVERDUE&range=all",
    });
  }

  if (facts.newRequestCount > 0) {
    items.push({
      id: "new-requests",
      priority: "medium",
      tone: "caution",
      title: "New requests",
      description: `${facts.newRequestCount} ${
        facts.newRequestCount === 1 ? "person is" : "people are"
      } waiting on a first response.`,
      count: facts.newRequestCount,
      href: "/requests",
    });
  }

  if (facts.canViewMoney && facts.changesRequestedQuoteCount > 0) {
    items.push({
      id: "changes-requested",
      priority: "medium",
      tone: "caution",
      title: "Changes requested",
      description: `${facts.changesRequestedQuoteCount} ${
        facts.changesRequestedQuoteCount === 1 ? "quote is" : "quotes are"
      } waiting on a revised price.`,
      count: facts.changesRequestedQuoteCount,
      href: "/quotes?status=CHANGES_REQUESTED&range=all",
    });
  }

  if (facts.disabledStageJobCount > 0) {
    const n = facts.disabledStageJobCount;
    items.push({
      id: "disabled-stage-jobs",
      priority: "low",
      tone: "neutral",
      title: n === 1 ? "1 job in a disabled stage" : `${n} jobs in a disabled stage`,
      // Exact copy from §15 — singular/plural, never a raw count with no verb.
      description:
        n === 1
          ? "1 job is currently in a stage disabled for future jobs."
          : `${n} jobs are currently in a stage disabled for future jobs.`,
      count: n,
      href: "/jobs?attention=disabled-workflow-stage",
    });
  }

  // Stable sort (ES2019+ guarantee) — same-priority items keep the order
  // they were pushed in above, so this never reorders for a reason nobody
  // could see between one render and the next.
  return items.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}
