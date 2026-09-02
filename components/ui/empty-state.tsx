import { EmptyState as AstryxEmptyState } from "@astryxdesign/core/EmptyState";
import type { ReactNode } from "react";

const DEFAULTS: Record<
  "first-use" | "filtered" | "clear" | "error",
  { title: string; description?: string }
> = {
  "first-use": { title: "Nothing here yet" },
  filtered: { title: "No matches", description: "Try adjusting your search or filters." },
  clear: { title: "Nothing needs attention" },
  error: { title: "Couldn't load this", description: "Try again in a moment." },
};

/**
 * The one empty-state shape. Astryx EmptyState directly (Decision A) — it's
 * the single Astryx component with no client directive at all, so this
 * stays server-renderable. The duplication audit found 31 hand-rolled
 * instances across 24 files, all visually converging on the same dashed-
 * border / centered-text / optional-CTA shape already; this just names the
 * four kinds of emptiness the plan distinguishes (Step 13) so a caller
 * doesn't have to author title/description from scratch for the two most
 * common cases. Any of the four still accepts an explicit title/description
 * override for something more specific.
 */
export function EmptyState({
  kind = "first-use",
  title,
  description,
  action,
  compact,
}: {
  kind?: "first-use" | "filtered" | "clear" | "error";
  title?: string;
  description?: string;
  /** Only rendered when an action is actually available — never a placeholder CTA. */
  action?: ReactNode;
  compact?: boolean;
}) {
  const fallback = DEFAULTS[kind];
  return (
    <AstryxEmptyState
      title={title ?? fallback.title}
      description={description ?? fallback.description}
      actions={action}
      isCompact={compact}
    />
  );
}
