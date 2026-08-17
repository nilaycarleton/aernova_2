"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  draftQuoteScopeAction,
  saveQuoteAction,
  type DraftScopeState,
  type SaveQuoteState,
} from "@/app/(dashboard)/jobs/[jobId]/quotes/[quoteId]/actions";
import { SubmitButton } from "@/components/dashboard/submit-button";
import {
  QuoteLineRow,
  centsOf,
  quantityOf,
  type DraftLine,
} from "@/components/dashboard/quote-line-row";
import {
  QuoteCatalogPicker,
  type CatalogService,
} from "@/components/dashboard/quote-catalog-picker";
import { formatMoney, microsToPercent, toDollars } from "@/lib/money";
import { computeTotals } from "@/lib/quote/totals";
import { EstimateSummaryPanel } from "@/components/dashboard/estimate-summary-panel";

export type BuilderQuote = {
  id: string;
  jobId: string;
  quoteNumber: number | null;
  title: string;
  status: string;
  clientName: string;
  address: string | null;
  introTitle: string | null;
  introBody: string | null;
  clientMessage: string | null;
  contractText: string | null;
  showQuantities: boolean;
  showUnitPrices: boolean;
  showLineItemTotals: boolean;
  showTotals: boolean;
  discountKind: "PERCENT" | "AMOUNT" | null;
  discountValue: string;
  depositKind: "PERCENT" | "AMOUNT" | null;
  depositValue: string;
  taxRateId: string | null;
  lines: DraftLine[];
};

export type TaxOption = { id: string; name: string; rateMicros: number };

const FIELD =
  "w-full rounded-md border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue";

const PRIMARY =
  "rounded-md bg-action px-5 py-3 text-sm font-semibold text-on-action transition hover:bg-action-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-60";

const SECONDARY =
  "rounded-lg border border-hairline bg-surface-raised px-4 py-2.5 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument";

let scratchId = 0;
function newKey() {
  scratchId += 1;
  return `new-${scratchId}`;
}

function blankLine(kind: "ITEM" | "TEXT"): DraftLine {
  return {
    key: newKey(),
    kind,
    name: "",
    description: "",
    quantityText: "1",
    unit: "each",
    unitCostText: "",
    unitPriceText: "",
    isOptional: false,
    isAccepted: false,
    source: "manual",
  };
}

export function QuoteBuilder({
  quote,
  taxRates,
  services,
  aiConfigured,
}: {
  quote: BuilderQuote;
  taxRates: TaxOption[];
  services: CatalogService[];
  aiConfigured: boolean;
}) {
  const [state, formAction] = useActionState<SaveQuoteState, FormData>(saveQuoteAction, {});

  // Item 50. `defaultValue` inputs can't be set from outside once mounted, so
  // an accepted draft remounts the two fields with a changed `key` rather
  // than lifting them into controlled state — the smallest change that lets
  // an AI draft fill in an otherwise-uncontrolled form.
  const [scopeDraft, setScopeDraft] = useState<{ introTitle: string; introBody: string } | null>(
    null
  );
  const [scopeDrafting, setScopeDrafting] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

  async function draftScope() {
    setScopeDrafting(true);
    setScopeError(null);
    try {
      const result: DraftScopeState = await draftQuoteScopeAction(quote.jobId, quote.id);
      if ("error" in result) setScopeError(result.error);
      else setScopeDraft(result);
    } catch {
      setScopeError("Couldn't draft an opening. Try again.");
    } finally {
      setScopeDrafting(false);
    }
  }

  const [lines, setLines] = useState<DraftLine[]>(quote.lines);
  const [discountKind, setDiscountKind] = useState(quote.discountKind ?? "");
  const [discountValue, setDiscountValue] = useState(quote.discountValue);
  const [depositKind, setDepositKind] = useState(quote.depositKind ?? "");
  const [depositValue, setDepositValue] = useState(quote.depositValue);
  const [taxRateId, setTaxRateId] = useState(quote.taxRateId ?? "");
  const [visibility, setVisibility] = useState({
    showQuantities: quote.showQuantities,
    showUnitPrices: quote.showUnitPrices,
    showLineItemTotals: quote.showLineItemTotals,
    showTotals: quote.showTotals,
  });

  const taxRate = taxRates.find((rate) => rate.id === taxRateId) ?? null;

  /**
   * The same function the server runs on save. Not a second implementation for
   * the sake of a live preview — a total that changes when you press Save is a
   * total nobody trusts again.
   */
  const totals = useMemo(
    () =>
      computeTotals(
        lines.map((line) => ({
          kind: line.kind,
          quantity: quantityOf(line.quantityText),
          unitPriceCents: centsOf(line.unitPriceText),
          unitCostCents: line.unitCostText.trim() ? centsOf(line.unitCostText) : null,
          isOptional: line.isOptional,
          isAccepted: line.isAccepted,
        })),
        {
          discount:
            discountKind === "PERCENT"
              ? { kind: "PERCENT", micros: Math.round(Number(discountValue || 0) * 10_000) }
              : discountKind === "AMOUNT"
                ? { kind: "AMOUNT", cents: centsOf(discountValue) }
                : null,
          taxRateMicros: taxRate?.rateMicros ?? null,
          deposit:
            depositKind === "PERCENT"
              ? { kind: "PERCENT", micros: Math.round(Number(depositValue || 0) * 10_000) }
              : depositKind === "AMOUNT"
                ? { kind: "AMOUNT", cents: centsOf(depositValue) }
                : null,
        }
      ),
    [lines, discountKind, discountValue, depositKind, depositValue, taxRate]
  );

  const serialized = useMemo(
    () =>
      JSON.stringify(
        lines.map((line) => ({
          id: line.id,
          serviceId: line.serviceId ?? null,
          imageUrl: line.imageUrl ?? null,
          kind: line.kind,
          name: line.name,
          description: line.description,
          quantity: quantityOf(line.quantityText),
          unit: line.unit,
          unitCostCents: line.unitCostText.trim() ? centsOf(line.unitCostText) : null,
          unitPriceCents: centsOf(line.unitPriceText),
          isOptional: line.isOptional,
          source: line.source,
        }))
      ),
    [lines]
  );

  function patch(key: string, next: Partial<DraftLine>) {
    setLines((current) =>
      current.map((line) =>
        line.key === key
          ? {
              ...line,
              ...next,
              // Touching a generated row makes it yours: a re-measure must not
              // overwrite a price this roofer deliberately changed.
              source: line.source === "auto" ? "manual" : line.source,
            }
          : line
      )
    );
  }

  function move(key: string, direction: -1 | 1) {
    setLines((current) => {
      const index = current.findIndex((line) => line.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const hiddenFromClient = Object.entries(visibility).filter(([, on]) => !on).length;

  return (
    <form action={formAction} className="min-w-0 space-y-6 pb-28">
      <input type="hidden" name="jobId" value={quote.jobId} />
      <input type="hidden" name="quoteId" value={quote.id} />
      <input type="hidden" name="lines" value={serialized} />

      {state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger-fg"
        >
          {state.error} Nothing you typed has been lost.
        </div>
      ) : null}

      {/* ── Who and what ───────────────────────────────────────────────── */}
      <section className="rounded-lg border border-hairline bg-surface-raised p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <label htmlFor="quote-title" className="mb-1.5 block text-xs font-medium text-ink-secondary">
              What this quote is for
            </label>
            <input
              id="quote-title"
              name="title"
              type="text"
              defaultValue={quote.title}
              placeholder="Full south slope re-roof"
              className={`${FIELD} !text-lg font-semibold`}
            />
            <p className="mt-3 text-sm text-ink-secondary">
              {quote.clientName}
              {quote.address ? ` · ${quote.address}` : ""}
            </p>
          </div>

          <div className="w-28 shrink-0">
            <label htmlFor="quote-number" className="mb-1.5 block text-xs font-medium text-ink-secondary">
              Quote #
            </label>
            <input
              id="quote-number"
              name="quoteNumber"
              type="text"
              inputMode="numeric"
              defaultValue={quote.quoteNumber ?? ""}
              className={`${FIELD} tabular-nums`}
            />
          </div>
        </div>
      </section>

      {/* ── Introduction ───────────────────────────────────────────────── */}
      <Panel
        title="Opening"
        hint="The first thing they read. Skip it and the quote starts at the price."
      >
        {aiConfigured ? (
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={draftScope}
              disabled={scopeDrafting}
              className={`${SECONDARY} disabled:opacity-60`}
            >
              {scopeDrafting ? "Drafting…" : "Draft with AI"}
            </button>
            <span className="text-xs text-ink-muted">
              Fills the fields below from this job&rsquo;s measurements — nothing saves until you
              press Save.
            </span>
          </div>
        ) : null}
        {scopeError ? <p className="mb-3 text-sm text-danger-fg">{scopeError}</p> : null}
        <input
          key={scopeDraft ? "ai-intro-title" : "intro-title"}
          name="introTitle"
          type="text"
          defaultValue={scopeDraft?.introTitle ?? quote.introTitle ?? ""}
          placeholder="Thanks for having us out"
          className={FIELD}
        />
        <textarea
          key={scopeDraft ? "ai-intro-body" : "intro-body"}
          name="introBody"
          rows={3}
          defaultValue={scopeDraft?.introBody ?? quote.introBody ?? ""}
          placeholder="What you found on the roof, and what you're proposing to do about it."
          className={`mt-3 ${FIELD}`}
        />
      </Panel>

      {/* ── Estimate summary ───────────────────────────────────────────── */}
      {/* §7.3/§25 Phase 5 — ahead of the line-item builder, not after it, so
          the owner reads the financial shape of the estimate before editing
          individual lines. Reuses the same `totals` memo the line items and
          the Totals section below both already depend on — one calculation,
          three places it's read. */}
      <EstimateSummaryPanel
        totals={totals}
        lineItemCount={lines.filter((line) => line.kind !== "TEXT").length}
      />

      {/* ── The document ───────────────────────────────────────────────── */}
      <section className="rounded-lg border border-hairline bg-surface-raised p-6">
        <h3 className="text-lg font-semibold text-ink-primary">The work</h3>

        {lines.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-hairline p-8 text-center text-sm text-ink-muted">
            Nothing on this quote yet. Add the first thing you&rsquo;re charging for.
          </div>
        ) : (
          <ul className="mt-2">
            {lines.map((line, index) => (
              <QuoteLineRow
                key={line.key}
                line={line}
                jobId={quote.jobId}
                quoteId={quote.id}
                isFirst={index === 0}
                isLast={index === lines.length - 1}
                onChange={(next) => patch(line.key, next)}
                onMove={(direction) => move(line.key, direction)}
                onRemove={() =>
                  setLines((current) => current.filter((l) => l.key !== line.key))
                }
              />
            ))}
          </ul>
        )}

        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setLines((current) => [...current, blankLine("ITEM")])}
              className={SECONDARY}
            >
              Add a line
            </button>
            {/* Its own button, not just the checkbox further down the row.
                Jobber has both, and the reason is that an upsell you have to
                remember to tick is an upsell that doesn't get added — this is
                the money line, so it gets a door of its own. */}
            <button
              type="button"
              onClick={() =>
                setLines((current) => [...current, { ...blankLine("ITEM"), isOptional: true }])
              }
              className={SECONDARY}
            >
              Add an optional extra
            </button>
            <button
              type="button"
              onClick={() => setLines((current) => [...current, blankLine("TEXT")])}
              className={SECONDARY}
            >
              Add a paragraph
            </button>
          </div>

          {/* A picked line is a *copy*, not a link. The catalog price is where
              this row starts; changing it here changes this quote and nothing
              else, and next month's price rise must not reach backwards into a
              quote a homeowner is holding. `serviceId` is kept so job costing
              can still tell what this row was. */}
          <QuoteCatalogPicker
            services={services}
            onPick={(service) =>
              setLines((current) => [
                ...current,
                {
                  ...blankLine("ITEM"),
                  serviceId: service.id,
                  name: service.name,
                  description: service.description ?? "",
                  // Inherited as a copy, like the price: re-photographing a
                  // shingle next spring must not change a quote already sent.
                  imageUrl: service.imageUrl,
                  unit: service.unit,
                  unitPriceText: toDollars(service.unitPriceCents).toFixed(2),
                  unitCostText:
                    service.unitCostCents == null
                      ? ""
                      : toDollars(service.unitCostCents).toFixed(2),
                },
              ])
            }
          />
        </div>
      </section>

      {/* ── Totals ─────────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-hairline bg-surface-raised p-6">
        <div className="ml-auto max-w-md space-y-3">
          <Row label="Subtotal" value={formatMoney(totals.subtotalCents)} />

          {totals.acceptedOptionalCents > 0 ? (
            <Row
              label="Extras they added"
              value={formatMoney(totals.acceptedOptionalCents)}
            />
          ) : null}

          {totals.optionalCents > 0 ? (
            <p className="text-right text-xs text-ink-muted">
              Plus {formatMoney(totals.optionalCents)} in optional extras, if they take them.
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
            <label htmlFor="discount-value" className="text-sm text-ink-secondary">
              Discount
            </label>
            <div className="flex items-center gap-2">
              <input
                id="discount-value"
                name="discountValue"
                type="text"
                inputMode="decimal"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0"
                className={`w-24 ${FIELD} tabular-nums`}
              />
              <select
                name="discountKind"
                value={discountKind}
                onChange={(e) => setDiscountKind(e.target.value as typeof discountKind)}
                aria-label="Discount as a percentage or an amount"
                className="rounded-lg border border-hairline bg-ground/50 px-2 py-2.5 text-sm text-ink-strong"
              >
                <option value="">—</option>
                <option value="AMOUNT">$</option>
                <option value="PERCENT">%</option>
              </select>
              <span className="w-24 text-right text-sm tabular-nums text-ink-secondary">
                {totals.discountCents > 0 ? `−${formatMoney(totals.discountCents)}` : "—"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
            <label htmlFor="tax-rate" className="text-sm text-ink-secondary">
              Tax
            </label>
            <div className="flex items-center gap-2">
              <select
                id="tax-rate"
                name="taxRateId"
                value={taxRateId}
                onChange={(e) => setTaxRateId(e.target.value)}
                className="rounded-lg border border-hairline bg-ground/50 px-2 py-2.5 text-sm text-ink-strong"
              >
                <option value="">No tax</option>
                {taxRates.map((rate) => (
                  <option key={rate.id} value={rate.id}>
                    {rate.name} ({microsToPercent(rate.rateMicros)}%)
                  </option>
                ))}
              </select>
              <span className="w-24 text-right text-sm tabular-nums text-ink-secondary">
                {formatMoney(totals.taxCents)}
              </span>
            </div>
          </div>

          {/* Was the one cyan figure on this screen — same backwards-Readout-
              Rule bug Phase 4 found on the dashboard. A quote total is a
              business figure, never a measurement. */}
          <div className="flex items-baseline justify-between gap-4 pt-1">
            <span className="text-sm font-semibold text-ink-primary">Total</span>
            <span className="text-3xl font-semibold tabular-nums text-ink-primary">
              {formatMoney(totals.totalCents)}
            </span>
          </div>

          {/* Below the rule, and quieter: this is the contractor's half of the
              document, and it is never printed. */}
          <div className="space-y-2 border-t border-hairline pt-3">
            <Row label="What it costs you" value={formatMoney(totals.costCents)} quiet />
            <Row
              label="What you keep"
              value={
                totals.marginPercent === null
                  ? formatMoney(totals.marginCents)
                  : `${formatMoney(totals.marginCents)} (${totals.marginPercent.toFixed(1)}%)`
              }
              quiet
            />
            <p className="text-right text-xs text-ink-muted">Never shown to the client.</p>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-hairline pt-3">
            <label htmlFor="deposit-value" className="text-sm text-ink-secondary">
              Deposit to start
            </label>
            <div className="flex items-center gap-2">
              <input
                id="deposit-value"
                name="depositValue"
                type="text"
                inputMode="decimal"
                value={depositValue}
                onChange={(e) => setDepositValue(e.target.value)}
                placeholder="0"
                className={`w-24 ${FIELD} tabular-nums`}
              />
              <select
                name="depositKind"
                value={depositKind}
                onChange={(e) => setDepositKind(e.target.value as typeof depositKind)}
                aria-label="Deposit as a percentage or an amount"
                className="rounded-lg border border-hairline bg-ground/50 px-2 py-2.5 text-sm text-ink-strong"
              >
                <option value="">—</option>
                <option value="AMOUNT">$</option>
                <option value="PERCENT">%</option>
              </select>
              <span className="w-24 text-right text-sm tabular-nums text-ink-secondary">
                {totals.depositCents > 0 ? formatMoney(totals.depositCents) : "—"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── What they see ──────────────────────────────────────────────── */}
      <Panel
        title="What the client sees"
        hint="Turn a column off and it disappears from their copy. The price they pay never does."
      >
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {(
            [
              ["showQuantities", "How many"],
              ["showUnitPrices", "Price each"],
              ["showLineItemTotals", "Line totals"],
              ["showTotals", "The breakdown at the bottom"],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 text-sm text-ink-secondary">
              <input
                type="checkbox"
                name={field}
                checked={visibility[field]}
                onChange={(e) => setVisibility((v) => ({ ...v, [field]: e.target.checked }))}
                className="size-4 accent-signal-blue"
              />
              {label}
            </label>
          ))}
        </div>
        {hiddenFromClient > 0 ? (
          <p className="mt-4 text-xs leading-5 text-ink-muted">
            Their copy will show {hiddenFromClient === 4 ? "the work and one price" : "less detail than you see here"}.
            Some homeowners want the breakdown; some want the number. You know which this is.
          </p>
        ) : null}
      </Panel>

      <Panel title="A note to them" hint="Optional. Sits under the price on their copy.">
        <textarea
          name="clientMessage"
          rows={3}
          defaultValue={quote.clientMessage ?? ""}
          placeholder="Happy to walk through any of this — give me a call."
          className={FIELD}
        />
      </Panel>

      <Panel
        title="Terms"
        hint="How long the price holds, what's not included, your warranty."
      >
        <textarea
          name="contractText"
          rows={4}
          defaultValue={quote.contractText ?? ""}
          placeholder="This quote is good for 30 days. Deck repairs beyond what's listed are quoted separately."
          className={FIELD}
        />
      </Panel>

      {/* Sticky, because this document is longer than a screen and the total is
          the thing you check before saving. It travels with you. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-surface-sidebar/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <p className="text-sm text-ink-secondary">
            Total{" "}
            <span className="font-semibold tabular-nums text-ink-primary">
              {formatMoney(totals.totalCents)}
            </span>
            {state.savedAt ? <span className="ml-3 text-ink-muted">Saved.</span> : null}
          </p>
          <div className="flex items-center gap-3">
            <Link href={`/jobs/${quote.jobId}`} className={SECONDARY}>
              Back to the job
            </Link>
            <SubmitButton pendingText="Saving…" className={PRIMARY}>
              Save quote
            </SubmitButton>
          </div>
        </div>
      </div>
    </form>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-hairline bg-surface-raised p-6">
      <h3 className="text-lg font-semibold text-ink-primary">{title}</h3>
      <p className="mb-4 mt-1 text-sm text-ink-muted">{hint}</p>
      {children}
    </section>
  );
}

function Row({ label, value, quiet }: { label: string; value: string; quiet?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={`text-sm ${quiet ? "text-ink-muted" : "text-ink-secondary"}`}>{label}</span>
      <span
        className={`text-sm tabular-nums ${quiet ? "text-ink-muted" : "font-medium text-ink-primary"}`}
      >
        {value}
      </span>
    </div>
  );
}
