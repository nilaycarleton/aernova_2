/**
 * docs/AERNOVA_PROJECT_WORKFLOW/AERNOVA_PROJECT_WORKFLOW.md §7.8/§12/§14.5/§22/§25 Phase 9 — progress
 * tracking, kept pure and optional by construction: nothing here is ever
 * required, and this file is read by the job page and `/today`, never by
 * anything that gates a workflow. Same doctrine as `lib/pipeline.ts`'s
 * `stageForJob()` — rows in, a display shape out, no database in sight.
 *
 * **Precedence, per Assumption 7's independence rule:** the office's
 * `progressPercent` is read first when set, because it's the most precise
 * signal a human deliberately typed. Failing that, the crew's
 * `progressState` — a plain read of what's happening, not a percentage.
 * Failing that, a computed visit-completion count. Setting one signal never
 * derives or clears the other; both stay in the returned shape regardless
 * of which one is primary, so a caller can still say "office says 65%,
 * crew last reported ready for quality check" in one sentence.
 */
import type { JobProgressState } from "@prisma/client";

export type ProgressSource = "officePercent" | "crewState" | "visitCompletion" | "none";

type ProgressStateMeta = { label: string };

export const PROGRESS_STATE_META: Record<JobProgressState, ProgressStateMeta> = {
  NOT_STARTED: { label: "Not started" },
  IN_PROGRESS: { label: "In progress" },
  MOSTLY_COMPLETE: { label: "Mostly complete" },
  READY_FOR_QUALITY_CHECK: { label: "Ready for quality check" },
  COMPLETED: { label: "Completed" },
};

/** The five options, in the order a crew member reads them — never a raw enum on screen. */
export const PROGRESS_STATE_OPTIONS: { value: JobProgressState; label: string }[] = (
  Object.entries(PROGRESS_STATE_META) as [JobProgressState, ProgressStateMeta][]
).map(([value, meta]) => ({ value, label: meta.label }));

export function jobProgressStateLabel(state: JobProgressState): string {
  return PROGRESS_STATE_META[state]?.label ?? "Updated";
}

export type ProgressVisitFacts = {
  /** "WORK" | "ASSESSMENT" — only work visits count toward progress; an inspection isn't the job. */
  kind: string;
  status: string;
};

export type JobProgressDisplay = {
  /** The headline: a percentage, a crew state, a visit count, or the calm empty-state sentence. */
  primaryLabel: string;
  /** One line of context for the headline. */
  secondaryDescription: string;
  /** A 0-100 figure when one is available or computable — for a bar, not a fact to act on by itself. */
  percent: number | null;
  source: ProgressSource;
  completedCount: number | null;
  totalCount: number | null;
  /**
   * The crew's own reported state, whenever one exists — populated even
   * when `source` is `"officePercent"`, since the two signals are
   * independent and both stay visible (§14.5's own "independent in v1").
   */
  crewStateLabel: string | null;
};

export function jobProgressDisplay(
  progressPercent: number | null,
  progressState: JobProgressState | null,
  visits: ProgressVisitFacts[]
): JobProgressDisplay {
  const crewStateLabel = progressState ? jobProgressStateLabel(progressState) : null;

  if (progressPercent != null) {
    return {
      primaryLabel: `${progressPercent}%`,
      secondaryDescription: crewStateLabel
        ? `Set by the office. Crew last reported: ${crewStateLabel.toLowerCase()}.`
        : "Set by the office.",
      percent: progressPercent,
      source: "officePercent",
      completedCount: null,
      totalCount: null,
      crewStateLabel,
    };
  }

  if (progressState != null) {
    return {
      primaryLabel: crewStateLabel!,
      secondaryDescription: "Reported by the crew from today's visit.",
      percent: null,
      source: "crewState",
      completedCount: null,
      totalCount: null,
      crewStateLabel,
    };
  }

  // §7.8: "already computable for any job with more than one Visit." A
  // single work visit (or none) isn't a meaningful count — see the
  // calm-empty-state fallback below, matching the same reasoning the plan
  // gives for why a large one-off project needs the manual signals at all.
  const workVisits = visits.filter((visit) => visit.kind === "WORK" && visit.status !== "CANCELLED");
  const completedCount = workVisits.filter((visit) => visit.status === "COMPLETED").length;
  const totalCount = workVisits.length;

  if (totalCount >= 2) {
    return {
      primaryLabel: `${completedCount} of ${totalCount} visits completed`,
      secondaryDescription: "Based on the work visits booked for this job.",
      percent: Math.round((completedCount / totalCount) * 100),
      source: "visitCompletion",
      completedCount,
      totalCount,
      crewStateLabel: null,
    };
  }

  return {
    primaryLabel: "No progress reported yet",
    secondaryDescription: "Optional — a crew update from /today, or a percentage set here, will show up.",
    percent: null,
    source: "none",
    completedCount: null,
    totalCount: null,
    crewStateLabel: null,
  };
}
