/** Route-scoped replacement for the generic app/(dashboard)/loading.tsx fallback (Phase 3 migration map §60). */
export default function SettingsLoading() {
  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse rounded-md bg-surface-lifted" />
        <div className="h-8 w-40 animate-pulse rounded-md bg-surface-lifted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-surface-lifted" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-3xl border border-hairline bg-surface-raised" />
      ))}
    </div>
  );
}
