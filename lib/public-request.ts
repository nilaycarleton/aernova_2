/**
 * Item 45: the two small rules behind the public request-a-quote form,
 * pulled out here so they can be tested without a database or a fake POST.
 *
 * **Why email, not the name/address matching `lib/client-resolve.ts` already
 * has.** That file's own rule is "a possible duplicate client is a question,
 * never a decision" — fuzzy name matching is shown to a person, who answers
 * it. This form has nobody in that loop: the homeowner submitting it has
 * never seen the company's client list and never should, so there is no one
 * to ask. Email equality is not fuzzy, though — two people do not share an
 * inbox — so it is the one signal strong enough to merge automatically
 * without turning into a silent guess.
 */

/** Case-insensitive, trimmed — "Dave@Acme.com " and "dave@acme.com" are one key. */
export function normalizedRequestEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** How long a second submission from the same matched client reads as the same ask, not a new one. */
export const RESUBMIT_WINDOW_MS = 10 * 60 * 1000;

/**
 * True when `lastRequestAt` is recent enough that a new submission from the
 * same (email-matched) client is almost certainly a double-click or a retry,
 * not a second, different ask. Treated as success with no second `Request`
 * row — see the action's own comment for why silence is the right answer
 * for both a confused homeowner and a naive script replaying a submission.
 */
export function isResubmit(lastRequestAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - lastRequestAt.getTime() < RESUBMIT_WINDOW_MS;
}
