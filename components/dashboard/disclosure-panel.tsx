"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * A single disclosure ("show/hide") row for the Scan tab. It exists to keep the
 * hands-on tools — extraction, facets, measurements — off the first screen so
 * the guided workflow and the roof numbers lead, and the manual editing waits
 * until it's asked for (PRODUCT.md: "absorb the complexity, don't relocate it";
 * "calm is a function of sequence").
 *
 * The body stays MOUNTED when collapsed (toggled with `hidden`, never
 * unmounted), so a half-drawn extraction ROI, a form mid-edit, or any loaded
 * canvas survives a collapse — the same reason the workspace tabs stay mounted.
 *
 * `defaultOpen` is the "smart default": a panel that already has content opens
 * itself so a returning roofer sees their work, while an empty project stays
 * calm and collapsed. It seeds initial state only; the roofer's toggle wins
 * after that.
 */
export function DisclosurePanel({
  title,
  hint,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  /** Shown as a pill next to the title, e.g. the number of facets. Hidden when 0. */
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();
  const labelId = useId();

  return (
    <section>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 rounded-2xl border border-hairline bg-surface-raised px-5 py-4 text-left transition hover:bg-surface-lifted focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 text-ink-muted transition-transform duration-200 motion-reduce:transition-none ${
            open ? "rotate-90" : ""
          }`}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span id={labelId} className="text-base font-semibold text-ink-primary">
              {title}
            </span>
            {typeof count === "number" && count > 0 ? (
              <span className="rounded-full bg-surface-lifted px-2 py-0.5 text-xs font-medium text-ink-secondary">
                {count}
              </span>
            ) : null}
          </span>
          {hint ? <span className="mt-0.5 block text-sm text-ink-muted">{hint}</span> : null}
        </span>

        <span className="shrink-0 text-sm font-medium text-ink-muted">{open ? "Hide" : "Show"}</span>
      </button>

      <div id={regionId} role="region" aria-labelledby={labelId} hidden={!open} className="pt-4">
        {children}
      </div>
    </section>
  );
}
