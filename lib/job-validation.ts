/**
 * Validation for the new-job form, kept pure and separate from the server
 * action so it can be tested without auth or a database.
 *
 * Messages are the ones a roofer reads. They name the thing to do, not the rule
 * that was broken ("Add the city.", not "city is required") — PRODUCT.md asks
 * for the trade's language, and a validation message is still copy.
 *
 * **Required to advance, not required to exist.** Exactly one thing is checked
 * before a job can be saved now: who it is for. The address used to be required
 * and no longer is, because the job that most needs writing down quickly — a
 * leaking gutter described over the phone — is exactly the one whose address
 * nobody has to hand. Everything else surfaces as `jobGaps()` below, on the
 * record, where it can be read and fixed rather than argued with.
 */
export type NewJobFields = {
  name?: string | null;
  /** An existing client chosen from the typeahead. */
  clientId?: string | null;
  /** A name typed into the typeahead and confirmed as someone new. */
  clientName?: string | null;
};

export function validateNewJob(fields: NewJobFields): Record<string, string> {
  const errors: Record<string, string> = {};

  // The job name is no longer required. Jobber's form leaves Title optional and
  // falls back to "Job for <client>", and it is right: a name you have to
  // invent is a name nobody searches for later, and inventing one is the last
  // thing between a phone call and a written-down job. `jobDisplayName()`
  // supplies the fallback, so the field can stay empty and the list still reads.
  if (!fields.clientId?.trim() && !fields.clientName?.trim()) {
    errors.client = "Who is this job for? Type a name and pick them, or add them as new.";
  }

  return errors;
}

/**
 * What to call a job whose owner never named it.
 *
 * "Job for Dave Chen" is what the record is, said the way a roofer would say
 * it. Falls back again to the job number, because a client can be renamed and
 * an unnamed job still has to be findable.
 */
export function jobDisplayName(name: string | null | undefined, clientName: string, jobNumber?: number | null): string {
  const given = (name ?? "").trim();
  if (given) return given;
  const client = clientName.trim();
  if (client) return `Job for ${client}`;
  return jobNumber ? `Job #${jobNumber}` : "Untitled job";
}

/**
 * Something a job is missing, and what that costs.
 *
 * The counterpart to letting a job be saved with almost nothing on it: if the
 * front door stops asking, the record has to. Each gap names what to add and
 * what it is for — never the rule that would have blocked the save, because
 * there is no longer a rule, only work that cannot happen yet.
 *
 * Deliberately phrased against what the product does *today*. It is tempting to
 * write "add an address to schedule this", but scheduling is Phase 4 and a
 * roofer reading that would go looking for a calendar that isn't there. The
 * copy tightens to name the transition as each phase lands.
 */
export type JobGap = {
  id: "address" | "contact" | "quote";
  /** What is missing, as a thing to add. */
  need: string;
  /** Why it matters, in the present tense. */
  because: string;
};

export type JobFacts = {
  hasAddress: boolean;
  hasContact: boolean;
  hasQuote: boolean;
};

export function jobGaps(facts: JobFacts): JobGap[] {
  const gaps: JobGap[] = [];

  if (!facts.hasAddress) {
    gaps.push({
      id: "address",
      need: "An address",
      because: "Nobody can be sent to this job, and it won't show on a printed report.",
    });
  }

  if (!facts.hasContact) {
    gaps.push({
      id: "contact",
      need: "An email or phone number",
      because: "There's no way to reach this client when the quote is ready.",
    });
  }

  if (!facts.hasQuote) {
    gaps.push({
      id: "quote",
      need: "A quote",
      because: "Nothing has been priced for this job yet.",
    });
  }

  return gaps;
}
