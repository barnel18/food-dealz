'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { City } from '@/lib/cities';
import { cn } from '@/lib/utils/cn';
import { ChevronDownIcon, MapPinIcon } from './icons';

/** Header pill: the city you are "in", with the roadmap of cities you will be able to travel to. */
export function CitySwitcher({ cities, current }: { cities: City[]; current: City }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-3 text-sm font-semibold hover:border-brand hover:text-brand"
      >
        <MapPinIcon className="h-4 w-4 text-brand" />
        {current.name}, {current.stateCode}
        <ChevronDownIcon className={cn('h-4 w-4 text-muted transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-lg">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">You’re in</p>
          {cities.map((c) => {
            const isCurrent = c.slug === current.slug;
            const body = (
              <>
                <span className={cn('grid h-8 w-8 place-items-center rounded-lg text-sm font-bold', isCurrent ? 'bg-brand text-white' : 'bg-surface-2 text-muted')}>{c.stateCode}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.name}, {c.stateCode}</span>
                  <span className="block truncate text-xs text-muted">{c.status === 'live' ? `${c.neighborhoods.length} neighborhoods` : 'Coming soon'}</span>
                </span>
              </>
            );
            return isCurrent ? (
              <Link key={c.slug} href="/" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                {body}
              </Link>
            ) : (
              <div key={c.slug} role="menuitem" aria-disabled className="flex items-center gap-3 rounded-xl px-2 py-2 opacity-60">
                {body}
              </div>
            );
          })}
          <p className="px-3 pb-2 pt-2 text-xs text-muted">Pick a city and it feels like you’re there: the same map, deals, and prices, wherever you land.</p>
        </div>
      )}
    </div>
  );
}
