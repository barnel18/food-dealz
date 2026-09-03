'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { toggleSaveAction } from '@/lib/actions/deals';
import type { DealCardData } from '@/lib/deals/types';
import { localSaves } from '@/lib/utils/local-saves';
import { DealCard } from './deal-card';
import { EmptyState } from './empty-state';

/** Signed-out view: deals saved on this device. */
export function LocalSavedList() {
  const ids = useSyncExternalStore(localSaves.subscribe, localSaves.all, localSaves.serverSnapshot);
  const [deals, setDeals] = useState<DealCardData[] | null>(null);

  useEffect(() => {
    if (ids.length === 0) return;
    let active = true;
    fetch(`/api/deals?ids=${ids.join(',')}`)
      .then((r) => r.json())
      .then((json: { deals?: DealCardData[] }) => {
        if (active) setDeals(json.deals ?? []);
      })
      .catch(() => {
        if (active) setDeals([]);
      });
    return () => {
      active = false;
    };
  }, [ids]);

  if (ids.length === 0) {
    return (
      <EmptyState
        emoji={'\u{1F516}'}
        title="Nothing saved yet"
        description="Tap the bookmark on any deal to keep it here. Sign in to sync across devices."
        action={{ href: '/deals', label: 'Browse deals' }}
      />
    );
  }
  if (deals === null) return <p className="text-sm text-muted">Loading saved deals…</p>;

  const visible = deals.filter((d) => ids.includes(d.id));
  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
        Saved on this device only.{' '}
        <Link href="/login?next=/saved" className="font-medium text-brand hover:underline">Sign in</Link> to keep them everywhere.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((d) => (
          <DealCard key={d.id} deal={d} saved isLoggedIn={false} />
        ))}
      </div>
    </div>
  );
}

/** Signed-in helper: pushes device-local saves into the account once, then clears them. */
export function MergeLocalSaves() {
  const router = useRouter();
  useEffect(() => {
    const ids = localSaves.all();
    if (ids.length === 0) return;
    (async () => {
      for (const id of ids) await toggleSaveAction(id, true);
      localSaves.clear();
      router.refresh();
    })();
  }, [router]);
  return null;
}
