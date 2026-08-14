import { notFound } from "next/navigation";
import { ChangeOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { isWellFormedShareToken } from "@/lib/share-token";
import { markChangeOrderViewed } from "@/app/(public)/co/[token]/actions";
import { DocumentBrand } from "@/components/public/document-brand";
import { ChangeOrderApproval } from "@/components/public/change-order-approval";

/**
 * The change order, as the homeowner receives it.
 *
 * Same `paper-*` document doctrine as `/q/[token]` and `/i/[token]` — this
 * gets printed, forwarded, compared. Deliberately lighter than the quote
 * page: no optional-extras decision, no tax/discount breakdown (§14.2 has
 * none of those), just what's changing and what it adds to the contract.
 */
export default async function PublicChangeOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isWellFormedShareToken(token)) notFound();

  const changeOrder = await prisma.changeOrder.findFirst({
    where: { shareToken: token },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      company: true,
      quote: { select: { title: true, quoteNumber: true } },
    },
  });

  if (!changeOrder) notFound();

  await markChangeOrderViewed(token);

  const answered =
    changeOrder.status === ChangeOrderStatus.APPROVED
      ? { label: "You approved this", tone: "confirm" as const }
      : null;

  return (
    <main className="min-h-screen bg-paper px-4 py-8 text-paper-ink-body sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <article className="min-w-0 rounded-2xl border border-paper-rule bg-paper-document p-6 sm:p-10">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <DocumentBrand name={changeOrder.company.name} logoUrl={changeOrder.company.logoUrl} />
              {changeOrder.company.phone ? (
                <p className="mt-0.5 text-sm text-paper-ink-muted">{changeOrder.company.phone}</p>
              ) : null}
            </div>
            {answered ? (
              <span className="shrink-0 rounded-full bg-confirm/15 px-3 py-1 text-xs font-medium text-confirm-fg">
                {answered.label}
              </span>
            ) : null}
          </header>

          <p className="mt-8 text-xs font-medium uppercase tracking-wide text-paper-ink-faint">
            Change order
            {changeOrder.quote.quoteNumber ? ` · amends Quote #${changeOrder.quote.quoteNumber}` : ""}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-paper-ink">{changeOrder.title}</h1>

          {changeOrder.description ? (
            <p className="mt-4 max-w-prose text-sm leading-6 text-paper-ink-body">
              {changeOrder.description}
            </p>
          ) : null}

          {changeOrder.lineItems.length > 0 ? (
            <section className="mt-8 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-paper-rule">
                    <th scope="col" className="pb-2 font-semibold text-paper-ink">
                      What&rsquo;s changing
                    </th>
                    <th scope="col" className="pb-2 pl-4 text-right font-semibold text-paper-ink">
                      Qty
                    </th>
                    <th scope="col" className="pb-2 pl-4 text-right font-semibold text-paper-ink">
                      Each
                    </th>
                    <th scope="col" className="pb-2 pl-4 text-right font-semibold text-paper-ink">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {changeOrder.lineItems.map((line) => (
                    <tr key={line.id} className="border-b border-paper align-top">
                      <td className="py-4 pr-4">
                        <p className="font-medium text-paper-ink-strong">{line.name}</p>
                        {line.description ? (
                          <p className="mt-1.5 max-w-prose text-sm leading-6 text-paper-ink-muted">
                            {line.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-4 pl-4 text-right tabular-nums text-paper-ink-body">
                        {line.quantity} {line.unit}
                      </td>
                      <td className="py-4 pl-4 text-right tabular-nums text-paper-ink-body">
                        {formatMoney(line.unitPriceCents)}
                      </td>
                      <td className="py-4 pl-4 text-right font-medium tabular-nums text-paper-ink-strong">
                        {formatMoney(line.amountCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          <section className="mt-8 flex justify-end">
            <div className="flex items-baseline justify-between gap-4 border-t border-paper-rule-strong pt-3">
              <p className="font-medium text-paper-ink">Adds to your contract</p>
              <p className="text-lg font-semibold tabular-nums text-paper-ink">
                {formatMoney(changeOrder.amountCents)}
              </p>
            </div>
          </section>

          <ChangeOrderApproval token={token} status={changeOrder.status} />
        </article>
      </div>
    </main>
  );
}
