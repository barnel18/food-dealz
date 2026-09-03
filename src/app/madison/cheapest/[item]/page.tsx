import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DealList } from '@/components/deal-list';
import { fromRadiusRow } from '@/lib/deals/card-data';
import { formatUnitPrice } from '@/lib/deals/format';
import type { DealInRadius } from '@/lib/deals/types';
import { isSupabaseConfigured, launch, publicEnv } from '@/lib/env';
import { createStaticClient } from '@/lib/supabase/static';
import { CANONICAL_ITEMS, CANONICAL_ITEM_BY_SLUG } from '@/lib/taxonomy/canonical-items';
import { categoryMeta } from '@/lib/taxonomy/categories';

/** Public, crawlable "cheapest X in Madison" pages. Regenerated hourly (ISR); no cookies used. */
export const revalidate = 3600;

export function generateStaticParams() {
  return CANONICAL_ITEMS.map((i) => ({ item: i.slug }));
}

export async function generateMetadata(props: PageProps<'/madison/cheapest/[item]'>): Promise<Metadata> {
  const { item } = await props.params;
  const ci = CANONICAL_ITEM_BY_SLUG.get(item);
  if (!ci) return {};
  const name = ci.displayName.toLowerCase();
  return {
    title: `Cheapest ${name} in ${launch.city}`,
    description: `Where to get the cheapest ${name} in ${launch.city} right now. Live restaurant specials and grocery sale prices, compared per unit.`,
    alternates: { canonical: `${publicEnv.appUrl}/${launch.slug}/cheapest/${ci.slug}` },
  };
}

async function loadDeals(slug: string): Promise<DealInRadius[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createStaticClient();
  const { data, error } = await supabase.rpc('deals_in_radius', {
    p_lat: launch.lat,
    p_lng: launch.lng,
    p_radius_m: Math.round(launch.radiusKm * 1000),
    p_item: slug,
    p_limit: 50,
  });
  if (error) {
    console.error('[seo deals_in_radius]', error.message);
    return [];
  }
  return (data ?? []) as DealInRadius[];
}

export default async function CityItemPage(props: PageProps<'/madison/cheapest/[item]'>) {
  const { item } = await props.params;
  const ci = CANONICAL_ITEM_BY_SLUG.get(item);
  if (!ci) notFound();

  const deals = (await loadDeals(item))
    .map(fromRadiusRow)
    .sort((a, b) => (a.unitPrice ?? Infinity) - (b.unitPrice ?? Infinity));
  const best = deals.find((d) => d.unitPrice != null);
  const name = ci.displayName.toLowerCase();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Cheapest ${name} in ${launch.city}`,
    itemListElement: deals.slice(0, 20).map((d, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Offer',
        name: d.title,
        ...(d.price != null ? { price: d.price, priceCurrency: 'USD' } : {}),
        url: `${publicEnv.appUrl}/deal/${d.id}`,
        offeredBy: { '@type': d.business.category === 'grocery' ? 'GroceryStore' : 'Restaurant', name: d.business.name },
      },
    })),
  };

  return (
    <div className="py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">{launch.city}</p>
      <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight">
        <span aria-hidden="true">{categoryMeta(ci.category).emoji}</span> Cheapest {name} in Madison
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        {best?.unitPrice != null
          ? `Right now the best price is ${formatUnitPrice(best.unitPrice, ci.comparableUnit)} at ${best.business.name}. ${deals.length} live deal${deals.length === 1 ? '' : 's'} across the Madison area, updated hourly.`
          : `No live ${name} deals in the Madison area at the moment. Check back soon, or browse everything nearby.`}
      </p>
      <p className="mt-3 text-sm">
        <Link href={`/cheapest/${ci.slug}`} className="font-medium text-brand hover:underline">Sort by distance from you →</Link>
      </p>
      <div className="mt-6">
        {deals.length > 0 ? (
          <DealList deals={deals} savedIds={new Set()} isLoggedIn={false} />
        ) : (
          <Link href="/deals" className="inline-flex rounded-full bg-brand px-5 py-2 font-semibold text-white">Browse all deals</Link>
        )}
      </div>
    </div>
  );
}
