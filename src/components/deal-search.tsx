'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CANONICAL_ITEMS, type BusinessCategory } from '@/lib/taxonomy/canonical-items';
import { SearchIcon } from './icons';

/** Search box for the deals feed: free text, with canonical-item suggestions as you type. */
export function DealSearch({ query, category, todayOnly }: { query: string; category: BusinessCategory | null; todayOnly: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q.length < 2) return [];
    return CANONICAL_ITEMS.filter((i) => (!category || i.businessCategory === category) && (i.displayName.toLowerCase().includes(q) || i.aliases.some((a) => a.includes(q)))).slice(0, 6);
  }, [value, category]);

  function go(params: Record<string, string | null>) {
    const p = new URLSearchParams();
    if (category) p.set('cat', category);
    if (todayOnly) p.set('today', '1');
    for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
    const qs = p.toString();
    setOpen(false);
    router.push(qs ? `/deals?${qs}` : '/deals');
  }

  return (
    <form
      role="search"
      className="relative w-full sm:max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        go({ q: value.trim() || null });
      }}
    >
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => { setValue(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search deals, items, or places…"
        aria-label="Search deals"
        className="h-9 w-full rounded-full border border-line bg-surface pl-9 pr-8 text-sm outline-none ring-brand/30 focus:ring-2"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => { setValue(''); go({ q: null }); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-1.5 text-muted hover:text-foreground">×</button>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {suggestions.map((i) => (
            <li key={i.slug}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go({ item: i.slug })} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-2">
                <span>{i.displayName}</span>
                <span className="text-xs text-muted">{i.businessCategory === 'grocery' ? 'grocery' : 'restaurant'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
