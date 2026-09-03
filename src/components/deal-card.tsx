import Link from 'next/link';
import { dealHeadline, formatDistance, formatValidity, unitPriceLine } from '@/lib/deals/format';
import type { DealCardData } from '@/lib/deals/types';
import { cn } from '@/lib/utils/cn';
import { BusinessAvatar } from './business-avatar';
import { SaveButton } from './save-button';

/** Image-first deal tile: the product (or the place) up top with the price stamped on it, one line of context below. */
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
  const visual = deal.imageUrl ? 'product' : deal.business.photoUrl ? 'photo' : 'logo';

  return (
    <article className={cn('group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md', deal.isFeatured && 'border-accent/60', className)}>
      <Link href={`/deal/${deal.id}`} className="absolute inset-0 z-0" aria-label={`${deal.title} at ${deal.business.name}`} />
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
        {visual === 'product' && (
          <div className="grid h-full w-full place-items-center bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={deal.imageUrl!} alt="" loading="lazy" className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-[1.04]" />
          </div>
        )}
        {visual === 'photo' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deal.business.photoUrl!} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        )}
        {visual === 'logo' && (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-surface-2 to-brand-soft">
            <BusinessAvatar name={deal.business.name} logoUrl={deal.business.logoUrl} size={72} className="rounded-2xl shadow-sm" />
          </div>
        )}
        <div className="absolute bottom-2.5 left-2.5 rounded-xl bg-white/95 px-2.5 py-1.5 shadow-md dark:bg-black/80">
          <div className="text-lg font-bold leading-none text-deal">{headline}</div>
          {unitLine && <div className="mt-0.5 text-[11px] font-medium text-muted">{unitLine}</div>}
        </div>
        {validity && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">{validity}</span>
        )}
        {deal.isFeatured && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">Sponsored</span>
        )}
        <div className={cn('absolute z-10 rounded-full bg-white/90 shadow dark:bg-black/70', deal.isFeatured ? 'bottom-2.5 right-2.5' : 'right-2 top-2')}>
          <SaveButton dealId={deal.id} initiallySaved={saved} isLoggedIn={isLoggedIn} />
        </div>
      </div>
      <div className="flex items-center gap-2.5 p-3">
        {showBusiness && <BusinessAvatar name={deal.business.name} logoUrl={deal.business.logoUrl} size={34} />}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-sm font-semibold leading-tight">{deal.title}</h3>
          {showBusiness ? (
            <p className="relative z-10 truncate text-xs text-muted">
              <Link href={`/b/${deal.business.slug}`} className="hover:underline">{deal.business.name}</Link>
              {deal.distanceM != null && <> · {formatDistance(deal.distanceM)}</>}
            </p>
          ) : (
            deal.conditions && <p className="truncate text-xs text-muted">{deal.conditions}</p>
          )}
        </div>
      </div>
    </article>
  );
}
