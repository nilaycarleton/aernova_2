import { SkeletonList, SkeletonReadout } from "@/components/ui/skeleton";

/** Route-scoped replacement for the generic app/(dashboard)/loading.tsx fallback (Phase 3 migration map §60). */
export default function ClientsLoading() {
  return (
    <div className="min-w-0 space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-7 w-24 animate-pulse rounded-md bg-surface-lifted" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-surface-lifted" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-hairline bg-surface-raised p-5">
            <SkeletonReadout />
          </div>
        ))}
      </div>

      <div className="h-10 w-full max-w-xs animate-pulse rounded-md bg-surface-lifted" />

      <div className="rounded-2xl border border-hairline bg-surface-raised px-6">
        <SkeletonList rows={6} />
      </div>
    </div>
  );
}
