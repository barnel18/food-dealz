import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLinkIcon, MapPinIcon, PhoneIcon } from '@/components/icons';
import { ReportDealDialog } from '@/components/report-deal-dialog';
import { SaveButton } from '@/components/save-button';
import { SetupNotice } from '@/components/setup-notice';
import { getCurrentUser } from '@/lib/auth/dal';
import { fromDetail } from '@/lib/deals/card-data';
import { categoryLabel, dealHeadline, formatDistance, formatValidity, relativeTime, sourceLabel, unitPriceLine } from '@/lib/deals/format';
import { getDealById, getSavedDealIds } from '@/lib/deals/queries';
import { haversineM } from '@/lib/geo/distance';
import { getLocation } from '@/lib/location/server';
import { CANONICAL_ITEM_BY_SLUG } from '@/lib/taxonomy/canonical-items';
import { categoryMeta } from '@/lib/taxonomy/categories';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(props: PageProps<'/deal/[id]'>): Promise<Metadata> {
  const { id } = await props.params;
  if (!UUID.test(id)) return { title: 'Deal' };
  const { data } = await getDealById(id);
  return data ? { title: `${data.title} at ${data.business.name}` } : { title: 'Deal' };
}

export default async function DealPage(props: PageProps<'/deal/[id]'>) {
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();
  const [{ data, error }, user, loc] = await Promise.all([getDealById(id), getCurrentUser(), getLocation()]);
  if (error) return <div className="py-6"><SetupNotice error={error} /></div>;
  if (!data) notFound();

  const b = data.business;
  const distanceM = loc && b.lat != null && b.lng != null ? haversineM(loc.lat, loc.lng, b.lat, b.lng) : null;
  const deal = fromDetail(data, distanceM);
  const item = deal.slug ? CANONICAL_ITEM_BY_SLUG.get(deal.slug) : undefined;
  const saved = user ? (await getSavedDealIds(user.id)).has(deal.id) : false;
  const validity = formatValidity(deal);
  const unitLine = unitPriceLine(deal);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    name: deal.title,
    ...(deal.price != null ? { price: deal.price, priceCurrency: 'USD' } : {}),
    ...(deal.endsAt ? { validThrough: deal.endsAt } : {}),
    offeredBy: { '@type': b.category === 'grocery' ? 'GroceryStore' : 'Restaurant', name: b.name, address: b.address ?? undefined },
  };

  return (
    <div className="py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/deals" className="text-sm text-muted hover:text-foreground">← All deals</Link>
      <article className="mt-3 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-3xl" aria-hidden="true">
            {item ? categoryMeta(item.category).emoji : b.category === 'grocery' ? '\u{1F6D2}' : '\u{1F37D}️'}
          </span>
          <div className="min-w-0 flex-1">
            {deal.isFeatured && <span className="mb-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">Sponsored</span>}
            <h1 className="text-2xl font-bold leading-tight tracking-tight">{deal.title}</h1>
            <p className="mt-1 text-muted">
              <Link href={`/b/${b.slug}`} className="font-medium text-foreground hover:underline">{b.name}</Link>
              {' · '}{categoryLabel(b.category)}
              {distanceM != null && <> · {formatDistance(distanceM)} away</>}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-4xl font-bold leading-none text-deal">{dealHeadline(deal)}</div>
            {unitLine && <div className="mt-1 text-sm font-medium text-muted">{unitLine}{item ? ` · compared per ${item.comparableUnit === 'each' ? 'item' : item.comparableUnit.replace('_', ' ')}` : ''}</div>}
            {deal.regularPrice != null && deal.price != null && deal.regularPrice > deal.price && (
              <div className="mt-1 text-sm text-muted">Regular ${Number(deal.regularPrice).toFixed(2)}</div>
            )}
          </div>
          {validity && <span className="rounded-full bg-surface-2 px-3 py-1.5 text-sm">{validity}</span>}
        </div>

        {deal.conditions && <p className="mt-4 text-sm text-muted">{deal.conditions}</p>}

        <div className="mt-6 flex flex-wrap gap-2">
          {b.website_url && (
            <a href={`/out/${deal.id}?to=site`} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong">
              <ExternalLinkIcon className="h-4 w-4" /> Website
            </a>
          )}
          <a href={`/out/${deal.id}?to=maps`} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-brand hover:text-brand">
            <MapPinIcon className="h-4 w-4" /> Directions
          </a>
          {b.phone && (
            <a href={`tel:${b.phone}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-brand hover:text-brand">
              <PhoneIcon className="h-4 w-4" /> Call
            </a>
          )}
          <SaveButton dealId={deal.id} initiallySaved={saved} isLoggedIn={!!user} size="lg" />
          <ReportDealDialog dealId={deal.id} />
        </div>

        <dl className="mt-6 grid gap-2 border-t border-line pt-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Source</dt><dd>{sourceLabel(deal.sourceType)}</dd></div>
          <div><dt className="text-muted">Last verified</dt><dd>{relativeTime(deal.lastSeenAt)}</dd></div>
          {b.address && <div className="sm:col-span-2"><dt className="text-muted">Address</dt><dd>{b.address}</dd></div>}
          {data.evidence_quote && data.source_type !== 'manual' && (
            <div className="sm:col-span-2"><dt className="text-muted">As posted</dt><dd className="italic">“{data.evidence_quote}”</dd></div>
          )}
        </dl>
      </article>
      {item && (
        <p className="mt-4 text-sm text-muted">
          Compare: <Link href={`/cheapest/${item.slug}`} className="font-medium text-brand hover:underline">all {item.displayName.toLowerCase()} deals near you</Link>
        </p>
      )}
    </div>
  );
}
