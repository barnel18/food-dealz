import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { GridIcon, MapIcon, SearchIcon } from '@/components/icons';
import { LocationBar } from '@/components/location-bar';
import { NeighborhoodChips } from '@/components/neighborhood-chips';
import { PlaceCard } from '@/components/place-card';
import { PlacesMapLazy } from '@/components/places-map-lazy';
import { SetupNotice } from '@/components/setup-notice';
import { getCity } from '@/lib/cities';
import { metersToMiles } from '@/lib/location/cookie';
import { getLocationOrDefault } from '@/lib/location/server';
import { getPlacesInRadius } from '@/lib/places/queries';
import type { BusinessCategory } from '@/lib/taxonomy/canonical-items';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = { title: 'Places near you' };

const PAGE_SIZE = 36;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function href(params: Record<string, string | null | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const qs = p.toString();
  return qs ? `/places?${qs}` : '/places';
}

function Chip({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={to} className={cn('inline-flex h-9 items-center rounded-full border px-3 text-sm font-medium transition', active ? 'border-brand bg-brand text-white' : 'border-line bg-surface hover:border-brand hover:text-brand')}>
      {children}
    </Link>
  );
}

export default async function PlacesPage(props: PageProps<'/places'>) {
  const sp = await props.searchParams;
  const cat = first(sp.cat);
  const category: BusinessCategory | null = cat === 'restaurant' || cat === 'grocery' ? cat : null;
  const query = (first(sp.q) ?? '').trim().slice(0, 80) || null;
  const withDeals = first(sp.deals) === '1';
  const view = first(sp.view) === 'map' ? 'map' : 'grid';
  const offset = Math.max(0, parseInt(first(sp.offset) ?? '0', 10) || 0);
  const city = getCity();

  const { location, isDefault } = await getLocationOrDefault();
  const { data: places, error } = await getPlacesInRadius(location, {
    category, query, withDeals,
    limit: view === 'map' ? 300 : PAGE_SIZE,
    offset: view === 'map' ? 0 : offset,
  });
  const base = { cat: category, q: query, deals: withDeals ? '1' : null, view: view === 'map' ? 'map' : null };
  const miles = Math.round(metersToMiles(location.radiusM));
  const withDealCount = places.filter((p) => p.deal_count > 0).length;

  return (
    <div className="pb-8">
      <LocationBar location={location} isDefault={isDefault} />
      <NeighborhoodChips neighborhoods={city.neighborhoods} activeLabel={location.label} nextPath={href(base)} className="mb-3" />

      <div className="flex flex-col gap-2 pb-4 sm:flex-row sm:flex-wrap sm:items-center">
        <form action="/places" method="get" className="relative flex-1 sm:max-w-xs">
          {category && <input type="hidden" name="cat" value={category} />}
          {withDeals && <input type="hidden" name="deals" value="1" />}
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={query ?? ''} placeholder="Find a place by name or street" className="h-9 w-full rounded-full border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-brand" />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <Chip to={href({ ...base, cat: null })} active={category === null}>All</Chip>
          <Chip to={href({ ...base, cat: 'restaurant' })} active={category === 'restaurant'}>Restaurants & bars</Chip>
          <Chip to={href({ ...base, cat: 'grocery' })} active={category === 'grocery'}>Grocery</Chip>
          <Chip to={href({ ...base, deals: withDeals ? null : '1' })} active={withDeals}>With deals</Chip>
        </div>
        <div className="ml-auto inline-flex rounded-full border border-line bg-surface p-0.5">
          <Link href={href({ ...base, view: null })} aria-label="Grid view" className={cn('grid h-8 w-8 place-items-center rounded-full', view === 'grid' ? 'bg-brand text-white' : 'text-muted hover:text-foreground')}><GridIcon className="h-4 w-4" /></Link>
          <Link href={href({ ...base, view: 'map' })} aria-label="Map view" className={cn('grid h-8 w-8 place-items-center rounded-full', view === 'map' ? 'bg-brand text-white' : 'text-muted hover:text-foreground')}><MapIcon className="h-4 w-4" /></Link>
        </div>
      </div>

      {error && <div className="mb-4"><SetupNotice error={error} /></div>}
      <p className="mb-3 text-sm text-muted">
        {places.length}{places.length === PAGE_SIZE && view === 'grid' ? '+' : ''} places within {miles} mi{query ? ` matching “${query}”` : ''} · {withDealCount} with live deals
      </p>

      {places.length === 0 && !error ? (
        <EmptyState title={`No places within ${miles} mi`} description="Widen the radius or pick a neighborhood above." emoji="🗺️" />
      ) : view === 'map' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <PlacesMapLazy
            pins={places.map((p) => ({ id: p.business_id, name: p.name, slug: p.slug, category: p.category, lat: p.lat, lng: p.lng, logoUrl: p.logo_url, dealCount: p.deal_count, distanceM: p.distance_m }))}
            center={{ lat: location.lat, lng: location.lng }}
            radiusM={location.radiusM}
            className="h-[70vh] min-h-96 w-full overflow-hidden rounded-2xl border border-line"
          />
          <div className="hidden max-h-[70vh] space-y-2 overflow-y-auto pr-1 lg:block">
            {places.filter((p) => p.deal_count > 0).slice(0, 40).map((p) => <PlaceCard key={p.business_id} place={p} compact />)}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {places.map((p) => <PlaceCard key={p.business_id} place={p} />)}
        </div>
      )}

      {view === 'grid' && places.length === PAGE_SIZE && (
        <div className="mt-6 text-center">
          <Link href={`${href(base)}${href(base).includes('?') ? '&' : '?'}offset=${offset + PAGE_SIZE}`} className="inline-flex rounded-full border border-line bg-surface px-5 py-2 text-sm font-medium hover:border-brand hover:text-brand">
            Load more places
          </Link>
        </div>
      )}
    </div>
  );
}
