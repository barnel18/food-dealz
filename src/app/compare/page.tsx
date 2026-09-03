import type { Metadata } from 'next';
import Link from 'next/link';
import { BusinessAvatar } from '@/components/business-avatar';
import { EmptyState } from '@/components/empty-state';
import { LocationBar } from '@/components/location-bar';
import { SetupNotice } from '@/components/setup-notice';
import { formatDistance, formatUnitPrice } from '@/lib/deals/format';
import { getStorePrices } from '@/lib/deals/queries';
import { getLocationOrDefault } from '@/lib/location/server';
import { CANONICAL_ITEMS, CANONICAL_ITEM_BY_SLUG } from '@/lib/taxonomy/canonical-items';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = { title: 'Compare grocery stores' };

const DEFAULT_BASKET = ['ground_beef_lb', 'chicken_breast_lb', 'eggs_dozen', 'milk_gallon', 'bananas_lb', 'bread_loaf', 'cheese_block_lb', 'butter_lb'];
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ComparePage(props: PageProps<'/compare'>) {
  const sp = await props.searchParams;
  const raw = [...(first(sp.items) ?? '').split(','), ...(Array.isArray(sp.i) ? sp.i : sp.i ? [sp.i] : [])];
  const requested = raw.map((s) => s.trim()).filter((s) => CANONICAL_ITEM_BY_SLUG.has(s));
  const basket = requested.length ? requested.slice(0, 12) : DEFAULT_BASKET;
  const { location, isDefault } = await getLocationOrDefault();
  const { data: rows, error } = await getStorePrices(location, basket);

  const stores = new Map<string, { name: string; slug: string; logo: string | null; distance: number; prices: Map<string, (typeof rows)[number]> }>();
  for (const r of rows) {
    const s = stores.get(r.business_id) ?? { name: r.business_name, slug: r.business_slug, logo: r.business_logo_url, distance: Number(r.distance_m), prices: new Map() };
    s.prices.set(r.canonical_item_slug, r);
    stores.set(r.business_id, s);
  }
  const ranked = [...stores.values()]
    .map((s) => ({ ...s, covered: basket.filter((b) => s.prices.has(b)).length, total: basket.reduce((sum, b) => sum + (s.prices.get(b) ? Number(s.prices.get(b)!.unit_price) : 0), 0) }))
    .sort((a, b) => b.covered - a.covered || a.total - b.total);
  const bestPer = new Map<string, number>();
  for (const b of basket) {
    const vals = ranked.map((s) => s.prices.get(b)).filter(Boolean).map((r) => Number(r!.unit_price));
    if (vals.length) bestPer.set(b, Math.min(...vals));
  }
  const groceryItems = CANONICAL_ITEMS.filter((i) => i.businessCategory === 'grocery');

  return (
    <div className="pb-8">
      <LocationBar location={location} isDefault={isDefault} />
      <h1 className="text-2xl font-bold tracking-tight">Compare grocery stores</h1>
      <p className="mb-4 text-sm text-muted">Current sale prices per unit at every store in your radius. Green cells are the cheapest for that item. Pick items to build your own basket.</p>
      <details className="mb-4 rounded-2xl border border-line bg-surface p-3 text-sm">
        <summary className="cursor-pointer font-medium">Choose items ({basket.length} selected)</summary>
        <form className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-4">
          {groceryItems.map((i) => (
            <label key={i.slug} className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" name="i" value={i.slug} defaultChecked={basket.includes(i.slug)} className="accent-brand" /> {i.displayName}
            </label>
          ))}
          <div className="col-span-2 mt-2 sm:col-span-4"><CompareSubmit /></div>
        </form>
      </details>
      {error && <div className="mb-4"><SetupNotice error={error} /></div>}
      {ranked.length === 0 && !error ? (
        <EmptyState title="No grocery sale prices in range yet" description="Widen the radius, or check back after the next weekly-ad crawl." action={{ href: '/cheapest?cat=grocery', label: 'Cheapest grocery items' }} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="p-2">Store</th>
                {basket.map((b) => <th key={b} className="p-2 font-medium">{CANONICAL_ITEM_BY_SLUG.get(b)?.displayName}</th>)}
                <th className="p-2">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((s) => (
                <tr key={s.slug} className="border-t border-line">
                  <td className="p-2">
                    <Link href={`/b/${s.slug}`} className="flex items-center gap-2 hover:underline">
                      <BusinessAvatar name={s.name} logoUrl={s.logo} size={28} />
                      <span><span className="font-medium">{s.name}</span><span className="block text-xs text-muted">{formatDistance(s.distance)}</span></span>
                    </Link>
                  </td>
                  {basket.map((b) => {
                    const r = s.prices.get(b);
                    const item = CANONICAL_ITEM_BY_SLUG.get(b)!;
                    const best = r && bestPer.get(b) === Number(r.unit_price);
                    return (
                      <td key={b} className={cn('p-2 tabular-nums', best && 'bg-deal-soft font-semibold text-deal')}>
                        {r ? <Link href={`/deal/${r.deal_id}`} title={r.title}>{formatUnitPrice(Number(r.unit_price), item.comparableUnit)}</Link> : <span className="text-muted">—</span>}
                      </td>
                    );
                  })}
                  <td className="p-2 text-xs text-muted">{s.covered}/{basket.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">Only items currently on sale appear; regular shelf prices aren’t tracked yet.</p>
    </div>
  );
}

function CompareSubmit() {
  return <button className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white">Update basket</button>;
}
