import Link from 'next/link';
import { LocationPicker } from '@/components/location-picker';
import { ChevronRightIcon } from '@/components/icons';
import { formatDistance, formatUnitPrice } from '@/lib/deals/format';
import { getCheapestByItem } from '@/lib/deals/queries';
import { getLocation, getLocationOrDefault } from '@/lib/location/server';
import { MADISON_PRESETS } from '@/lib/location/presets';
import { BusinessAvatar } from '@/components/business-avatar';

export default async function HomePage() {
  const saved = await getLocation();
  const { location } = await getLocationOrDefault();
  const { data: top } = await getCheapestByItem(location, null);
  const teaser = top.slice(0, 6);

  return (
    <div className="py-8 sm:py-12">
      <section className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-start">
        <div>
          <p className="mb-3 inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
            Madison, WI
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Every food deal in town, <span className="text-brand">ranked by price.</span>
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted">
            Restaurant specials and grocery sale prices within a radius you choose, compared per slice, per pound, and per pint.
            Fish fry Fridays included.
          </p>
          {saved && (
            <Link href="/deals" className="mt-6 inline-flex items-center gap-1 font-semibold text-brand hover:underline">
              Continue to deals near {saved.label} <ChevronRightIcon className="h-4 w-4" />
            </Link>
          )}
        </div>
        <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Where are you?</h2>
          <LocationPicker initial={saved} presets={MADISON_PRESETS} />
        </div>
      </section>

      {teaser.length > 0 && (
        <section className="mt-12">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-xl font-semibold">Cheapest right now near {location.label}</h2>
            <Link href="/cheapest" className="text-sm font-medium text-brand hover:underline">See all</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teaser.map((r) => (
              <Link key={r.canonical_item_slug} href={`/cheapest/${r.canonical_item_slug}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:shadow-md">
                <BusinessAvatar name={r.business_name} logoUrl={r.business_logo_url} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.display_name}</div>
                  <div className="truncate text-sm text-muted">{r.business_name} · {formatDistance(r.distance_m)}</div>
                </div>
                <div className="font-bold text-deal">{formatUnitPrice(Number(r.unit_price), r.comparable_unit)}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-14 grid gap-6 sm:grid-cols-3">
        {[
          { n: '1', t: 'Set a radius', d: 'One mile on foot near campus, or ten miles for a grocery run.' },
          { n: '2', t: 'See every deal', d: 'Specials pulled from restaurant posts, websites, and weekly ads, refreshed daily.' },
          { n: '3', t: 'Compare per unit', d: 'Slices, pounds, dozens, and pints normalized so the cheapest option is obvious.' },
        ].map((s) => (
          <div key={s.n} className="rounded-2xl border border-line bg-surface p-5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-bold text-white">{s.n}</div>
            <h3 className="mt-3 font-semibold">{s.t}</h3>
            <p className="mt-1 text-sm text-muted">{s.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
