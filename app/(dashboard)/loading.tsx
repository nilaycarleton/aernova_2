export default function DashboardLoading() {
  return (
    <div className="min-w-0 space-y-8" aria-busy="true">
      <div className="h-32 animate-pulse rounded-3xl border border-hairline bg-surface-raised" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-hairline bg-surface-raised" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-3xl border border-hairline bg-surface-raised" />
    </div>
  );
}
