import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatAddress } from "@/lib/client-matching";
import { jobAddress, jobClient, jobIdentityInclude } from "@/lib/job-identity";
import { formatMoney, microsToPercent } from "@/lib/money";
import { isWellFormedShareToken } from "@/lib/share-token";
import { markQuoteViewed } from "@/app/(public)/q/[token]/actions";
import {
  QuoteDecisionProvider,
  type DecisionOptions,
} from "@/components/public/quote-decision";
import { QuoteExtras } from "@/components/public/quote-extras";
import { QuoteTotals } from "@/components/public/quote-totals";
import { APPROVE_FORM_ID, QuoteResponse } from "@/components/public/quote-response";

/**
 * The quote, as the homeowner receives it.
 *
 * A document, not a screen — so it is built from the `paper-*` tokens, which
 * never flip with the app theme. This is the thing that gets printed, forwarded
 * to a spouse, and compared against two other contractors' quotes on a kitchen
 * table. It reads as a piece of paper on purpose.
 *
 * Nothing on this page knows who is looking. The token in the URL is the only
 * credential, and every figure is recomputed here from the stored rows rather
 * than read off a cached total, so what they see and what they will be invoiced
 * come from the same arithmetic.
 */
export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isWellFormedShareToken(token)) notFound();

  const quote = await prisma.quote.findFirst({
    where: { shareToken: token },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      taxRate: true,
      company: true,
      job: { include: jobIdentityInclude },
    },
  });

  if (!quote) notFound();

  await markQuoteViewed(token);

  // Handed to the client island rather than summed here: the total has to move
  // when they tick an extra, and it must move by running the same function the
  // server runs when they approve. Cost, markup and margin are not in this
  // payload and never will be.
  const totalsOptions: DecisionOptions = {
    discount:
      quote.discountKind === "PERCENT"
        ? { kind: "PERCENT", micros: quote.discountPercentMicros ?? 0 }
        : quote.discountKind === "AMOUNT"
          ? { kind: "AMOUNT", cents: quote.discountCents ?? 0 }
          : null,
    taxRateMicros: quote.taxRate?.rateMicros ?? null,
    deposit:
      quote.depositKind === "PERCENT"
        ? { kind: "PERCENT", micros: quote.depositPercentMicros ?? 0 }
        : quote.depositKind === "AMOUNT"
          ? { kind: "AMOUNT", cents: quote.depositCents ?? 0 }
          : null,
  };

  const decisionLines = quote.lineItems.map((line) => ({
    id: line.id,
    kind: line.kind,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    isOptional: line.isOptional,
  }));

  const client = jobClient(quote.job);
  const address = formatAddress(jobAddress(quote.job));
  const required = quote.lineItems.filter((line) => !line.isOptional);
  const optional = quote.lineItems.filter((line) => line.isOptional);

  // Deliberately not "DRAFT / SENT / VIEWED". A homeowner does not need to know
  // the contractor opened this in a builder; they need to know whether the ball
  // is in their court.
  const answered =
    quote.status === "APPROVED"
      ? { label: "You approved this", tone: "confirm" as const }
      : quote.status === "CHANGES_REQUESTED"
        ? { label: "Changes requested", tone: "caution" as const }
        : null;

  return (
    <QuoteDecisionProvider
      lines={decisionLines}
      options={totalsOptions}
      initialSelected={optional.filter((line) => line.clientSelected).map((line) => line.id)}
      // Once they have answered, the document stops being a form. Letting
      // someone re-tick an extra after approving would silently change a total
      // the contractor has already gone and scheduled work against.
      locked={answered !== null}
    >
    <main className="min-h-screen bg-paper px-4 py-8 text-paper-ink-body sm:px-6 sm:py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <article className="min-w-0 rounded-2xl border border-paper-rule bg-paper-document p-6 sm:p-10">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              {/* The contractor's name, never ours. A homeowner is doing
                  business with the roofer; Aernova is not a party to it. */}
              <p className="text-lg font-semibold text-paper-ink">{quote.company.name}</p>
              {quote.company.phone ? (
                <p className="mt-0.5 text-sm text-paper-ink-muted">{quote.company.phone}</p>
              ) : null}
            </div>
            {answered ? (
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  answered.tone === "confirm"
                    ? "bg-confirm/15 text-confirm-fg"
                    : "bg-caution/15 text-caution-fg"
                }`}
              >
                {answered.label}
              </span>
            ) : null}
          </header>

          <h1 className="mt-8 text-2xl font-semibold text-paper-ink">{quote.title}</h1>

          <div className="mt-6 grid gap-6 border-y border-paper-rule py-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-paper-ink-faint">
                Prepared for
              </p>
              <p className="mt-1.5 font-medium text-paper-ink-strong">{client.name}</p>
              {address ? <p className="text-sm text-paper-ink-muted">{address}</p> : null}
            </div>
            <div className="sm:text-right">
              {quote.quoteNumber ? (
                <p className="text-sm text-paper-ink-muted">Quote #{quote.quoteNumber}</p>
              ) : null}
              {quote.sentAt ? (
                <p className="text-sm text-paper-ink-muted">
                  Sent {quote.sentAt.toLocaleDateString("en-CA", { dateStyle: "medium" })}
                </p>
              ) : null}
            </div>
          </div>

          {quote.introBody || quote.introTitle ? (
            <section className="mt-8">
              {quote.introTitle ? (
                <h2 className="font-semibold text-paper-ink-strong">{quote.introTitle}</h2>
              ) : null}
              {quote.introBody ? (
                <p className="mt-2 max-w-prose text-sm leading-6 text-paper-ink-body">
                  {quote.introBody}
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="mt-8">
            <LineTable
              lines={required}
              showQuantities={quote.showQuantities}
              showUnitPrices={quote.showUnitPrices}
              showLineItemTotals={quote.showLineItemTotals}
            />
          </section>

          {/* Below the price, never mixed into it. An extra a homeowner has not
              ticked must not sit in the number they are comparing against
              somebody else's quote. */}
          {optional.length > 0 ? (
            <QuoteExtras
              formId={APPROVE_FORM_ID}
              showQuantities={quote.showQuantities}
              showUnitPrices={quote.showUnitPrices}
              lines={optional.map((line) => ({
                id: line.id,
                name: line.name,
                description: line.description,
                imageUrl: line.imageUrl,
                quantity: line.quantity,
                unit: line.unit,
                unitPriceCents: line.unitPriceCents,
                amountCents: line.amountCents,
              }))}
            />
          ) : null}

          <section className="mt-8 flex justify-end">
            <QuoteTotals
              showTotals={quote.showTotals}
              taxLabel={
                quote.taxRate
                  ? `${quote.taxRate.name} (${microsToPercent(quote.taxRate.rateMicros)}%)`
                  : null
              }
            />
          </section>

          {quote.clientMessage ? (
            <p className="mt-8 max-w-prose text-sm leading-6 text-paper-ink-body">
              {quote.clientMessage}
            </p>
          ) : null}

          {quote.contractText ? (
            <section className="mt-8 border-t border-paper-rule pt-6">
              <p className="max-w-prose whitespace-pre-line text-xs leading-6 text-paper-ink-muted">
                {quote.contractText}
              </p>
            </section>
          ) : null}
        </article>

        <QuoteResponse token={token} status={quote.status} clientName={client.name} />
      </div>
    </main>
    </QuoteDecisionProvider>
  );
}

type PublicLine = {
  id: string;
  kind: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  amountCents: number;
};

function LineTable({
  lines,
  showQuantities,
  showUnitPrices,
  showLineItemTotals,
}: {
  lines: PublicLine[];
  showQuantities: boolean;
  showUnitPrices: boolean;
  showLineItemTotals: boolean;
}) {
  if (lines.length === 0) return null;

  return (
    /* Scrolls inside its own box rather than pushing the page sideways. A
       homeowner reading this on a phone must never get a horizontal scrollbar
       on the whole document. */
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-paper-rule">
            <th scope="col" className="pb-2 font-semibold text-paper-ink">
              What we&rsquo;ll do
            </th>
            {showQuantities ? (
              <th scope="col" className="pb-2 pl-4 text-right font-semibold text-paper-ink">
                Qty
              </th>
            ) : null}
            {showUnitPrices ? (
              <th scope="col" className="pb-2 pl-4 text-right font-semibold text-paper-ink">
                Each
              </th>
            ) : null}
            {showLineItemTotals ? (
              <th scope="col" className="pb-2 pl-4 text-right font-semibold text-paper-ink">
                Total
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) =>
            line.kind === "TEXT" ? (
              <tr key={line.id}>
                <td
                  colSpan={4}
                  className="border-b border-paper py-4 text-sm leading-6 text-paper-ink-body"
                >
                  {line.description}
                </td>
              </tr>
            ) : (
              <tr key={line.id} className="border-b border-paper align-top">
                <td className="py-4 pr-4">
                  <div className="flex items-start gap-3">
                    {/* The picture sits with the row it belongs to, at a size
                        that shows the material without turning a quote into a
                        gallery. It is the first thing a homeowner points at
                        when they show the quote to somebody else. */}
                    {line.imageUrl ? (
                      <img
                        src={line.imageUrl}
                        alt={line.name}
                        loading="lazy"
                        decoding="async"
                        className="size-16 shrink-0 rounded-lg border border-paper-rule object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-medium text-paper-ink-strong">{line.name}</p>
                      {line.description ? (
                        <p className="mt-1.5 max-w-prose text-sm leading-6 text-paper-ink-muted">
                          {line.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                {showQuantities ? (
                  <td className="py-4 pl-4 text-right tabular-nums text-paper-ink-body">
                    {line.quantity}
                  </td>
                ) : null}
                {showUnitPrices ? (
                  <td className="py-4 pl-4 text-right tabular-nums text-paper-ink-body">
                    {formatMoney(line.unitPriceCents)}
                  </td>
                ) : null}
                {showLineItemTotals ? (
                  <td className="py-4 pl-4 text-right font-medium tabular-nums text-paper-ink-strong">
                    {formatMoney(line.amountCents)}
                  </td>
                ) : null}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
