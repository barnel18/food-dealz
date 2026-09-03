'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore, useTransition } from 'react';
import { toggleSaveAction } from '@/lib/actions/deals';
import { cn } from '@/lib/utils/cn';
import { localSaves } from '@/lib/utils/local-saves';
import { BookmarkIcon } from './icons';

export function SaveButton({
  dealId,
  initiallySaved,
  isLoggedIn,
  size = 'sm',
}: {
  dealId: string;
  initiallySaved: boolean;
  isLoggedIn: boolean;
  size?: 'sm' | 'lg';
}) {
  const [accountSaved, setAccountSaved] = useState(initiallySaved);
  const localSaved = useSyncExternalStore(localSaves.subscribe, () => localSaves.has(dealId), () => false);
  const [hint, setHint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const saved = isLoggedIn ? accountSaved : localSaved;

  function onClick() {
    const next = !saved;
    if (!isLoggedIn) {
      localSaves.toggle(dealId, next);
      setHint(next ? 'Saved on this device.' : null);
      return;
    }
    setAccountSaved(next);
    startTransition(async () => {
      const r = await toggleSaveAction(dealId, next);
      if (!r.ok) {
        setAccountSaved(!next);
        setHint(r.needsLogin ? 'Sign in to save deals.' : r.error ?? 'Could not save.');
      }
    });
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={saved}
        aria-label={saved ? 'Remove from saved' : 'Save deal'}
        className={cn(
          'inline-flex items-center justify-center rounded-full border transition',
          size === 'lg' ? 'h-11 gap-2 px-4 text-sm font-medium' : 'h-9 w-9',
          saved ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-muted hover:text-brand',
        )}
      >
        <BookmarkIcon filled={saved} className={size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
        {size === 'lg' && (saved ? 'Saved' : 'Save')}
      </button>
      {hint && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-line bg-surface p-2 text-xs shadow-md">
          {hint}{' '}
          {!isLoggedIn && (
            <Link href="/login?next=/saved" className="font-medium text-brand hover:underline">
              Sign in to sync
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
