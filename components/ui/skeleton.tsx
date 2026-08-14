import { Skeleton } from "@astryxdesign/core/Skeleton";

/**
 * Composed skeleton shapes for the rows/readouts this app actually renders.
 * Astryx Skeleton is the primitive (Decision A); these are the only
 * compositions Phase 3 needs — a DataRow shape and a NumericReadout shape —
 * not a general-purpose fake-screen system (Step 14). Dimensions
 * approximate their real counterparts closely enough to avoid layout shift
 * when content arrives; Astryx Skeleton's own pulse already respects
 * `prefers-reduced-motion`.
 */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton width={32} height={32} radius="rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton width="45%" height={12} />
        <Skeleton width="30%" height={10} />
      </div>
      <Skeleton width={64} height={12} />
    </div>
  );
}

export function SkeletonReadout() {
  return (
    <div className="space-y-2">
      <Skeleton width="40%" height={10} />
      <Skeleton width="60%" height={22} />
    </div>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-hairline">
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonRow key={index} />
      ))}
    </div>
  );
}
