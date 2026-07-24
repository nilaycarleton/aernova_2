"use client";

/**
 * The selection action bar for the deletable lists. It only appears once at
 * least one row is checked, so it stays invisible to a roofer who just wants to
 * delete one thing (per-row Delete still works) and speeds up the tedious case
 * of clearing several at once — Nielsen #7, "accelerators invisible to novices".
 *
 * Delete routes through the same "Deleted — Undo" toast as a single delete, so a
 * mis-tap on a multi-select is exactly as recoverable.
 */
export function BulkActionBar({
  count,
  noun,
  onDelete,
  onClear,
}: {
  count: number;
  /** Singular trade word, e.g. "measurement" / "facet". Pluralized with count. */
  noun: string;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count < 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface-lifted px-4 py-2.5">
      <span aria-live="polite" className="text-sm text-ink-secondary">
        {count} {noun}
        {count === 1 ? "" : "s"} selected
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg px-3 py-1.5 text-sm text-ink-muted transition hover:bg-surface-raised hover:text-ink-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-instrument"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger-fg transition hover:bg-danger/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger"
        >
          Delete selected
        </button>
      </div>
    </div>
  );
}
