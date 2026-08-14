import { SkeletonList, SkeletonReadout } from "@/components/ui/skeleton";

/** Route-scoped replacement for the generic app/(dashboard)/loading.tsx fallback (Phase 3 migration map §60). */
export default function InvoicesLoading() {
  return (
    <div className="min-w-0 space-y-8" aria-busy="true">
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse rounded-md bg-surface-lifted" />
        <div className="h-8 w-64 animate-pulse rounded-md bg-surface-lifted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-surface-lifted" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-hairline bg-surface-raised p-6">
            <SkeletonReadout />
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-hairline bg-surface-raised px-6">
        <SkeletonList rows={6} />
      </div>
    </div>
  );
}
