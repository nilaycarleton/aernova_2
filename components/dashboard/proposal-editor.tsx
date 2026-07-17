import { Proposal } from "@prisma/client";
import { ProposalDraftForm } from "@/components/dashboard/proposal-draft-form";

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

      <ProposalDraftForm
        initial={{
          projectId,
          proposalId: latestProposal?.id ?? "",
          title: latestProposal?.title ?? "Roofing proposal",
          totalAmount: latestProposal?.totalAmount?.toString() ?? "",
          optionalMarkup: draft.optionalMarkup,
          scope: draft.scope,
          customLineItems: draft.customLineItems,
          notes: draft.notes,
          acceptedByName: draft.acceptedByName ?? "",
          acceptedDate: draft.acceptedDate ?? "",
        }}
      />
    </section>
  );
}
