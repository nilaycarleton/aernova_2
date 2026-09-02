import { SkeletonList } from "@/components/ui/skeleton";

/** Route-scoped replacement for the generic app/(dashboard)/loading.tsx fallback (Phase 3 migration map §60). */
export default function TeamLoading() {
  return (
    <div className="min-w-0 space-y-8" aria-busy="true">
      <div className="space-y-2">
        <div className="h-3 w-12 animate-pulse rounded-md bg-surface-lifted" />
        <div className="h-8 w-56 animate-pulse rounded-md bg-surface-lifted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-surface-lifted" />
      </div>

      <div className="h-40 animate-pulse rounded-lg border border-hairline bg-surface-raised" />

      <div className="rounded-lg border border-hairline bg-surface-raised px-6">
        <SkeletonList rows={4} />
      </div>
    </div>
  );
}
