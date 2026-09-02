import { SkeletonList, SkeletonReadout } from "@/components/ui/skeleton";

/** Route-scoped replacement for the generic app/(dashboard)/loading.tsx fallback (Phase 3 migration map §60). */
export default function JobLoading() {
  return (
    <div className="min-w-0 space-y-6" aria-busy="true">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="h-3 w-20 animate-pulse rounded-md bg-surface-lifted" />
          <div className="h-7 w-56 animate-pulse rounded-md bg-surface-lifted" />
          <div className="h-4 w-72 animate-pulse rounded-md bg-surface-lifted" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded-lg bg-surface-lifted" />
      </div>

      <div className="rounded-lg border border-hairline bg-surface-raised p-6">
        <SkeletonReadout />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-10 w-32 animate-pulse rounded-md bg-surface-lifted" />
        <div className="h-10 w-32 animate-pulse rounded-md bg-surface-lifted" />
        <div className="h-10 w-32 animate-pulse rounded-md bg-surface-lifted" />
        <div className="h-10 w-32 animate-pulse rounded-md bg-surface-lifted" />
      </div>

      <div className="rounded-lg border border-hairline bg-surface-raised px-6">
        <SkeletonList rows={5} />
      </div>
    </div>
  );
}
