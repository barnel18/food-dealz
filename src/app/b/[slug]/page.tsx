import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BusinessAvatar } from '@/components/business-avatar';
import { DealList } from '@/components/deal-list';
import { EmptyState } from '@/components/empty-state';
import { ExternalLinkIcon, InstagramIcon, MapPinIcon, PhoneIcon } from '@/components/icons';
import { PlaceCard } from '@/components/place-card';
import { SetupNotice } from '@/components/setup-notice';
import { getCurrentUser } from '@/lib/auth/dal';
import { getCity, nearestNeighborhood } from '@/lib/cities';
import { fromDetail } from '@/lib/deals/card-data';
import { categoryLabel, formatDistance, relativeTime, sourceLabel } from '@/lib/deals/format';
import { getBusinessBySlug, getSavedDealIds } from '@/lib/deals/queries';
import type { SourceType } from '@/lib/deals/types';
import { publicEnv } from '@/lib/env';
import { haversineM } from '@/lib/geo/distance';
import { staticMapUrl } from '@/lib/geo/static-map';
import { getLocation } from '@/lib/location/server';
import { getBusinessProfile, getPlacesAround } from '@/lib/places/queries';
import { instagramUrl } from '@/lib/places/types';

export async function generateMetadata(props: PageProps<'/b/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const { data } = await getBusinessBySlug(slug);
  return data ? { title: `${data.business.name} deals` } : { title: 'Business' };
}

const PILL = 'inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-brand hover:text-brand';

export default async function BusinessPage(props: PageProps<'/b/[slug]'>) {
  const { slug } = await props.params;
  const [{ data, error }, profile, user, loc] = await Promise.all([getBusinessBySlug(slug), getBusinessProfile(slug), getCurrentUser(), getLocation()]);
  if (error && !data) return <div className="py-6"><SetupNotice error={error} /></div>;
  if (!data) notFound();

  const b = data.business;
  const city = getCity();
  const hasCoords = b.lat != null && b.lng != null;
  const distanceM = loc && hasCoords ? haversineM(loc.lat, loc.lng, b.lat!, b.lng!) : null;
  const hood = hasCoords ? nearestNeighborhood(city, b.lat!, b.lng!) : null;
  const deals = data.deals.map((d) => fromDetail({ ...d, business: b }, distanceM));
  const [savedIds, nearby] = await Promise.all([
    user ? getSavedDealIds(user.id) : Promise.resolve(new Set<string>()),
    hasCoords ? getPlacesAround(b.lat!, b.lng!, 900, 9) : Promise.resolve([]),
  ]);
  const neighbours = nearby.filter((p) => p.business_id !== b.id).slice(0, 8);
  const mapsQuery = encodeURIComponent(`${b.name} ${b.address ?? `${city.name}, ${city.stateCode}`}`);
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}${b.google_place_id ? `&query_place_id=${b.google_place_id}` : ''}`;
  const heroMap = !b.photo_url && hasCoords && publicEnv.mapboxToken
    ? staticMapUrl({ lat: b.lat!, lng: b.lng!, zoom: 15.5, width: 1280, height: 480, token: publicEnv.mapboxToken })
    : null;
  const posts = (profile?.posts ?? []).filter((p) => p.image);
  const sources = (profile?.source_types ?? []) as SourceType[];

  return (
    <div className="py-4 sm:py-6">
      <Link href="/places" className="text-sm text-muted hover:text-foreground">← Places near you</Link>
      <header className="mt-3 overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <div className="relative h-44 w-full bg-surface-2 sm:h-64">
          {b.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.photo_url} alt="" className="h-full w-full object-cover" />
          ) : heroMap ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroMap} alt={`Map of ${b.name}`} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-surface-2 to-brand-soft" />
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-5 flex items-end gap-4 sm:left-7">
            <BusinessAvatar name={b.name} logoUrl={b.logo_url} size={80} className="rounded-2xl shadow-lg ring-4 ring-white/90" />
            <div className="pb-1 text-white drop-shadow">
              <p className="text-xs font-semibold uppercase tracking-wide">{categoryLabel(b.category)}{hood ? ` · ${hood.name}` : ''}</p>
              <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{b.name}</h1>
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-7">
          <p className="text-muted">
            {b.address ?? `${city.name}, ${city.stateCode}`}
            {distanceM != null && <> · {formatDistance(distanceM)} from you</>}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={mapsHref} target="_blank" rel="noopener" className={`${PILL} border-brand bg-brand text-white hover:bg-brand-strong hover:text-white`}>
              <MapPinIcon className="h-4 w-4" /> Directions
            </a>
            {b.website_url && (
              <a href={b.website_url} target="_blank" rel="noopener" className={PILL}><ExternalLinkIcon className="h-4 w-4" /> Website</a>
            )}
            {profile?.instagram_handle && (
              <a href={instagramUrl(profile.instagram_handle)} target="_blank" rel="noopener" className={PILL}><InstagramIcon className="h-4 w-4" /> @{profile.instagram_handle}</a>
            )}
            {b.phone && (
              <a href={`tel:${b.phone}`} className={PILL}><PhoneIcon className="h-4 w-4" /> {b.phone}</a>
            )}
          </div>
          {(sources.length > 0 || profile?.last_checked_at) && (
            <p className="mt-4 text-xs text-muted">
              {sources.length > 0 && <>Deals come from their {sources.map(sourceLabel).map((s) => s.toLowerCase()).join(', ')}</>}
              {profile?.last_checked_at && <> · checked {relativeTime(profile.last_checked_at)}</>}
            </p>
          )}
        </div>
      </header>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Deals right now ({deals.length})</h2>
        {error && <div className="mb-4"><SetupNotice error={error} /></div>}
        {deals.length === 0 ? (
          <EmptyState title="No live deals right now" description="We check this place regularly. Save it and check back." />
        ) : (
          <DealList deals={deals} savedIds={savedIds} isLoggedIn={!!user} showBusiness={false} />
        )}
      </section>

      {posts.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-semibold">Latest on Instagram</h2>
            {profile?.instagram_handle && (
              <a href={instagramUrl(profile.instagram_handle)} target="_blank" rel="noopener" className="text-sm font-medium text-brand hover:underline">@{profile.instagram_handle}</a>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {posts.map((p) => (
              <a key={p.id} href={p.url ?? (profile?.instagram_handle ? instagramUrl(profile.instagram_handle) : '#')} target="_blank" rel="noopener" className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-2" title={p.caption}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image!} alt={p.caption.slice(0, 80)} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
              </a>
            ))}
          </div>
        </section>
      )}

      {neighbours.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-semibold">More deals within a short walk</h2>
            <Link href="/places?deals=1" className="text-sm font-medium text-brand hover:underline">All places</Link>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {neighbours.map((p) => <PlaceCard key={p.business_id} place={p} compact className="w-56 shrink-0 snap-start" />)}
          </div>
        </section>
      )}

      <p className="mt-10 text-sm text-muted">Own {b.name}? Claiming your listing to post deals directly is coming soon.</p>
    </div>
  );
}
