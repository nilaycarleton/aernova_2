import Link from "next/link";
import { createChangeOrderAction } from "@/app/(dashboard)/jobs/[jobId]/change-order-actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { formatMoney } from "@/lib/money";

export type ChangeOrderRow = {
  id: string;
  title: string;
  status: string;
  amountCents: number;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  APPROVED: "Approved",
  DECLINED: "Declined",
};

/**
 * §19.1 — extra scope against an already-approved quote. Only rendered when
 * the job actually has one (`ChangeOrder.quoteId` is required, never
 * optional — a change order without an approved quote behind it uses
 * Additional Work instead).
 */
export function ChangeOrdersPanel({
  jobId,
  quoteId,
  changeOrders,
}: {
  jobId: string;
  quoteId: string;
  changeOrders: ChangeOrderRow[];
}) {
  const approvedCents = changeOrders
    .filter((co) => co.status === "APPROVED")
    .reduce((sum, co) => sum + co.amountCents, 0);

  return (
    <section className="rounded-lg border border-hairline bg-surface-raised p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink-primary">Change orders</h3>
          <p className="mt-1 text-sm text-ink-muted">
            {approvedCents > 0
              ? `${formatMoney(approvedCents)} approved on top of the contract.`
              : "Extra scope against the approved quote, priced and approved the same way."}
          </p>
        </div>
        <form action={createChangeOrderAction}>
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="quoteId" value={quoteId} />
          <SubmitButton
            pendingText="Creating…"
            className="shrink-0 rounded-lg border border-hairline px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted disabled:opacity-60"
          >
            New change order
          </SubmitButton>
        </form>
      </div>

      {changeOrders.length > 0 ? (
        <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
          {changeOrders.map((co) => (
            <li key={co.id} className="flex items-center justify-between gap-4 py-3 text-sm">
              <Link
                href={`/jobs/${jobId}/change-orders/${co.id}`}
                className="min-w-0 truncate text-ink-primary underline underline-offset-4 hover:text-ink-secondary"
              >
                {co.title}
              </Link>
              <span className="shrink-0 tabular-nums text-ink-muted">
                {formatMoney(co.amountCents)} · {STATUS_LABEL[co.status] ?? co.status}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
