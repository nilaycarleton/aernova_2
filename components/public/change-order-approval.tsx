"use client";

import { approveChangeOrderAction } from "@/app/(public)/co/[token]/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

/**
 * The homeowner's one action on a change order — approve, with a typed
 * name as the thin evidence a person did it. No "ask for a change" door,
 * unlike `QuoteResponse`: a change order is already a specific, priced
 * scope addition, not an open document to negotiate — a homeowner who
 * wants something different calls, the same way declining one does
 * (§19.1; see `markChangeOrderDeclinedAction`).
 */
export function ChangeOrderApproval({ token, status }: { token: string; status: string }) {
  if (status === "APPROVED") {
    return (
      <p className="mt-8 rounded-xl bg-confirm/10 px-4 py-3 text-sm text-confirm-fg">
        Thanks — you approved this change. We&rsquo;ll get it scheduled.
      </p>
    );
  }

  if (status === "DECLINED") {
    return (
      <p className="mt-8 rounded-xl bg-paper-inset px-4 py-3 text-sm text-paper-ink-muted">
        This change order is no longer open.
      </p>
    );
  }

  return (
    <form action={approveChangeOrderAction} className="mt-8 border-t border-paper-rule pt-6 print:hidden">
      <input type="hidden" name="token" value={token} />
      <label htmlFor="co-approver-name" className="block text-sm font-medium text-paper-ink-strong">
        Your name
      </label>
      <input
        id="co-approver-name"
        name="name"
        type="text"
        required
        autoComplete="name"
        className="mt-2 w-full max-w-sm rounded-xl border border-paper-rule-strong bg-paper-document px-3 py-2.5 text-sm text-paper-ink outline-none transition focus:border-signal-blue"
      />
      <SubmitButton
        pendingText="Approving…"
        className="mt-3 rounded-xl bg-confirm px-5 py-3 text-sm font-semibold text-on-accent transition hover:opacity-90 disabled:opacity-60"
      >
        Approve this change
      </SubmitButton>
      <p className="mt-2 text-xs leading-5 text-paper-ink-faint">
        This adds the amount above to your contract.
      </p>
    </form>
  );
}
