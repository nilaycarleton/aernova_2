/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §7.6/§25 Phase 4 — the pre-construction
 * checklist, kept pure: same "required to advance, not required to exist"
 * doctrine `jobGaps()`/`invoiceSendGaps()`/`qualityCheckCompletionGaps()`
 * already use. Not a new `JobStatus` — this is a checklist/gap layer that
 * sits between "quote approved" and "ready to schedule," read by the job
 * page and, informationally, near the scheduling UI. See
 * `WORKFLOW_PHASE_4_IMPLEMENTATION.md` for why this gate is warning-only
 * (Assumption 2: pre-construction gates stay soft/overridable by default) —
 * nothing here throws, and nothing in `bookVisitAction` or
 * `updateJobStatusAction` reads it.
 */
export type PreConstructionGap = {
  id: "quote" | "scope" | "materials" | "permits" | "crew" | "startDate";
  /** What is missing, as a thing to do. */
  need: string;
};

export type PreConstructionFacts = {
  /** An approved Quote exists for this job. */
  hasApprovedQuote: boolean;
  /** The approved quote has line items or a written scope of work. */
  hasScope: boolean;
  materialsConfirmed: boolean;
  permitsChecked: boolean;
  crewReady: boolean;
  startDateConfirmed: boolean;
};

/** No row yet reads the same as every office-controlled field false — a job never reviewed has every gap open. */
export function preConstructionGaps(facts: PreConstructionFacts): PreConstructionGap[] {
  const gaps: PreConstructionGap[] = [];

  if (!facts.hasApprovedQuote) {
    gaps.push({ id: "quote", need: "An approved contract or quote" });
  }
  if (!facts.hasScope) {
    gaps.push({ id: "scope", need: "A documented scope of work on the quote" });
  }
  if (!facts.materialsConfirmed) {
    gaps.push({ id: "materials", need: "Confirm materials are ready, or note they're not needed" });
  }
  if (!facts.permitsChecked) {
    gaps.push({ id: "permits", need: "Check permit requirements, or note none are needed" });
  }
  if (!facts.crewReady) {
    gaps.push({ id: "crew", need: "Confirm a crew is ready for this job" });
  }
  if (!facts.startDateConfirmed) {
    gaps.push({ id: "startDate", need: "Confirm a start date with the client" });
  }

  return gaps;
}

/**
 * The message the checklist panel (and the note above the scheduling panel)
 * shows when gaps remain. Named items, same reasoning as
 * `qualityCheckGateMessage` — a business owner reads it and knows exactly
 * what to go do. Unlike that gate, nothing calls this to block an action;
 * it is display copy only.
 */
export function preConstructionGateMessage(gaps: PreConstructionGap[]): string {
  const items = gaps.map((gap) => gap.need);
  return `Not yet ready to schedule — still need: ${items.join(", ")}.`;
}
