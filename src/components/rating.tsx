import { formatReviewCount } from '@/lib/places/hours';
import { cn } from '@/lib/utils/cn';

/** Google-style rating: "★ 4.6 (1.2k)". Renders nothing when there is no rating yet. */
export function Rating({ rating, count, size = 'sm', className }: { rating: number | null | undefined; count?: number | null; size?: 'sm' | 'lg'; className?: string }) {
  if (rating == null) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold', size === 'lg' ? 'text-base' : 'text-xs', className)} aria-label={`Rated ${rating} out of 5${count ? ` from ${count} reviews` : ''}`}>
      <svg viewBox="0 0 20 20" className={cn('shrink-0 text-accent', size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5')} fill="currentColor" aria-hidden="true">
        <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7z" />
      </svg>
      {Number(rating).toFixed(1)}
      {count ? <span className="font-normal text-muted">({formatReviewCount(count)})</span> : null}
    </span>
  );
}
