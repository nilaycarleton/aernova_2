/** Route-scoped replacement for the generic app/(dashboard)/loading.tsx fallback (Phase 3 migration map §60). */
export default function PipelineLoading() {
  return (
    <div className="min-w-0 space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-7 w-24 animate-pulse rounded-md bg-surface-lifted" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-surface-lifted" />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0 space-y-2 rounded-2xl border border-hairline bg-surface-raised p-3">
            <div className="h-4 w-20 animate-pulse rounded-md bg-surface-lifted" />
            <div className="h-16 animate-pulse rounded-xl bg-ground/40" />
            <div className="h-16 animate-pulse rounded-xl bg-ground/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
