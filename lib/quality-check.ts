/**
 * The completion gate, kept pure — same "required to advance, not required
 * to exist" doctrine `jobGaps()`/`invoiceSendGaps()` already use. §20/§14.3:
 * a job cannot reach `JobStatus.COMPLETED` until the office-side half of its
 * `QualityCheck` is done. Crew's field evidence is never part of this check —
 * it's visible to office, but it doesn't gate anything by itself.
 */
export type QualityCheckGap = {
  id: "scope" | "deficiencies" | "walkthrough";
  /** What is missing, as a thing to do. */
  need: string;
};

export type QualityCheckCompletionFacts = {
  scopeCompleted: boolean;
  deficienciesResolved: boolean;
  walkthroughCompleted: boolean;
};

/** No row yet reads the same as every field false — a job that's never had a quality check started has every gap open. */
export function qualityCheckCompletionGaps(
  facts: QualityCheckCompletionFacts | null | undefined
): QualityCheckGap[] {
  const gaps: QualityCheckGap[] = [];

  if (!facts?.scopeCompleted) {
    gaps.push({ id: "scope", need: "Confirm the scope of work is done" });
  }
  if (!facts?.deficienciesResolved) {
    gaps.push({ id: "deficiencies", need: "Confirm any deficiencies are resolved" });
  }
  if (!facts?.walkthroughCompleted) {
    gaps.push({ id: "walkthrough", need: "Complete the final walkthrough" });
  }

  return gaps;
}

/**
 * The message `updateJobStatusAction` throws when the gate is blocked —
 * one place, so the stepper's error text and any other caller read the same
 * words. Named items, not a generic "quality check incomplete": the whole
 * point of the gate explaining itself is that a business owner reads it and
 * knows exactly what to go do.
 */
export function qualityCheckGateMessage(gaps: QualityCheckGap[]): string {
  const items = gaps.map((gap) => gap.need.replace(/^Confirm /, "").replace(/^Complete /, ""));
  return `Finish the quality check first — still need: ${items.join(", ")}.`;
}
