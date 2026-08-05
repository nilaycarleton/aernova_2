"use client";

import { useRef, useState } from "react";
import { formatMoney } from "@/lib/money";

/**
 * The company's own price list, one click from a quote line.
 *
 * Every company gets a catalog for its trade the first time it signs in
 * (`lib/trade-catalog.ts`) and edits it from there, so this is not a library of
 * suggestions — it is what this roofer charges. Picking from it is how a quote
 * stops being twelve fields of retyping, and it is the only way a price stays
 * consistent across the forty quotes a contractor sends in a season.
 *
 * Inline, not a modal. A modal wants a focus trap, a scroll lock and a close
 * affordance, and buys nothing here: the picker is one search box and a list,
 * the quote behind it is worth seeing, and on a phone a full-screen dialog over
 * a form you were mid-way through is disorienting.
 */
export type CatalogService = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  unitPriceCents: number;
  unitCostCents: number | null;
  category: string | null;
  /** Photographed once here, inherited by every line picked from it. */
  imageUrl: string | null;
};

const SECONDARY =
  "rounded-xl border border-hairline bg-surface-raised px-4 py-2.5 text-sm font-medium text-ink-primary transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument";

export function QuoteCatalogPicker({
  services,
  onPick,
}: {
  services: CatalogService[];
  onPick: (service: CatalogService) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // No catalog, no button. An empty picker is a dead end dressed up as a
  // feature, and every company has a catalog by the time it has a quote.
  if (services.length === 0) return null;

  const groups = groupByCategory(services, query);
  const matches = groups.reduce((sum, group) => sum + group.services.length, 0);

  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          // Focus follows the disclosure: the next thing anyone does here is
          // type the name of the thing they're looking for.
          if (!open) requestAnimationFrame(() => searchRef.current?.focus());
        }}
        className={SECONDARY}
      >
        {open ? "Close the price list" : "Add from your price list"}
      </button>

      {open ? (
        <div
          className="mt-3 rounded-2xl border border-hairline bg-ground/40 p-3"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          <label htmlFor="catalog-search" className="sr-only">
            Search your price list
          </label>
          <input
            ref={searchRef}
            id="catalog-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search — shingles, tear-off, gutters…"
            className="w-full rounded-xl border border-hairline bg-surface-raised px-3 py-2.5 text-sm text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-signal-blue"
          />

          {matches === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-ink-muted">
              Nothing in your price list matches that. Add the line by hand — you can
              always put it on the list later.
            </p>
          ) : (
            <div className="mt-3 max-h-80 overflow-y-auto">
              {groups.map((group) => (
                <div key={group.category} className="mb-3 last:mb-0">
                  <p className="px-1 pb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {group.category}
                  </p>
                  <ul>
                    {group.services.map((service) => (
                      <li key={service.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onPick(service);
                            setOpen(false);
                            setQuery("");
                          }}
                          className="flex w-full items-baseline justify-between gap-4 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-instrument"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            {service.imageUrl ? (
                              <img
                                src={service.imageUrl}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="size-9 shrink-0 rounded-lg border border-hairline object-cover"
                              />
                            ) : null}
                            <span className="min-w-0">
                            <span className="block text-sm font-medium text-ink-primary">
                              {service.name}
                            </span>
                            {service.description ? (
                              <span className="mt-0.5 block truncate text-xs text-ink-muted">
                                {service.description}
                              </span>
                            ) : null}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm tabular-nums text-ink-secondary">
                            {formatMoney(service.unitPriceCents)}
                            <span className="text-ink-muted"> / {service.unit}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function groupByCategory(services: CatalogService[], query: string) {
  const needle = query.trim().toLowerCase();
  const matching = needle
    ? services.filter((service) =>
        [service.name, service.description ?? "", service.category ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      )
    : services;

  const byCategory = new Map<string, CatalogService[]>();
  for (const service of matching) {
    const key = service.category ?? "Everything else";
    const group = byCategory.get(key);
    if (group) group.push(service);
    else byCategory.set(key, [service]);
  }
  return [...byCategory].map(([category, group]) => ({ category, services: group }));
}
