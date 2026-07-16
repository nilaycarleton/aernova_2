import { Proposal } from "@prisma/client";
import type { CostTotals, LineItem } from "@/lib/report-generator";

type ParsedScope = {
  plainTextScope?: string;
  notes?: string;
  customLineItems?: string[];
  lineItems?: LineItem[];
  totals?: CostTotals;
  acceptance?: { name?: string; date?: string } | null;
};

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span>${value.toLocaleString()}</span>
    </div>
  );
}

function parse(proposal: Proposal | null): ParsedScope {
  if (!proposal?.scopeOfWork) return {};
  try {
    return JSON.parse(proposal.scopeOfWork) as ParsedScope;
  } catch {
    return { plainTextScope: proposal.scopeOfWork };
  }
}

export function ProposalPreview({
  companyName,
  proposal,
}: {
  companyName: string;
  proposal: Proposal | null;
}) {
  if (!proposal) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Client-ready preview</p>
        <p className="mt-3 text-sm text-slate-400">
          Save a proposal draft to see the client-facing version here.
        </p>
      </section>
    );
  }

  const scope = parse(proposal);
  const lineItems = scope.lineItems ?? [];
  const totals = scope.totals ?? null;
  const legacyLineItems = scope.customLineItems ?? [];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Client-ready preview</p>
      <h3 className="mt-2 text-lg font-semibold text-white">How the client sees this proposal</h3>

      {/* Light "document" surface so it reads like the printed proposal. */}
      <article className="mt-5 rounded-2xl bg-white p-8 text-slate-800 shadow-xl">
        <header className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-lg font-bold text-slate-900">{companyName}</p>
            <p className="text-sm text-slate-500">Roofing proposal</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {proposal.status}
          </span>
        </header>

        <div className="mt-5 flex items-baseline justify-between">
          <h4 className="text-xl font-semibold text-slate-900">{proposal.title}</h4>
          {typeof proposal.totalAmount === "number" && (
            <p className="text-2xl font-bold text-slate-900">
              ${proposal.totalAmount.toLocaleString()}
            </p>
          )}
        </div>

        {scope.plainTextScope && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scope of work</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
              {scope.plainTextScope}
            </p>
          </div>
        )}

        {lineItems.length > 0 ? (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimate</p>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 font-medium">Item</th>
                  <th className="py-2 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Unit price</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.map((li, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-2 text-slate-700">{li.description}</td>
                    <td className="py-2 text-right tabular-nums text-slate-600">
                      {li.quantity.toLocaleString()} {li.unit}
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-600">${li.unitCost.toLocaleString()}</td>
                    <td className="py-2 text-right font-medium tabular-nums text-slate-800">${li.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totals && (
              <div className="mt-3 ml-auto w-full max-w-[16rem] space-y-1 text-sm tabular-nums">
                <TotalRow label="Subtotal" value={totals.subtotal} />
                <TotalRow label={`Overhead & profit (${totals.markupPercent}%)`} value={totals.markupAmount} />
                <TotalRow label={`Tax (${totals.taxPercent}%)`} value={totals.taxAmount} />
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold text-slate-900">
                  <span>Total</span>
                  <span>${totals.total.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        ) : legacyLineItems.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Line items</p>
            <ul className="mt-2 divide-y divide-slate-100 border-y border-slate-100">
              {legacyLineItems.map((item, i) => (
                <li key={i} className="py-2 text-sm text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {scope.notes && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{scope.notes}</p>
          </div>
        )}

        <footer className="mt-8 border-t border-slate-200 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Acceptance
          </p>
          {scope.acceptance?.name ? (
            <p className="mt-2 text-sm text-slate-700">
              Accepted by <span className="font-semibold">{scope.acceptance.name}</span>
              {scope.acceptance.date ? ` on ${scope.acceptance.date}` : ""}
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-10">
              <div className="min-w-[180px] border-b border-slate-400 pb-1 text-xs text-slate-500">
                Client signature
              </div>
              <div className="min-w-[120px] border-b border-slate-400 pb-1 text-xs text-slate-500">
                Date
              </div>
            </div>
          )}
        </footer>
      </article>
    </section>
  );
}
