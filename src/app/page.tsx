import Link from 'next/link';
import { BusinessAvatar } from '@/components/business-avatar';
import { DealList } from '@/components/deal-list';
import { ChevronRightIcon, SearchIcon } from '@/components/icons';
import { LocationPicker } from '@/components/location-picker';
import { NeighborhoodChips } from '@/components/neighborhood-chips';
import { PlaceCard } from '@/components/place-card';
import { getCurrentUser } from '@/lib/auth/dal';
import { CITIES, getCity, nearestNeighborhood } from '@/lib/cities';
import { fromRadiusRow } from '@/lib/deals/card-data';
import { formatDistance, formatUnitPrice } from '@/lib/deals/format';
import { getCheapestByItem, getDealsInRadius, getSavedDealIds } from '@/lib/deals/queries';
import { publicEnv } from '@/lib/env';
import { staticMapUrl } from '@/lib/geo/static-map';
import { getLocation, getLocationOrDefault } from '@/lib/location/server';
import { MADISON_PRESETS } from '@/lib/location/presets';
import { getPlacesInRadius } from '@/lib/places/queries';

export default async function HomePage() {
  const city = getCity();
  const saved = await getLocation();
  const { location, isDefault } = await getLocationOrDefault();
  const [{ data: placeRows }, { data: topRated }, { data: dealRows }, { data: top }, user] = await Promise.all([
    getPlacesInRadius(location, { withDeals: true, limit: 10 }),
    getPlacesInRadius(location, { sort: 'rating', limit: 10 }),
    getDealsInRadius(location, { limit: 8, perBusiness: 1 }),
    getCheapestByItem(location, null),
    getCurrentUser(),
  ]);
  const rated = topRated.filter((p) => p.rating != null && (p.review_count ?? 0) >= 50);
  const savedIds = user ? await getSavedDealIds(user.id) : new Set<string>();
  const deals = dealRows.map(fromRadiusRow);
  const teaser = top.slice(0, 6);
  const hood = nearestNeighborhood(city, location.lat, location.lng);
  const hereLabel = isDefault ? `downtown ${city.name}` : location.label;
  const heroMap = publicEnv.mapboxToken
    ? staticMapUrl({ lat: city.center.lat, lng: city.center.lng, zoom: city.zoom, width: 1280, height: 640, token: publicEnv.mapboxToken })
    : null;
  const soon = CITIES.filter((c) => c.status === 'soon');

  return (
    <div className="py-4 sm:py-6">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-[#1c1917] text-white shadow-sm">
        {heroMap && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroMap} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
        <div className="relative grid gap-6 p-5 sm:p-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-end">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-deal" /> You’re in {city.name}, {city.stateCode}
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              Every deal in {city.name}, <span className="text-accent">on one map.</span>
            </h1>
            <p className="mt-3 max-w-lg text-base text-white/85 sm:text-lg">{city.tagline}</p>
            <form action="/deals" method="get" className="relative mt-5 max-w-md">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/50" />
              <input name="q" placeholder="Fish fry, pitcher, ground beef, a bar…" className="h-12 w-full rounded-full border-0 bg-white pl-11 pr-4 text-base text-black shadow-lg outline-none ring-brand focus:ring-2" />
            </form>
            <NeighborhoodChips neighborhoods={city.neighborhoods} activeLabel={location.label} nextPath="/places" tone="onDark" className="mt-4" />
          </div>
          <div className="min-w-0 rounded-2xl bg-white/95 p-4 text-foreground shadow-lg backdrop-blur dark:bg-black/70 dark:text-white">
            <h2 className="mb-2 text-sm font-semibold">Where are you right now?</h2>
            <LocationPicker initial={saved} presets={MADISON_PRESETS} />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Places with deals near {hereLabel}</h2>
            {hood && !isDefault && hood.name !== location.label && <p className="text-sm text-muted">Around {hood.name}</p>}
          </div>
          <Link href="/places?deals=1" className="shrink-0 text-sm font-medium text-brand hover:underline">All places <ChevronRightIcon className="inline h-4 w-4" /></Link>
        </div>
        {placeRows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">No deals within {Math.round(location.radiusM / 1609)} mi yet. Try a neighborhood above.</p>
        ) : (
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {placeRows.map((p) => <PlaceCard key={p.business_id} place={p} compact className="w-56 shrink-0 snap-start sm:w-64" />)}
          </div>
        )}
      </section>

      {rated.length >= 4 && (
        <section className="mt-10">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-xl font-semibold">Top rated near {hereLabel}</h2>
            <Link href="/places?sort=rating" className="text-sm font-medium text-brand hover:underline">See all <ChevronRightIcon className="inline h-4 w-4" /></Link>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {rated.map((p) => <PlaceCard key={p.business_id} place={p} compact className="w-56 shrink-0 snap-start sm:w-64" />)}
          </div>
        </section>
      )}

      {deals.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-xl font-semibold">Deals right now</h2>
            <Link href="/deals" className="text-sm font-medium text-brand hover:underline">See all deals <ChevronRightIcon className="inline h-4 w-4" /></Link>
          </div>
          <DealList deals={deals} savedIds={savedIds} isLoggedIn={!!user} />
        </section>
      )}

      {teaser.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-xl font-semibold">Cheapest per unit</h2>
            <Link href="/cheapest" className="text-sm font-medium text-brand hover:underline">Full leaderboard <ChevronRightIcon className="inline h-4 w-4" /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teaser.map((r) => (
              <Link key={r.canonical_item_slug} href={`/cheapest/${r.canonical_item_slug}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition hover:shadow-md">
                {r.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image_url} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl border border-line bg-white object-contain" />
                ) : (
                  <BusinessAvatar name={r.business_name} logoUrl={r.business_logo_url} size={48} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.display_name}</div>
                  <div className="truncate text-xs text-muted">{r.business_name} · {formatDistance(r.distance_m)}</div>
                </div>
                <div className="shrink-0 font-bold text-deal">{formatUnitPrice(Number(r.unit_price), r.comparable_unit)}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Next stops</h2>
            <p className="text-sm text-muted">Same map, same deals, wherever you land.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {soon.map((c) => (
              <span key={c.slug} className="inline-flex items-center gap-2 rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-muted">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-surface-2 text-[11px] font-bold">{c.stateCode}</span>
                {c.name} <span className="text-[11px] uppercase tracking-wide">soon</span>
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
