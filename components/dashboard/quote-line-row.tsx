"use client";

import { useEffect, useId, useRef, useState } from "react";
import { uploadQuoteLinePhotoAction } from "@/app/(dashboard)/jobs/[jobId]/quotes/[quoteId]/photo-actions";
import { downscaleImage } from "@/lib/image-downscale";
import { formatMoney, parseMoneyToCents } from "@/lib/money";
import { markupPercent, priceFromMarkup } from "@/lib/quote/totals";

export type DraftLine = {
  /** Stable across renders; the database id when this row has one. */
  key: string;
  id?: string;
  /** The price-list row this line came from, when it came from one. */
  serviceId?: string | null;
  /** A photo of the work or the material. Stored already; saved with the quote. */
  imageUrl?: string | null;
  kind: "ITEM" | "TEXT";
  name: string;
  description: string;
  quantityText: string;
  unit: string;
  /** Held as typed, parsed on the way out — "$1,200" is not a mistake. */
  unitCostText: string;
  unitPriceText: string;
  isOptional: boolean;
  /**
   * The homeowner ticked this extra when they approved. Read-only here — the
   * builder shows it, and never sets it.
   */
  isAccepted: boolean;
  source: string;
};

export function centsOf(text: string): number {
  return parseMoneyToCents(text).cents ?? 0;
}

export function quantityOf(text: string): number {
  const n = Number(text.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const FIELD =
  "w-full rounded-xl border border-hairline bg-ground/50 px-3 py-2.5 text-sm text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue";

/**
 * What it costs you, and what you're charging.
 *
 * A popover on the price rather than two more columns, following Jobber — and
 * the reason is not screen width. The row a contractor edits should be the same
 * shape as the row a homeowner reads. Put cost in a column and the editing
 * surface stops resembling the document, so every price change has to be
 * mentally re-mapped onto what the client will see.
 *
 * Cost and markup are two views of one fact, so editing either recomputes the
 * other. The footer line is not decoration: it is the answer to the question a
 * roofer asks every time this panel opens.
 */
function CostPopover({
  line,
  onChange,
  onClose,
}: {
  line: DraftLine;
  onChange: (patch: Partial<DraftLine>) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const costCents = centsOf(line.unitCostText);
  const priceCents = centsOf(line.unitPriceText);
  const markup = markupPercent(line.unitCostText.trim() ? costCents : null, priceCents);

  return (
    /* Opaque, not a tinted film: `surface-raised` is a 7% wash in dark mode and
       a floating layer built from it is unreadable over text. Flat by doctrine,
       so a hairline does the lifting rather than a shadow. */
    <div
      ref={ref}
      className="absolute right-0 top-full z-30 mt-2 w-60 rounded-xl border border-hairline bg-surface-sidebar p-3"
    >
      <label className="block text-xs font-medium text-ink-secondary" htmlFor={`cost-${line.key}`}>
        What it costs you
      </label>
      <input
        id={`cost-${line.key}`}
        type="text"
        inputMode="decimal"
        value={line.unitCostText}
        onChange={(e) => onChange({ unitCostText: e.target.value })}
        placeholder="$0.00"
        className={`mt-1.5 ${FIELD}`}
      />

      <label className="mt-3 block text-xs font-medium text-ink-secondary" htmlFor={`markup-${line.key}`}>
        Markup
      </label>
      <input
        id={`markup-${line.key}`}
        type="text"
        inputMode="decimal"
        value={markup === null ? "" : markup.toFixed(2)}
        onChange={(e) => {
          const next = Number(e.target.value.replace(/[%\s]/g, ""));
          if (!Number.isFinite(next) || costCents === 0) return;
          onChange({ unitPriceText: (priceFromMarkup(costCents, next) / 100).toFixed(2) });
        }}
        placeholder={costCents === 0 ? "Add a cost first" : "0%"}
        disabled={costCents === 0}
        className={`mt-1.5 ${FIELD} disabled:opacity-50`}
      />

      <p className="mt-3 text-xs leading-5 text-ink-muted">
        {costCents === 0
          ? "Your cost stays between you and your books."
          : `You keep ${formatMoney(priceCents - costCents)} a ${line.unit}. Never shown to the client.`}
      </p>
    </div>
  );
}

/**
 * The picture of the thing being bought.
 *
 * A homeowner choosing between two shingle profiles is choosing on a word until
 * somebody shows them. This is also the row where a repair gets its evidence —
 * "$1,400, deck rot" reads very differently next to a photo of the rot.
 *
 * The bytes go up on selection; the row keeps the URL and it is saved with the
 * document. Nothing here writes to the database.
 */
function LinePhoto({
  line,
  jobId,
  quoteId,
  onChange,
}: {
  line: DraftLine;
  jobId: string;
  quoteId: string;
  onChange: (patch: Partial<DraftLine>) => void;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const data = new FormData();
      data.set("jobId", jobId);
      data.set("quoteId", quoteId);
      data.set("photo", await downscaleImage(file));
      const result = await uploadQuoteLinePhotoAction(data);
      if (result.error) setError(result.error);
      else if (result.url) onChange({ imageUrl: result.url });
    } catch {
      setError("That photo didn't upload. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (line.imageUrl) {
    return (
      <div className="flex items-center gap-2">
        <img
          src={line.imageUrl}
          alt={`Photo on the line for ${line.name || "this item"}`}
          loading="lazy"
          decoding="async"
          className="size-12 rounded-lg border border-hairline object-cover"
        />
        <button
          type="button"
          onClick={() => onChange({ imageUrl: null })}
          className="text-xs text-ink-muted underline underline-offset-2 transition hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        >
          Remove photo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {/* A label, not a button opening a hidden input: this way the control is
          a real file input for a screen reader and for a keyboard, and the
          camera opens directly on a phone. */}
      <label
        htmlFor={inputId}
        className="cursor-pointer text-sm text-ink-secondary underline underline-offset-2 transition hover:text-ink-primary has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-instrument"
      >
        {busy ? "Adding the photo…" : "Add a photo"}
        <input
          id={inputId}
          type="file"
          accept="image/*"
          disabled={busy}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Cleared so picking the same file twice still fires a change.
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </label>
      {error ? (
        <span role="alert" className="text-xs text-danger-fg">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function QuoteLineRow({
  line,
  jobId,
  quoteId,
  onChange,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: {
  line: DraftLine;
  jobId: string;
  quoteId: string;
  onChange: (patch: Partial<DraftLine>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [costOpen, setCostOpen] = useState(false);

  // Floored the same way as `lineTotalCents` (lib/quote/totals.ts) — this is
  // only a preview of that real number, and a preview that goes negative
  // while the server-side total stays clamped at zero is a bug a roofer
  // would report, not a rendering detail.
  const amountCents = Math.round(
    Math.max(0, centsOf(line.unitPriceText)) * Math.max(0, quantityOf(line.quantityText))
  );

  if (line.kind === "TEXT") {
    return (
      <li className="border-b border-hairline py-5 last:border-b-0">
        <div className="flex items-start gap-3">
          <textarea
            value={line.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
            placeholder="A paragraph for the homeowner to read — what's included, how long it takes, what happens to the old shingles…"
            className={FIELD}
            aria-label="Paragraph"
          />
          <RowControls
            onRemove={onRemove}
            onMove={onMove}
            isFirst={isFirst}
            isLast={isLast}
            label="paragraph"
          />
        </div>
      </li>
    );
  }

  return (
    <li className="border-b border-hairline py-5 last:border-b-0">
      {/* Grid on a desk, stacked on a phone. The labels are always rendered —
          a price field that only says what it is on a wide screen is a price
          field somebody mis-types in a truck. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 block text-xs font-medium text-ink-secondary" htmlFor={`name-${line.key}`}>
            What it is
          </label>
          <input
            id={`name-${line.key}`}
            type="text"
            value={line.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Architectural shingles — installed"
            className={FIELD}
          />
        </div>

        <div className="w-full shrink-0 lg:w-24">
          <label className="mb-1.5 block text-xs font-medium text-ink-secondary" htmlFor={`qty-${line.key}`}>
            How many
          </label>
          <input
            id={`qty-${line.key}`}
            type="text"
            inputMode="decimal"
            value={line.quantityText}
            onChange={(e) => onChange({ quantityText: e.target.value })}
            className={`${FIELD} tabular-nums`}
          />
        </div>

        <div className="w-full shrink-0 lg:w-28">
          <label className="mb-1.5 block text-xs font-medium text-ink-secondary" htmlFor={`unit-${line.key}`}>
            Per
          </label>
          <input
            id={`unit-${line.key}`}
            type="text"
            value={line.unit}
            onChange={(e) => onChange({ unit: e.target.value })}
            placeholder="each"
            className={FIELD}
          />
        </div>

        <div className="relative w-full shrink-0 lg:w-36">
          <label className="mb-1.5 block text-xs font-medium text-ink-secondary" htmlFor={`price-${line.key}`}>
            Price
          </label>
          <input
            id={`price-${line.key}`}
            type="text"
            inputMode="decimal"
            value={line.unitPriceText}
            onChange={(e) => onChange({ unitPriceText: e.target.value })}
            onFocus={() => setCostOpen(true)}
            placeholder="$0.00"
            className={`${FIELD} tabular-nums`}
          />
          {costOpen ? (
            <CostPopover line={line} onChange={onChange} onClose={() => setCostOpen(false)} />
          ) : null}
        </div>

        <div className="w-full shrink-0 lg:w-32">
          {/* Read-only, and it looks it: no border, no field. The line total is
              arithmetic, not an input, and letting someone type into it would
              be offering to make the row disagree with itself. */}
          <p className="mb-1.5 text-xs font-medium text-ink-secondary">Line total</p>
          <p className="px-1 py-2.5 text-right text-sm font-semibold tabular-nums text-ink-primary lg:text-left">
            {formatMoney(amountCents)}
          </p>
        </div>

        <div className="shrink-0 lg:pt-6">
          <RowControls
            onRemove={onRemove}
            onMove={onMove}
            isFirst={isFirst}
            isLast={isLast}
            label="line"
          />
        </div>
      </div>

      <div className="mt-3 lg:pr-40">
        <textarea
          value={line.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          placeholder="Describe it in your own words — this is what the homeowner reads."
          className={FIELD}
          aria-label={`Description of ${line.name || "this line"}`}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <LinePhoto line={line} jobId={jobId} quoteId={quoteId} onChange={onChange} />

        <label className="flex w-fit items-center gap-2 text-sm text-ink-secondary">
          <input
            type="checkbox"
            checked={line.isOptional}
            onChange={(e) => onChange({ isOptional: e.target.checked })}
            className="size-4 accent-signal-blue"
          />
          {/* The consequence, not the label. "Optional" alone leaves a roofer
              guessing whether the money is in the total or not — which is the
              only thing about this checkbox that matters. */}
          {line.isAccepted
            ? "Optional extra — they took it, so it counts"
            : "Optional extra — priced, but not counted in the total"}
        </label>

        {/* The one fact on this row the contractor did not decide. It reads as
            a statement rather than a control because there is nothing here to
            change: the homeowner said yes to this, and a roofer un-ticking it
            would be editing somebody else's answer. */}
        {line.isAccepted ? (
          <span className="rounded-full bg-confirm/15 px-2.5 py-1 text-xs font-medium text-confirm-fg">
            Added by the client
          </span>
        ) : null}
      </div>
    </li>
  );
}

const CONTROL =
  "rounded-lg border border-hairline px-2 py-1.5 text-xs text-ink-secondary transition hover:bg-surface-lifted hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument disabled:opacity-30 disabled:hover:bg-transparent";

/**
 * Buttons rather than a drag handle.
 *
 * Dragging is the obvious answer and the wrong first one: it is invisible to a
 * keyboard, awkward on a phone in one hand, and a quote is five rows, not
 * fifty. Two arrows do the whole job and work everywhere.
 */
function RowControls({
  onRemove,
  onMove,
  isFirst,
  isLast,
  label,
}: {
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => onMove(-1)} disabled={isFirst} className={CONTROL} aria-label={`Move this ${label} up`}>
        ↑
      </button>
      <button type="button" onClick={() => onMove(1)} disabled={isLast} className={CONTROL} aria-label={`Move this ${label} down`}>
        ↓
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-lg border border-danger/25 px-2 py-1.5 text-xs text-danger-fg transition hover:bg-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
        aria-label={`Remove this ${label}`}
      >
        Remove
      </button>
    </div>
  );
}
