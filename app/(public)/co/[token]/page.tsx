import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChangeOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { isWellFormedShareToken } from "@/lib/share-token";
import { markChangeOrderViewed } from "@/app/(public)/co/[token]/actions";
import { DocumentBrand } from "@/components/public/document-brand";
import { DocumentSurface, DocumentHeader, DocumentRule } from "@/components/ui/document";
import { ChangeOrderApproval } from "@/components/public/change-order-approval";

// The group layout says "Your quote" — the wrong tab title for a change
// order. Same fix already applied to the invoice/warranty/hub/request pages;
// this route was the one still missing it.
export const metadata: Metadata = {
  title: "Your change order",
  description: "A change order from your contractor",
  robots: { index: false, follow: false },
};

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
    <div className="min-h-screen bg-paper px-4 py-8 text-paper-ink-body sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <DocumentSurface>
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

          <div className="mt-8">
            <DocumentHeader
              eyebrow={
                changeOrder.quote.quoteNumber
                  ? `Change order · amends Quote #${changeOrder.quote.quoteNumber}`
                  : "Change order"
              }
              title={changeOrder.title}
            />
          </div>

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
            <div className="w-full max-w-xs">
              <DocumentRule strong />
              <div className="pt-3">
                <p className="flex items-baseline justify-between gap-4">
                  <span className="font-medium text-paper-ink">Adds to your contract</span>
                  <span className="text-lg font-semibold tabular-nums text-paper-ink">
                    {formatMoney(changeOrder.amountCents)}
                  </span>
                </p>
              </div>
            </div>
          </section>

          <ChangeOrderApproval token={token} status={changeOrder.status} />
        </DocumentSurface>
      </div>
    </div>
  );
}
