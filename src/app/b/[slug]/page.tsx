import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DealList } from '@/components/deal-list';
import { EmptyState } from '@/components/empty-state';
import { BusinessAvatar } from '@/components/business-avatar';
import { ExternalLinkIcon, MapPinIcon, PhoneIcon } from '@/components/icons';
import { SetupNotice } from '@/components/setup-notice';
import { getCurrentUser } from '@/lib/auth/dal';
import { fromDetail } from '@/lib/deals/card-data';
import { categoryLabel, formatDistance } from '@/lib/deals/format';
import { getBusinessBySlug, getSavedDealIds } from '@/lib/deals/queries';
import { haversineM } from '@/lib/geo/distance';
import { getLocation } from '@/lib/location/server';

export async function generateMetadata(props: PageProps<'/b/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const { data } = await getBusinessBySlug(slug);
  return data ? { title: `${data.business.name} deals` } : { title: 'Business' };
}

export default async function BusinessPage(props: PageProps<'/b/[slug]'>) {
  const { slug } = await props.params;
  const [{ data, error }, user, loc] = await Promise.all([getBusinessBySlug(slug), getCurrentUser(), getLocation()]);
  if (error && !data) return <div className="py-6"><SetupNotice error={error} /></div>;
  if (!data) notFound();

  const b = data.business;
  const distanceM = loc && b.lat != null && b.lng != null ? haversineM(loc.lat, loc.lng, b.lat, b.lng) : null;
  const deals = data.deals.map((d) => fromDetail({ ...d, business: b }, distanceM));
  const savedIds = user ? await getSavedDealIds(user.id) : new Set<string>();
  const mapsQuery = encodeURIComponent(`${b.name} ${b.address ?? 'Madison, WI'}`);
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}${b.google_place_id ? `&query_place_id=${b.google_place_id}` : ''}`;

  return (
    <div className="py-6">
      <Link href="/deals" className="text-sm text-muted hover:text-foreground">← All deals</Link>
      <header className="mt-3 overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        {b.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.photo_url} alt="" className="h-40 w-full object-cover sm:h-56" />
        )}
        <div className="p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <BusinessAvatar name={b.name} logoUrl={b.logo_url} size={64} className="rounded-2xl" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">{categoryLabel(b.category)}</p>
            <h1 className="mt-0.5 text-3xl font-bold tracking-tight">{b.name}</h1>
          </div>
        </div>
        <p className="mt-1 text-muted">
          {b.address}
          {distanceM != null && <> · {formatDistance(distanceM)} away</>}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {b.website_url && (
            <a href={b.website_url} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-brand hover:text-brand">
              <ExternalLinkIcon className="h-4 w-4" /> Website
            </a>
          )}
          <a href={mapsHref} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-brand hover:text-brand">
            <MapPinIcon className="h-4 w-4" /> Directions
          </a>
          {b.phone && (
            <a href={`tel:${b.phone}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-brand hover:text-brand">
              <PhoneIcon className="h-4 w-4" /> {b.phone}
            </a>
          )}
        </div>
        </div>
      </header>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Current deals ({deals.length})</h2>
      {error && <div className="mb-4"><SetupNotice error={error} /></div>}
      {deals.length === 0 ? (
        <EmptyState title="No live deals right now" description="We check this business regularly. Save it and check back." />
      ) : (
        <DealList deals={deals} savedIds={savedIds} isLoggedIn={!!user} showBusiness={false} />
      )}
      <p className="mt-8 text-sm text-muted">
        Own {b.name}? Claiming your listing to post deals directly is coming soon.
      </p>
    </div>
  );
}
