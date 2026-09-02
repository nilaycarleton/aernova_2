import { SkeletonList, SkeletonReadout } from "@/components/ui/skeleton";

/**
 * Route-scoped replacement for the generic app/(dashboard)/loading.tsx
 * fallback (Phase 3 migration map §60) — shaped to this page's actual
 * sections instead of the old four-tile grid the shared skeleton still
 * describes. Dimensions approximate the real layout closely enough to avoid
 * layout shift when data arrives.
 */
export default function DashboardLoading() {
  return (
    <div className="min-w-0 space-y-8" aria-busy="true">
      <div className="h-7 w-32 animate-pulse rounded-md bg-surface-lifted" />

      <div className="rounded-lg border border-hairline bg-surface-raised p-6 sm:p-8">
        <SkeletonReadout />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-hairline bg-surface-raised p-6 lg:col-span-2">
          <div className="h-4 w-32 animate-pulse rounded-md bg-surface-lifted" />
          <div className="mt-3">
            <SkeletonList rows={4} />
          </div>
        </div>
        <div className="rounded-lg border border-hairline bg-surface-raised p-6">
          <SkeletonReadout />
        </div>
      </div>

      <div className="rounded-lg border border-hairline bg-surface-raised p-6">
        <div className="h-4 w-32 animate-pulse rounded-md bg-surface-lifted" />
        <div className="mt-3">
          <SkeletonList rows={3} />
        </div>
      </div>

      <div className="rounded-lg border border-hairline bg-surface-raised p-6">
        <div className="h-4 w-32 animate-pulse rounded-md bg-surface-lifted" />
        <div className="mt-3">
          <SkeletonList rows={3} />
        </div>
      </div>
    </div>
  );
}
