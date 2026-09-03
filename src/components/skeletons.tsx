export function LeaderboardSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-surface-2" />)}
    </div>
  );
}

export function DealGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid animate-pulse gap-3 sm:grid-cols-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => <div key={i} className="h-36 rounded-2xl bg-surface-2" />)}
    </div>
  );
}
