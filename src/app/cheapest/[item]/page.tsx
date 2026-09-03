import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { DealList } from '@/components/deal-list';
import { EmptyState } from '@/components/empty-state';
import { LocationBar } from '@/components/location-bar';
import { SetupNotice } from '@/components/setup-notice';
import { DealGridSkeleton } from '@/components/skeletons';
import { getCurrentUser } from '@/lib/auth/dal';
import { fromRadiusRow } from '@/lib/deals/card-data';
import { formatUnitPrice } from '@/lib/deals/format';
import { getDealsInRadius, getSavedDealIds } from '@/lib/deals/queries';
import { metersToMiles, type UserLocation } from '@/lib/location/cookie';
import { getLocationOrDefault } from '@/lib/location/server';
import { CANONICAL_ITEM_BY_SLUG, type CanonicalItem } from '@/lib/taxonomy/canonical-items';
import { categoryMeta } from '@/lib/taxonomy/categories';

export async function generateMetadata(props: PageProps<'/cheapest/[item]'>): Promise<Metadata> {
  const { item } = await props.params;
  const ci = CANONICAL_ITEM_BY_SLUG.get(item);
  return { title: ci ? `Cheapest ${ci.displayName.toLowerCase()} near you` : 'Item' };
}

export default async function CheapestItemPage(props: PageProps<'/cheapest/[item]'>) {
  const { item } = await props.params;
  const ci = CANONICAL_ITEM_BY_SLUG.get(item);
  if (!ci) notFound();
  const { location, isDefault } = await getLocationOrDefault();

  return (
    <div className="pb-8">
      <LocationBar location={location} isDefault={isDefault} />
      <Suspense
        fallback={
          <>
            <ItemHeader ci={ci} location={location} subtitle="Loading deals…" />
            <DealGridSkeleton />
          </>
        }
      >
        <ItemSection ci={ci} location={location} />
      </Suspense>
    </div>
  );
}

function ItemHeader({ ci, location, subtitle }: { ci: CanonicalItem; location: UserLocation; subtitle: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-3xl" aria-hidden="true">{categoryMeta(ci.category).emoji}</span>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{ci.displayName}</h1>
        <p className="text-sm text-muted">
          {subtitle}
          {' '}· within {Math.round(metersToMiles(location.radiusM))} mi
        </p>
      </div>
    </div>
  );
}

async function ItemSection({ ci, location }: { ci: CanonicalItem; location: UserLocation }) {
  const [{ data: rows, error }, user] = await Promise.all([
    getDealsInRadius(location, { item: ci.slug, limit: 100 }),
    getCurrentUser(),
  ]);
  const savedIds = user ? await getSavedDealIds(user.id) : new Set<string>();
  const deals = rows.map(fromRadiusRow).sort((a, b) => {
    if (a.unitPrice == null && b.unitPrice == null) return (a.distanceM ?? 0) - (b.distanceM ?? 0);
    if (a.unitPrice == null) return 1;
    if (b.unitPrice == null) return -1;
    return a.unitPrice - b.unitPrice;
  });
  const best = deals.find((d) => d.unitPrice != null);
  const subtitle = (
    <>
      {deals.length} deal{deals.length === 1 ? '' : 's'}
      {best?.unitPrice != null && <> · best {formatUnitPrice(best.unitPrice, ci.comparableUnit)} at {best.business.name}</>}
    </>
  );

  return (
    <>
      <ItemHeader ci={ci} location={location} subtitle={subtitle} />
      {error && <div className="mb-4"><SetupNotice error={error} /></div>}
      {deals.length === 0 && !error ? (
        <EmptyState title={`No ${ci.displayName.toLowerCase()} deals nearby`} description="Try a bigger radius or a different spot." action={{ href: '/cheapest', label: 'Back to leaderboard' }} />
      ) : (
        <DealList deals={deals} savedIds={savedIds} isLoggedIn={!!user} />
      )}
    </>
  );
}
