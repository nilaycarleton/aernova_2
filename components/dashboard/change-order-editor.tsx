"use client";

import { useActionState, useState } from "react";
import { saveChangeOrderAction, type SaveChangeOrderState } from "@/app/(dashboard)/jobs/[jobId]/change-orders/[changeOrderId]/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { formatMoney } from "@/lib/money";
import { changeOrderLineTotalCents, changeOrderTotalCents } from "@/lib/change-order";

export type ChangeOrderDraftLine = {
  id?: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unitCostCents: number | null;
  unitPriceCents: number;
};

let nextDraftId = 0;

/**
 * The line-item editor, priced the same way `QuoteBuilder`'s own rows are —
 * quantity × unit price, recomputed on every keystroke for the on-screen
 * total, and again server-side on Save (the number this component shows is
 * never trusted; see `saveChangeOrderAction`). Deliberately smaller than the
 * quote builder: no service catalog picker, no optional/upsell flag, no
 * photo — a change order is a short, specific scope addition, not a
 * re-composition of the whole job.
 */
export function ChangeOrderEditor({
  jobId,
  changeOrderId,
  editable,
  initialTitle,
  initialDescription,
  initialLines,
}: {
  jobId: string;
  changeOrderId: string;
  editable: boolean;
  initialTitle: string;
  initialDescription: string;
  initialLines: ChangeOrderDraftLine[];
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [lines, setLines] = useState<ChangeOrderDraftLine[]>(initialLines);
  const [state, formAction] = useActionState<SaveChangeOrderState, FormData>(saveChangeOrderAction, {});

  const total = changeOrderTotalCents(lines);

  function updateLine(index: number, patch: Partial<ChangeOrderDraftLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        id: `draft-${nextDraftId++}`,
        name: "",
        description: null,
        quantity: 1,
        unit: "each",
        unitCostCents: null,
        unitPriceCents: 0,
      },
    ]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form action={formAction} className="rounded-lg border border-hairline bg-surface-raised p-6">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="changeOrderId" value={changeOrderId} />
      {/* Draft ids (`draft-N`) are never sent as a real id — only rows the
          server already knows about should be treated as updates. */}
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(
          lines.map((line) => ({ ...line, id: line.id?.startsWith("draft-") ? undefined : line.id }))
        )}
      />

      <div>
        <label htmlFor="co-title" className="mb-1.5 block text-xs font-medium text-ink-secondary">
          Title
        </label>
        <input
          id="co-title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!editable}
          required
          className="w-full rounded-md border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue disabled:opacity-60"
        />
      </div>

      <div className="mt-4">
        <label htmlFor="co-description" className="mb-1.5 block text-xs font-medium text-ink-secondary">
          What&rsquo;s changing (optional)
        </label>
        <textarea
          id="co-description"
          name="description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!editable}
          className="w-full rounded-md border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition focus:border-signal-blue disabled:opacity-60"
        />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-ink-muted">
              <th scope="col" className="pb-2 font-medium">Item</th>
              <th scope="col" className="pb-2 pl-3 font-medium">Qty</th>
              <th scope="col" className="pb-2 pl-3 font-medium">Unit</th>
              <th scope="col" className="pb-2 pl-3 font-medium">Price</th>
              <th scope="col" className="pb-2 pl-3 text-right font-medium">Amount</th>
              <th scope="col" className="pb-2 pl-3" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.id ?? index} className="border-b border-hairline align-top">
                <td className="py-2 pr-2">
                  <input
                    value={line.name}
                    onChange={(e) => updateLine(index, { name: e.target.value })}
                    disabled={!editable}
                    placeholder="What's being added"
                    className="w-full rounded-lg border border-hairline bg-ground/50 px-2 py-1.5 text-sm text-ink-primary outline-none focus:border-signal-blue disabled:opacity-60"
                  />
                </td>
                <td className="py-2 pl-3">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                    disabled={!editable}
                    className="w-20 rounded-lg border border-hairline bg-ground/50 px-2 py-1.5 text-sm text-ink-primary outline-none focus:border-signal-blue disabled:opacity-60"
                  />
                </td>
                <td className="py-2 pl-3">
                  <input
                    value={line.unit}
                    onChange={(e) => updateLine(index, { unit: e.target.value })}
                    disabled={!editable}
                    className="w-20 rounded-lg border border-hairline bg-ground/50 px-2 py-1.5 text-sm text-ink-primary outline-none focus:border-signal-blue disabled:opacity-60"
                  />
                </td>
                <td className="py-2 pl-3">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unitPriceCents / 100}
                    onChange={(e) =>
                      updateLine(index, { unitPriceCents: Math.round(Number(e.target.value) * 100) })
                    }
                    disabled={!editable}
                    className="w-24 rounded-lg border border-hairline bg-ground/50 px-2 py-1.5 text-sm text-ink-primary outline-none focus:border-signal-blue disabled:opacity-60"
                  />
                </td>
                <td className="py-2 pl-3 text-right tabular-nums text-ink-primary">
                  {formatMoney(changeOrderLineTotalCents(line))}
                </td>
                <td className="py-2 pl-3 text-right">
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-xs text-ink-muted underline underline-offset-4 transition hover:text-danger-fg"
                    >
                      Remove
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {editable ? (
          <button
            type="button"
            onClick={addLine}
            className="mt-3 text-sm text-ink-secondary underline underline-offset-4 transition hover:text-ink-primary"
          >
            + Add a line
          </button>
        ) : null}
      </div>

      <div className="mt-6 flex items-baseline justify-between border-t border-hairline pt-4">
        <p className="text-sm font-medium text-ink-secondary">Adds to the contract</p>
        <p className="text-lg font-semibold tabular-nums text-ink-primary">{formatMoney(total)}</p>
      </div>

      {state.error ? <p className="mt-3 text-sm text-danger-fg">{state.error}</p> : null}

      {editable ? (
        <SubmitButton
          pendingText="Saving…"
          className="mt-4 rounded-md bg-action px-5 py-2.5 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60"
        >
          {state.savedAt ? "Saved" : "Save"}
        </SubmitButton>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">
          This change order has been approved and can&rsquo;t be edited.
        </p>
      )}
    </form>
  );
}
