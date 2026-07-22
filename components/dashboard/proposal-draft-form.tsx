"use client";

import { useActionState } from "react";
import {
  saveProposalDraftAction,
  type ProposalDraftState,
} from "@/app/(dashboard)/projects/[projectId]/proposal-edit-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { FieldError, FormErrorSummary, errorAttrs } from "@/components/dashboard/form-feedback";

const FIELD =
  "w-full rounded-xl border bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted";

/** Border turns rose when this field has an error. */
function cls(error?: string) {
  return `${FIELD} ${error ? "border-rose-400 focus:border-rose-300" : "border-hairline focus:border-instrument"}`;
}

/** All-primitive props so the parent can stay a server component holding Prisma data. */
export type ProposalDraftInitial = {
  projectId: string;
  proposalId: string;
  title: string;
  totalAmount: string;
  optionalMarkup: string;
  scope: string;
  customLineItems: string;
  notes: string;
  acceptedByName: string;
  acceptedDate: string;
};

export function ProposalDraftForm({ initial }: { initial: ProposalDraftInitial }) {
  const [state, formAction] = useActionState<ProposalDraftState, FormData>(saveProposalDraftAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="mt-6 grid gap-4 md:grid-cols-2">
      <input type="hidden" name="projectId" value={initial.projectId} />
      <input type="hidden" name="proposalId" value={initial.proposalId} />

      {Object.keys(errors).length > 0 ? (
        <div className="md:col-span-2">
          <FormErrorSummary count={Object.keys(errors).length} noun="proposal" />
        </div>
      ) : null}

      <div>
        <label htmlFor="proposal-title" className="mb-2 block text-sm text-ink-secondary">Proposal title</label>
        <input
          id="proposal-title"
          name="title"
          defaultValue={initial.title}
          className={cls(errors.title)}
          required
          {...errorAttrs("proposal-title", errors.title)}
        />
        <FieldError fieldId="proposal-title" message={errors.title} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="proposal-totalAmount" className="mb-2 block text-sm text-ink-secondary">Total amount</label>
          <input
            id="proposal-totalAmount"
            name="totalAmount"
            type="number"
            step="0.01"
            defaultValue={initial.totalAmount}
            className={cls(errors.totalAmount)}
            {...errorAttrs("proposal-totalAmount", errors.totalAmount)}
          />
          <FieldError fieldId="proposal-totalAmount" message={errors.totalAmount} />
        </div>
        <div>
          <label htmlFor="proposal-optionalMarkup" className="mb-2 block text-sm text-ink-secondary">Optional markup %</label>
          <input
            id="proposal-optionalMarkup"
            name="optionalMarkup"
            type="number"
            step="0.01"
            defaultValue={initial.optionalMarkup}
            className={cls(errors.optionalMarkup)}
            {...errorAttrs("proposal-optionalMarkup", errors.optionalMarkup)}
          />
          <FieldError fieldId="proposal-optionalMarkup" message={errors.optionalMarkup} />
        </div>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="proposal-scope" className="mb-2 block text-sm text-ink-secondary">Scope of work</label>
        <textarea id="proposal-scope" name="scope" rows={5} defaultValue={initial.scope} className={cls()} />
      </div>

      <div>
        <label htmlFor="proposal-customLineItems" className="mb-2 block text-sm text-ink-secondary">Custom line items</label>
        <textarea
          id="proposal-customLineItems"
          name="customLineItems"
          rows={4}
          defaultValue={initial.customLineItems}
          placeholder="One optional line item per line"
          className={cls()}
        />
      </div>

      <div>
        <label htmlFor="proposal-notes" className="mb-2 block text-sm text-ink-secondary">Proposal notes</label>
        <textarea
          id="proposal-notes"
          name="notes"
          rows={4}
          defaultValue={initial.notes}
          placeholder="Financing notes, exclusions, warranty terms, homeowner notes"
          className={cls()}
        />
      </div>

      <div className="md:col-span-2 grid gap-4 rounded-2xl border border-hairline bg-ground/40 p-4 sm:grid-cols-2">
        <p className="text-sm font-medium text-ink-secondary sm:col-span-2">Client acceptance (signature section)</p>
        <div>
          <label htmlFor="proposal-acceptedByName" className="mb-2 block text-xs text-ink-muted">Accepted by (client name)</label>
          <input
            id="proposal-acceptedByName"
            name="acceptedByName"
            defaultValue={initial.acceptedByName}
            placeholder="Client name as signed"
            className={cls()}
          />
        </div>
        <div>
          <label htmlFor="proposal-acceptedDate" className="mb-2 block text-xs text-ink-muted">Date accepted</label>
          <input id="proposal-acceptedDate" name="acceptedDate" type="date" defaultValue={initial.acceptedDate} className={cls()} />
        </div>
      </div>

      <div className="md:col-span-2">
        <SubmitButton
          pendingText="Saving..."
          className="rounded-xl bg-instrument-deep px-5 py-3 text-sm font-medium text-ground transition hover:bg-instrument disabled:opacity-40"
        >
          Save Proposal Draft
        </SubmitButton>
      </div>
    </form>
  );
}
