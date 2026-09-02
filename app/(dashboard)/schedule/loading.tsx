/** Route-scoped replacement for the generic app/(dashboard)/loading.tsx fallback (Phase 3 migration map §60). */
export default function ScheduleLoading() {
  return (
    <div className="min-w-0 space-y-8" aria-busy="true">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-16 animate-pulse rounded-md bg-surface-lifted" />
          <div className="h-8 w-48 animate-pulse rounded-md bg-surface-lifted" />
          <div className="h-4 w-24 animate-pulse rounded-md bg-surface-lifted" />
        </div>
        <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-lifted" />
      </div>

      <div className="grid gap-3 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-lg border border-hairline bg-surface-raised" />
        ))}
      </div>
    </div>
  );
}
