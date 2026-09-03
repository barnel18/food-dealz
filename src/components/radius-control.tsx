'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { setRadiusAction } from '@/lib/location/actions';
import { RADIUS_OPTIONS } from '@/lib/location/cookie';
import { cn } from '@/lib/utils/cn';

export function RadiusControl({ value }: { value: number }) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [pending, startTransition] = useTransition();

  return (
    <div role="radiogroup" aria-label="Search radius" className={cn('inline-flex rounded-full border border-line bg-surface p-0.5', pending && 'opacity-70')}>
      {RADIUS_OPTIONS.map((o) => (
        <button
          key={o.meters}
          type="button"
          role="radio"
          aria-checked={current === o.meters}
          disabled={pending}
          onClick={() => {
            setCurrent(o.meters);
            startTransition(async () => {
              await setRadiusAction(o.meters);
              router.refresh();
            });
          }}
          className={cn(
            'rounded-full px-3 py-1 text-sm font-medium transition',
            current === o.meters ? 'bg-brand text-white' : 'text-muted hover:text-foreground',
          )}
        >
          {o.miles} mi
        </button>
      ))}
    </div>
  );
}
