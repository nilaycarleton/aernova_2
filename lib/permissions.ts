import { CompanyRole } from "@prisma/client";

/**
 * Who can do what, in one readable matrix.
 *
 * Every other mistake in this codebase shows a roofer a wrong number. A mistake
 * here shows a crew member another client's margin, or lets somebody who was
 * hired last week delete a job. That is a different class of failure, so the
 * rules live in one pure file that can be read top to bottom and tested without
 * a database — rather than as a dozen `role === "OWNER"` checks scattered
 * across actions, which is how a permission model rots.
 *
 * **Deny by default.** `can()` answers false for anything not explicitly
 * granted below, so a capability added next year is denied to every role until
 * somebody makes a decision about it. The failure mode of forgetting is a
 * locked door, never an open one.
 */
export const CAPABILITIES = [
  /** See cost, markup, margin, quote totals — anything denominated in money. */
  "viewMoney",
  /** See every job in the company, rather than only the ones you're on. */
  "viewAllJobs",
  "editJob",
  "editQuote",
  "sendQuote",
  /** Raise an invoice, and void one. */
  "editInvoice",
  /** Open the invoice to the homeowner — mint the link, email it. */
  "sendInvoice",
  /** Write down money that arrived, and unwrite it. */
  "recordPayment",
  "deleteJob",
  /**
   * Delete a quote outright, not just decline it — restricted by status
   * elsewhere (see `lib/quote-status.ts`), but who may even try is decided
   * here, same OWNER/ADMIN tier as `deleteJob`: a permanent delete is a
   * different class of action than the edit/send capabilities estimator and
   * sales already hold.
   */
  "deleteQuote",
  /**
   * Delete an invoice outright — restricted by status elsewhere (only a
   * draft or an already-voided one; see `deleteInvoiceAction`), same tier as
   * `deleteQuote` for the same reason.
   */
  "deleteInvoice",
  /**
   * Delete a client — cascades their properties and requests, but a job
   * they're on survives with its own denormalized name/address, same as it
   * always has. Same OWNER/ADMIN tier as the other deletes.
   */
  "deleteClient",
  /** Delete a request. The lowest-stakes of the four — nothing else in the schema points at one. */
  "deleteRequest",
  /** Book, move and cancel visits for anyone. */
  "manageSchedule",
  /** Mark a visit done, upload what you did. The one thing crew write. */
  "completeVisit",
  /** Invite people, change roles, remove members. */
  "manageTeam",
  /**
   * Edit the company's own profile — legal name, logo, contact details,
   * licence/business/WCB numbers, address. Office-tier, same as
   * `editInvoice`/`sendInvoice`/`recordPayment`: this is paperwork, not the
   * bank account, so both OWNER and ADMIN get it rather than owner alone.
   */
  "manageCompany",
  /**
   * Connect the company's own Stripe account and change what happens to it.
   * Owner only, not ADMIN — every other money capability here answers "can you
   * send/collect/record", this one answers "where does it physically go", and
   * Jobber's own settings page draws the same line: admins can view Payments
   * settings, only the account owner can change the bank account behind them.
   */
  "manageBilling",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const ALL: Capability[] = [...CAPABILITIES];
const ALL_BUT_BILLING: Capability[] = CAPABILITIES.filter(
  (capability) => capability !== "manageBilling"
);

/**
 * The matrix. Written out per role rather than by inheritance: "ADMIN is
 * OWNER minus one thing" reads fine until it doesn't, and a security table you
 * have to compute in your head is a security table nobody audits.
 */
const GRANTS: Record<CompanyRole, readonly Capability[]> = {
  OWNER: ALL,
  ADMIN: ALL_BUT_BILLING,

  // Prices the work and writes the quotes. Cannot delete a job or change who
  // is on the team.
  //
  // No invoicing, and that is a deliberate line rather than an oversight.
  // Quoting is what this role is for; billing and taking payment are the
  // office's, and in the companies this is built for the office is the owner or
  // the person they trust with the bank. Deny-by-default means widening this
  // later is one line and a decision, where narrowing it after somebody has
  // been raising invoices for a year is a conversation.
  ESTIMATOR: [
    "viewMoney",
    "viewAllJobs",
    "editJob",
    "editQuote",
    "sendQuote",
    "manageSchedule",
    "completeVisit",
  ],

  // Wins the work. Same money access — you cannot discount what you cannot see
  // — but does not run the calendar, and does not invoice: selling the job and
  // collecting for it are different jobs, and the commission argument for
  // keeping them apart writes itself.
  SALES: ["viewMoney", "viewAllJobs", "editJob", "editQuote", "sendQuote"],

  // The office: reads everything, changes nothing.
  VIEWER: ["viewMoney", "viewAllJobs"],

  /**
   * Crew. Two grants, and the shape of the list is the point.
   *
   * No `viewMoney`: what a job is worth is not a fact a crew member needs to do
   * the work, and it is a fact that causes trouble on a site. No `viewAllJobs`:
   * they see the jobs they are actually on, which is also what makes the
   * scoping in `jobScopeForRole` load-bearing rather than decorative.
   */
  CREW: ["completeVisit"],
};

export function can(role: CompanyRole, capability: Capability): boolean {
  return GRANTS[role]?.includes(capability) ?? false;
}

/** Every capability a role has, for rendering a UI without guessing. */
export function capabilitiesOf(role: CompanyRole): readonly Capability[] {
  return GRANTS[role] ?? [];
}

/**
 * The `where` fragment that limits which jobs a role may see.
 *
 * Returned as data rather than applied inline so the *rule* can be tested
 * without a database, and so every query that scopes jobs is scoping them the
 * same way. A role with `viewAllJobs` adds nothing beyond the company; a role
 * without it may only reach a job it has been put on the roof for.
 */
export function jobScopeForRole(role: CompanyRole, userId: string) {
  if (can(role, "viewAllJobs")) return {};
  return {
    visits: {
      some: {
        assignments: {
          some: { userId },
        },
      },
    },
  };
}

/** Throws unless the role has the capability. For actions, not for rendering. */
export function assertCan(role: CompanyRole, capability: Capability): void {
  if (!can(role, capability)) {
    // Deliberately vague. A message naming the capability tells somebody
    // probing the app exactly which door to rattle next.
    throw new Error("You don't have access to that.");
  }
}
