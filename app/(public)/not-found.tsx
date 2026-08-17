/**
 * Every public document calls `notFound()` for a missing/expired/malformed
 * token — the single most common real-world error state on these routes
 * (a forwarded email gone stale, a mistyped link). Without this, it fell
 * through to the root `not-found.tsx`: dashboard-themed, saying "this page
 * belongs to another company workspace" (meaningless to a homeowner), with
 * its only link pointing at a dashboard they have no account for.
 */
export default function PublicNotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="mx-auto max-w-md rounded-lg border border-paper-rule bg-paper-document p-8 text-center">
        <h1 className="text-xl font-semibold text-paper-ink">This link isn&rsquo;t working anymore</h1>
        <p className="mt-3 text-sm text-paper-ink-muted">
          It may have expired, or been typed in wrong. Ask whoever sent it to you for a new one.
        </p>
      </div>
    </div>
  );
}
