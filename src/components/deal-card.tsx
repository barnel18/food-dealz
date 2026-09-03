import Link from 'next/link';
import { dealHeadline, formatDistance, formatValidity, unitPriceLine } from '@/lib/deals/format';
import type { DealCardData } from '@/lib/deals/types';
import { cn } from '@/lib/utils/cn';
import { BusinessAvatar } from './business-avatar';
import { ChevronRightIcon } from './icons';
import { SaveButton } from './save-button';

export function DealCard({
  deal,
  saved,
  isLoggedIn,
  showBusiness = true,
  className,
}: {
  deal: DealCardData;
  saved: boolean;
  isLoggedIn: boolean;
  showBusiness?: boolean;
  className?: string;
}) {
  const headline = dealHeadline(deal);
  const unitLine = unitPriceLine(deal);
  const validity = formatValidity(deal);

  return (
    <article className={cn('relative flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md', deal.isFeatured && 'border-accent/60', className)}>
      <Link href={`/deal/${deal.id}`} className="absolute inset-0 z-0 rounded-2xl" aria-label={`${deal.title} at ${deal.business.name}`} />
      {deal.isFeatured && (
        <span className="absolute -top-2 left-4 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
          Sponsored
        </span>
      )}
      <div className="flex items-start gap-3">
        <BusinessAvatar name={deal.business.name} logoUrl={deal.business.logoUrl} size={44} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-semibold leading-tight">{deal.title}</h3>
          {showBusiness && (
            <p className="relative z-10 mt-0.5 truncate text-sm text-muted">
              <Link href={`/b/${deal.business.slug}`} className="hover:underline">
                {deal.business.name}
              </Link>
              {deal.distanceM != null && <> · {formatDistance(deal.distanceM)}</>}
            </p>
          )}
        </div>
        <div className="relative z-10">
          <SaveButton dealId={deal.id} initiallySaved={saved} isLoggedIn={isLoggedIn} />
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-bold leading-none text-deal">{headline}</div>
          {unitLine && <div className="mt-1 text-xs font-medium text-muted">{unitLine}</div>}
          {validity && <span className="mt-2 inline-block rounded-full bg-surface-2 px-2.5 py-1 text-xs">{validity}</span>}
        </div>
        {deal.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deal.imageUrl} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-xl border border-line bg-white object-contain" />
        )}
      </div>
      {deal.conditions && <p className="mt-2 line-clamp-2 text-xs text-muted">{deal.conditions}</p>}
      <span className="pointer-events-none mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand">
        See deal <ChevronRightIcon className="h-3.5 w-3.5" />
      </span>
    </article>
  );
}
