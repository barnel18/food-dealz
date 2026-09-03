import Link from 'next/link';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/empty-state';
import { Leaderboard } from '@/components/leaderboard';
import { LocationBar } from '@/components/location-bar';
import { SetupNotice } from '@/components/setup-notice';
import { getCheapestByItem } from '@/lib/deals/queries';
import { getLocationOrDefault } from '@/lib/location/server';
import type { BusinessCategory } from '@/lib/taxonomy/canonical-items';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = { title: 'Cheapest near you' };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CheapestPage(props: PageProps<'/cheapest'>) {
  const sp = await props.searchParams;
  const cat = first(sp.cat);
  const category: BusinessCategory | null = cat === 'restaurant' || cat === 'grocery' ? cat : null;
  const { location, isDefault } = await getLocationOrDefault();
  const { data: rows, error } = await getCheapestByItem(location, category);

  const tabs: Array<{ label: string; value: BusinessCategory | null }> = [
    { label: 'Everything', value: null },
    { label: 'Restaurants', value: 'restaurant' },
    { label: 'Grocery', value: 'grocery' },
  ];

  return (
    <div className="pb-8">
      <LocationBar location={location} isDefault={isDefault} />
      <div className="mb-1">
        <h1 className="text-2xl font-bold tracking-tight">Cheapest by item</h1>
        <p className="text-sm text-muted">The lowest unit price for each item within your radius. Tap an item to see every option.</p>
      </div>
      <div className="my-4 flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.value ? `/cheapest?cat=${t.value}` : '/cheapest'}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium',
              category === t.value ? 'border-brand bg-brand text-white' : 'border-line bg-surface hover:border-brand hover:text-brand',
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {error && <div className="mb-4"><SetupNotice error={error} /></div>}
      {rows.length === 0 && !error ? (
        <EmptyState title="No comparable deals yet" description="Deals need a price per unit to rank here. Widen the radius or check back after the next crawl." action={{ href: '/deals', label: 'See all deals' }} />
      ) : (
        <Leaderboard rows={rows} />
      )}
    </div>
  );
}
