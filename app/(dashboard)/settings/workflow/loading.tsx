import { SkeletonList } from "@/components/ui/skeleton";

/** Route-scoped replacement for the generic app/(dashboard)/loading.tsx fallback (Phase 3 migration map §60). */
export default function WorkflowSettingsLoading() {
  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded-md bg-surface-lifted" />
        <div className="h-8 w-40 animate-pulse rounded-md bg-surface-lifted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-surface-lifted" />
      </div>

      <div className="rounded-3xl border border-hairline bg-surface-raised px-6">
        <SkeletonList rows={9} />
      </div>
    </div>
  );
}
