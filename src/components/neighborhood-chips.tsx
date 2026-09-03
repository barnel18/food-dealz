'use client';

import { useTransition } from 'react';
import type { Neighborhood } from '@/lib/cities';
import { setLocationAction } from '@/lib/location/actions';
import { cn } from '@/lib/utils/cn';

/** Jump to a neighborhood: sets the location cookie to its centre + radius and lands on `nextPath`. */
export function NeighborhoodChips({
  neighborhoods,
  activeLabel,
  nextPath = '/places',
  className,
  tone = 'default',
}: {
  neighborhoods: Neighborhood[];
  activeLabel?: string | null;
  nextPath?: string;
  className?: string;
  tone?: 'default' | 'onDark';
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)} role="list" aria-label="Neighborhoods">
      {neighborhoods.map((n) => {
        const active = activeLabel === n.name;
        return (
          <button
            key={n.slug}
            type="button"
            role="listitem"
            disabled={pending}
            title={n.blurb}
            onClick={() => startTransition(() => setLocationAction({ lat: n.lat, lng: n.lng, label: n.name, radiusM: n.radiusM }, nextPath))}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition disabled:opacity-60',
              tone === 'onDark'
                ? active ? 'border-white bg-white text-black' : 'border-white/40 bg-black/30 text-white backdrop-blur hover:bg-white/20'
                : active ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-foreground hover:border-brand hover:text-brand',
            )}
          >
            {n.name}
          </button>
        );
      })}
    </div>
  );
}
