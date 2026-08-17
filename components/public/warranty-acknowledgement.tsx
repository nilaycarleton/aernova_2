"use client";

import { useActionState } from "react";
import { confirmWarrantyAction, type ConfirmWarrantyState } from "@/app/(public)/w/[token]/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";

/**
 * §14.4/§20/§25 Phase 10 — the homeowner's one action, and it is
 * deliberately not a decision: a confirmation checkbox and a typed name,
 * nothing else. No Approve, no Request Changes, no drawn signature. This
 * confirms received/viewed only — never call it approval or acceptance
 * anywhere in this component's own copy.
 */
export function WarrantyAcknowledgement({
  token,
  confirmed,
  signerName,
}: {
  token: string;
  confirmed: boolean;
  signerName: string | null;
}) {
  const [state, formAction] = useActionState<ConfirmWarrantyState, FormData>(confirmWarrantyAction, {});

  if (confirmed) {
    return (
      <section className="mt-8 rounded-xl bg-confirm/10 px-5 py-4 text-sm text-confirm-fg">
        Confirmed received{signerName ? ` by ${signerName}` : ""}.
      </section>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-3 border-t border-paper-rule pt-6 print:hidden">
      <h2 className="text-sm font-semibold text-paper-ink">Confirm you received this</h2>
      <p className="text-sm text-paper-ink-muted">
        This only confirms you&rsquo;ve received and looked at your warranty — there&rsquo;s nothing
        to approve or sign.
      </p>
      <input type="hidden" name="token" value={token} />

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="confirmationChecked"
          required
          className="mt-0.5 h-5 w-5 shrink-0"
        />
        <span className="text-sm text-paper-ink-body">I received and looked at this warranty.</span>
      </label>

      <div>
        <label htmlFor="warranty-signer-name" className="mb-1.5 block text-xs font-medium text-paper-ink-muted">
          Your name
        </label>
        <input
          id="warranty-signer-name"
          name="signerName"
          type="text"
          required
          autoComplete="name"
          placeholder="Type your name"
          className="w-full max-w-xs rounded-xl border border-paper-rule bg-paper-inset px-3 py-2.5 text-sm text-paper-ink outline-none transition focus:border-signal-blue"
        />
      </div>

      {state.error ? <p className="text-sm text-danger-fg">{state.error}</p> : null}

      <SubmitButton
        pendingText="Confirming…"
        className="rounded-xl bg-action px-6 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active disabled:opacity-60"
      >
        Confirm
      </SubmitButton>
    </form>
  );
}
