import { SkeletonList, SkeletonReadout } from "@/components/ui/skeleton";

/** Route-scoped replacement for the generic app/(dashboard)/loading.tsx fallback (Phase 3 migration map §60) — shared across all three /reports pages, whose shape (header + hero readout + list sections) is near-identical. */
export default function ReportsLoading() {
  return (
    <div className="min-w-0 space-y-8" aria-busy="true">
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse rounded-md bg-surface-lifted" />
        <div className="h-8 w-48 animate-pulse rounded-md bg-surface-lifted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-surface-lifted" />
      </div>

      <div className="h-8 w-64 animate-pulse rounded-md bg-surface-lifted" />

      <div className="rounded-lg border border-hairline bg-surface-raised p-6 sm:p-8">
        <SkeletonReadout />
      </div>

      <div className="rounded-lg border border-hairline bg-surface-raised px-6">
        <SkeletonList rows={4} />
      </div>
    </div>
  );
}
