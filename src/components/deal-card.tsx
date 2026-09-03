import Link from 'next/link';
import { dealHeadline, formatDistance, formatValidity, unitPriceLine } from '@/lib/deals/format';
import type { DealCardData } from '@/lib/deals/types';
import { CANONICAL_ITEM_BY_SLUG } from '@/lib/taxonomy/canonical-items';
import { categoryMeta } from '@/lib/taxonomy/categories';
import { cn } from '@/lib/utils/cn';
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
  const item = deal.slug ? CANONICAL_ITEM_BY_SLUG.get(deal.slug) : undefined;
  const emoji = item ? categoryMeta(item.category).emoji : deal.business.category === 'grocery' ? '\u{1F6D2}' : '\u{1F37D}️';
  const headline = dealHeadline(deal);
  const unitLine = unitPriceLine(deal);
  const validity = formatValidity(deal);

  return (
    <article className={cn('relative flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:shadow-md', deal.isFeatured && 'border-accent/60', className)}>
      {deal.isFeatured && (
        <span className="absolute -top-2 left-4 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
          Sponsored
        </span>
      )}
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-2xl" aria-hidden="true">
          {emoji}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/deal/${deal.id}`} className="block">
            <h3 className="line-clamp-2 font-semibold leading-tight">{deal.title}</h3>
          </Link>
          {showBusiness && (
            <p className="mt-0.5 truncate text-sm text-muted">
              <Link href={`/b/${deal.business.slug}`} className="hover:underline">
                {deal.business.name}
              </Link>
              {deal.distanceM != null && <> · {formatDistance(deal.distanceM)}</>}
            </p>
          )}
        </div>
        <SaveButton dealId={deal.id} initiallySaved={saved} isLoggedIn={isLoggedIn} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-bold leading-none text-deal">{headline}</div>
          {unitLine && <div className="mt-1 text-xs font-medium text-muted">{unitLine}</div>}
        </div>
        {validity && <span className="rounded-full bg-surface-2 px-2.5 py-1 text-right text-xs">{validity}</span>}
      </div>
      {deal.conditions && <p className="mt-2 line-clamp-2 text-xs text-muted">{deal.conditions}</p>}
    </article>
  );
}
