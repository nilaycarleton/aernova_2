"use client";

import type { ReactNode } from "react";

/**
 * The visual/container shell for a list's search + filters. Query state
 * stays page-owned (Step 8/49) — this renders a controlled search box and a
 * slot for whatever filter controls the caller already has; it knows
 * nothing about RequestStatus, JobStatus, or any other domain filter
 * vocabulary. Laid out so mobile doesn't compress six controls into one
 * unreadable row: search stays full-width and primary, filters wrap onto
 * their own row.
 */
export function FilterToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search",
  filters,
  resultCount,
  onClear,
  actions,
}: {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Select/segmented filter controls — caller-owned, this only lays them out. */
  filters?: ReactNode;
  /** e.g. "37 jobs" — omit if not meaningful for this list. */
  resultCount?: string;
  /** Rendered only when there's something to clear back to. */
  onClear?: () => void;
  /** A trailing action slot (e.g. "New job"), kept distinct from ActionToolbar's page-level actions. */
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {onSearchChange ? (
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full min-w-0 rounded-md border border-hairline bg-ground/60 px-4 py-2 text-sm text-ink-primary outline-none placeholder:text-ink-muted focus:border-instrument sm:max-w-xs"
          />
        ) : null}
        {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
        {actions ? <div className="flex items-center gap-2 sm:ml-auto">{actions}</div> : null}
      </div>

      {resultCount || onClear ? (
        <div className="flex items-center gap-3 text-xs text-ink-muted">
          {resultCount ? <span>{resultCount}</span> : null}
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-ink-secondary underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
