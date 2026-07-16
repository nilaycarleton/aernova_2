import { Proposal } from "@prisma/client";
import { saveProposalDraftAction } from "@/app/(dashboard)/projects/[projectId]/proposal-edit-actions";

type Props = {
  projectId: string;
  latestProposal: Proposal | null;
};

function parseScope(proposal: Proposal | null) {
  if (!proposal?.scopeOfWork) {
    return {
      scope: "",
      notes: "",
      customLineItems: "",
      optionalMarkup: "",
    };
  }

  try {
    const parsed = JSON.parse(proposal.scopeOfWork) as {
      plainTextScope?: string;
      notes?: string;
      customLineItems?: string[];
      optionalMarkup?: number | null;
      acceptance?: { name?: string; date?: string } | null;
    };

    return {
      scope: parsed.plainTextScope ?? proposal.scopeOfWork,
      notes: parsed.notes ?? "",
      customLineItems: parsed.customLineItems?.join("\n") ?? "",
      optionalMarkup: parsed.optionalMarkup?.toString() ?? "",
      acceptedByName: parsed.acceptance?.name ?? "",
      acceptedDate: parsed.acceptance?.date ?? "",
    };
  } catch {
    return {
      scope: proposal.scopeOfWork,
      notes: "",
      customLineItems: "",
      optionalMarkup: "",
      acceptedByName: "",
      acceptedDate: "",
    };
  }
}

export function ProposalEditor({ projectId, latestProposal }: Props) {
  const draft = parseScope(latestProposal);

  return (
    <section className="rounded-3xl border border-hairline bg-surface-raised p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-ink-muted">
            Proposal Editor
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-ink-primary">
            Editable title, scope, notes, and line items
          </h3>
        </div>
        <p className="text-sm text-ink-muted">
          Version saved on each draft update
        </p>
      </div>

      <form action={saveProposalDraftAction} className="mt-6 grid gap-4 md:grid-cols-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="proposalId" value={latestProposal?.id ?? ""} />

        <div>
          <label htmlFor="proposal-title" className="mb-2 block text-sm text-ink-secondary">Proposal title</label>
          <input
            id="proposal-title"
            name="title"
            defaultValue={latestProposal?.title ?? "Roofing proposal"}
            className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-instrument"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="proposal-totalAmount" className="mb-2 block text-sm text-ink-secondary">Total amount</label>
            <input
              id="proposal-totalAmount"
              name="totalAmount"
              type="number"
              step="0.01"
              defaultValue={latestProposal?.totalAmount ?? ""}
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-instrument"
            />
          </div>
          <div>
            <label htmlFor="proposal-optionalMarkup" className="mb-2 block text-sm text-ink-secondary">Optional markup %</label>
            <input
              id="proposal-optionalMarkup"
              name="optionalMarkup"
              type="number"
              step="0.01"
              defaultValue={draft.optionalMarkup}
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-instrument"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="proposal-scope" className="mb-2 block text-sm text-ink-secondary">Scope of work</label>
          <textarea
            id="proposal-scope"
            name="scope"
            rows={5}
            defaultValue={draft.scope}
            className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-instrument"
          />
        </div>

        <div>
          <label htmlFor="proposal-customLineItems" className="mb-2 block text-sm text-ink-secondary">Custom line items</label>
          <textarea
            id="proposal-customLineItems"
            name="customLineItems"
            rows={4}
            defaultValue={draft.customLineItems}
            placeholder="One optional line item per line"
            className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-instrument"
          />
        </div>

        <div>
          <label htmlFor="proposal-notes" className="mb-2 block text-sm text-ink-secondary">Proposal notes</label>
          <textarea
            id="proposal-notes"
            name="notes"
            rows={4}
            defaultValue={draft.notes}
            placeholder="Financing notes, exclusions, warranty terms, homeowner notes"
            className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-instrument"
          />
        </div>

        <div className="md:col-span-2 grid gap-4 rounded-2xl border border-hairline bg-ground/40 p-4 sm:grid-cols-2">
          <p className="text-sm font-medium text-ink-secondary sm:col-span-2">
            Client acceptance (signature section)
          </p>
          <div>
            <label htmlFor="proposal-acceptedByName" className="mb-2 block text-xs text-ink-muted">Accepted by (client name)</label>
            <input
              id="proposal-acceptedByName"
              name="acceptedByName"
              defaultValue={draft.acceptedByName}
              placeholder="Client name as signed"
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none placeholder:text-ink-muted focus:border-instrument"
            />
          </div>
          <div>
            <label htmlFor="proposal-acceptedDate" className="mb-2 block text-xs text-ink-muted">Date accepted</label>
            <input
              id="proposal-acceptedDate"
              name="acceptedDate"
              type="date"
              defaultValue={draft.acceptedDate}
              className="w-full rounded-xl border border-hairline bg-ground/50 px-4 py-3 text-ink-primary outline-none focus:border-instrument"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-xl bg-instrument-deep px-5 py-3 text-sm font-medium text-ground transition hover:bg-instrument"
          >
            Save Proposal Draft
          </button>
        </div>
      </form>
    </section>
  );
}
