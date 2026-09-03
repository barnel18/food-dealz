import type { Metadata } from 'next';
import Link from 'next/link';
import { DealList } from '@/components/deal-list';
import { EmptyState } from '@/components/empty-state';
import { LocalSavedList, MergeLocalSaves } from '@/components/saved-local';
import { SetupNotice } from '@/components/setup-notice';
import { getCurrentUser } from '@/lib/auth/dal';
import { fromDetail } from '@/lib/deals/card-data';
import { getSavedDeals } from '@/lib/deals/queries';
import { haversineM } from '@/lib/geo/distance';
import { getLocation } from '@/lib/location/server';

export const metadata: Metadata = { title: 'Saved deals' };

export default async function SavedPage() {
  const [user, loc] = await Promise.all([getCurrentUser(), getLocation()]);

  return (
    <div className="py-6">
      <div className="mb-4 flex items-end justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Saved</h1>
        {!user && (
          <Link href="/login?next=/saved" className="text-sm font-medium text-brand hover:underline">Sign in</Link>
        )}
      </div>
      {user ? <SignedIn userId={user.id} loc={loc} /> : <LocalSavedList />}
    </div>
  );
}

async function SignedIn({ userId, loc }: { userId: string; loc: Awaited<ReturnType<typeof getLocation>> }) {
  const { data, error } = await getSavedDeals(userId);
  const deals = data.map((d) => {
    const dist = loc && d.business.lat != null && d.business.lng != null ? haversineM(loc.lat, loc.lng, d.business.lat, d.business.lng) : null;
    return fromDetail(d, dist);
  });
  const savedIds = new Set(deals.map((d) => d.id));
  return (
    <>
      <MergeLocalSaves />
      {error && <div className="mb-4"><SetupNotice error={error} /></div>}
      {deals.length === 0 && !error ? (
        <EmptyState emoji={'\u{1F516}'} title="Nothing saved yet" description="Tap the bookmark on any deal to keep it here." action={{ href: '/deals', label: 'Browse deals' }} />
      ) : (
        <DealList deals={deals} savedIds={savedIds} isLoggedIn />
      )}
    </>
  );
}
