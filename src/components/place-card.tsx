import Link from 'next/link';
import { categoryLabel, formatDistance, formatMoney } from '@/lib/deals/format';
import { instagramUrl, streetOnly, type PlaceRow } from '@/lib/places/types';
import { cn } from '@/lib/utils/cn';
import { BusinessAvatar } from './business-avatar';
import { GlobeIcon, InstagramIcon } from './icons';

/** A business tile for the directory: photo (or best deal photo, or a big logo), name, distance, deal count, real-world links. */
export function PlaceCard({ place, className, compact = false }: { place: PlaceRow; className?: string; compact?: boolean }) {
  const street = streetOnly(place.address);
  const visual = place.photo_url ? 'photo' : place.top_deal_image ? 'deal' : 'logo';

  return (
    <article className={cn('group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md', place.is_featured && 'border-accent/60', className)}>
      <Link href={`/b/${place.slug}`} className="absolute inset-0 z-0" aria-label={`${place.name}: ${place.deal_count} deals`} />
      <div className={cn('relative w-full overflow-hidden bg-surface-2', compact ? 'aspect-[5/3]' : 'aspect-[4/3]')}>
        {visual === 'photo' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.photo_url!} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        )}
        {visual === 'deal' && (
          <div className="grid h-full w-full place-items-center bg-white p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={place.top_deal_image!} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
          </div>
        )}
        {visual === 'logo' && (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-surface-2 to-brand-soft">
            <BusinessAvatar name={place.name} logoUrl={place.logo_url} size={compact ? 56 : 80} className="rounded-2xl shadow-sm" />
          </div>
        )}
        {place.deal_count > 0 ? (
          <span className="absolute left-3 top-3 rounded-full bg-deal px-2.5 py-1 text-xs font-bold text-white shadow">
            {place.deal_count} deal{place.deal_count === 1 ? '' : 's'}
          </span>
        ) : (
          <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">No deals yet</span>
        )}
        {place.is_featured && (
          <span className="absolute right-3 top-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">Sponsored</span>
        )}
        {visual === 'photo' && (
          <div className="absolute bottom-3 left-3">
            <BusinessAvatar name={place.name} logoUrl={place.logo_url} size={44} className="rounded-xl shadow-md ring-2 ring-white/90" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2.5 p-3">
        {visual !== 'photo' && <BusinessAvatar name={place.name} logoUrl={place.logo_url} size={36} />}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold leading-tight">{place.name}</h3>
          <p className="truncate text-xs text-muted">
            {categoryLabel(place.category)} · {formatDistance(place.distance_m)}
            {street && <> · {street}</>}
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          {place.instagram_handle && (
            <a href={instagramUrl(place.instagram_handle)} target="_blank" rel="noopener" aria-label={`${place.name} on Instagram`} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-brand-soft hover:text-brand">
              <InstagramIcon className="h-4 w-4" />
            </a>
          )}
          {place.website_url && (
            <a href={place.website_url} target="_blank" rel="noopener" aria-label={`${place.name} website`} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-brand-soft hover:text-brand">
              <GlobeIcon className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
      {!compact && place.top_deal_title && (
        <p className="truncate px-3 pb-3 text-xs font-medium text-deal">
          {place.top_deal_price != null && <span className="font-bold">{formatMoney(place.top_deal_price)} · </span>}
          {place.top_deal_title}
        </p>
      )}
    </article>
  );
}
