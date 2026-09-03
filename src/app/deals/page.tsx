import Link from 'next/link';
import type { Metadata } from 'next';
import { DealFilters, filterHref } from '@/components/deal-filters';
import { DealList } from '@/components/deal-list';
import { EmptyState } from '@/components/empty-state';
import { LocationBar } from '@/components/location-bar';
import { SetupNotice } from '@/components/setup-notice';
import { getCurrentUser } from '@/lib/auth/dal';
import { fromRadiusRow } from '@/lib/deals/card-data';
import { getDealsInRadius, getSavedDealIds } from '@/lib/deals/queries';
import { getLocationOrDefault } from '@/lib/location/server';
import { metersToMiles } from '@/lib/location/cookie';
import { CANONICAL_ITEM_BY_SLUG, type BusinessCategory } from '@/lib/taxonomy/canonical-items';

export const metadata: Metadata = { title: 'Deals near you' };

const PAGE_SIZE = 30;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function DealsPage(props: PageProps<'/deals'>) {
  const sp = await props.searchParams;
  const cat = first(sp.cat);
  const category: BusinessCategory | null = cat === 'restaurant' || cat === 'grocery' ? cat : null;
  const itemParam = first(sp.item);
  const item = itemParam && CANONICAL_ITEM_BY_SLUG.has(itemParam) ? itemParam : null;
  const todayOnly = first(sp.today) === '1';
  const offset = Math.max(0, parseInt(first(sp.offset) ?? '0', 10) || 0);

  const { location, isDefault } = await getLocationOrDefault();
  const [{ data: rows, error }, user] = await Promise.all([
    getDealsInRadius(location, { category, item, todayOnly, limit: PAGE_SIZE, offset }),
    getCurrentUser(),
  ]);
  const savedIds = user ? await getSavedDealIds(user.id) : new Set<string>();
  const deals = rows.map(fromRadiusRow);
  const state = { category, item, todayOnly };
  const nextHref = `${filterHref('/deals', state)}${filterHref('/deals', state).includes('?') ? '&' : '?'}offset=${offset + PAGE_SIZE}`;

  return (
    <div className="pb-8">
      <LocationBar location={location} isDefault={isDefault} />
      <DealFilters state={state} />
      {error && <div className="mb-4"><SetupNotice error={error} /></div>}
      {deals.length === 0 && !error ? (
        <EmptyState
          title={`No deals within ${Math.round(metersToMiles(location.radiusM))} mi`}
          description="Try a bigger radius, clear the filters, or pick a different spot."
          action={{ href: '/', label: 'Change location' }}
        />
      ) : (
        <DealList deals={deals} savedIds={savedIds} isLoggedIn={!!user} />
      )}
      {deals.length === PAGE_SIZE && (
        <div className="mt-6 text-center">
          <Link href={nextHref} className="inline-flex rounded-full border border-line bg-surface px-5 py-2 text-sm font-medium hover:border-brand hover:text-brand">
            Load more
          </Link>
        </div>
      )}
    </div>
  );
}
