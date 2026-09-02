/**
 * When a lead stops being a lead.
 *
 * `Client.status` has existed since the split and nothing has ever moved it —
 * every client in the database is a LEAD, which makes the word meaningless and
 * makes a "new clients" figure count zero forever. This is the rule that gives
 * it meaning.
 *
 * The rule is *won work*, not contact. Someone who returns a call and books an
 * inspection is still a lead: they have cost you nothing and promised nothing.
 * They become a client at SCHEDULED — the point where the work is agreed and a
 * date is on it. QUOTED sits deliberately below the line, because a sent quote
 * is exactly the thing that has not been answered yet.
 *
 * It only ever promotes. A completed job archived, or a client's one scheduled
 * job pushed back to a lead, does not un-make the fact that they were a
 * customer, and a status that flickers is worse than one that is slightly
 * generous.
 *
 * Kept free of `prisma` on purpose: this is the rule, and a rule that can be
 * tested without a database gets tested. The write that applies it lives in
 * `lib/client-resolve.ts`, with the rest of the client writes. Enum imports are
 * type-only for the same reason — a value import would drag the Prisma client
 * into the test runner.
 */
import type { ClientStatus, JobStatus } from "@prisma/client";

/** Job stages that mean the work was won. */
export const WON_JOB_STATUSES: JobStatus[] = ["SCHEDULED", "IN_PROGRESS", "COMPLETED"];

export function isWonJobStatus(status: JobStatus): boolean {
  return WON_JOB_STATUSES.includes(status);
}

/**
 * Given where a client stands and a job of theirs that just moved, what their
 * status should be.
 */
export function nextClientStatus(
  current: ClientStatus,
  jobStatus: JobStatus
): ClientStatus {
  if (current === "LEAD" && isWonJobStatus(jobStatus)) return "ACTIVE";
  return current;
}
