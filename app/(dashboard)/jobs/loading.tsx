import { SkeletonList } from "@/components/ui/skeleton";

/** Route-scoped replacement for the generic app/(dashboard)/loading.tsx fallback (Phase 3 migration map §60). */
export default function JobsLoading() {
  return (
    <div className="min-w-0 space-y-6" aria-busy="true">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-20 animate-pulse rounded-md bg-surface-lifted" />
          <div className="h-4 w-56 animate-pulse rounded-md bg-surface-lifted" />
        </div>
        <div className="h-11 w-28 animate-pulse rounded-xl bg-surface-lifted" />
      </div>

      <div className="h-10 w-full max-w-xs animate-pulse rounded-md bg-surface-lifted" />

      <div className="rounded-2xl border border-hairline bg-surface-raised px-6">
        <SkeletonList rows={6} />
      </div>
    </div>
  );
}
