import Link from 'next/link';
import type { BusinessCategory } from '@/lib/taxonomy/canonical-items';
import { cn } from '@/lib/utils/cn';
import { ItemSelect } from './item-select';

export interface FilterState {
  category: BusinessCategory | null;
  item: string | null;
  todayOnly: boolean;
}

export function filterHref(base: string, s: FilterState): string {
  const params = new URLSearchParams();
  if (s.category) params.set('cat', s.category);
  if (s.item) params.set('item', s.item);
  if (s.todayOnly) params.set('today', '1');
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-9 items-center rounded-full border px-3 text-sm font-medium transition',
        active ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-foreground hover:border-brand hover:text-brand',
      )}
    >
      {children}
    </Link>
  );
}

export function DealFilters({ state, base = '/deals' }: { state: FilterState; base?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-4">
      <Chip href={filterHref(base, { ...state, category: null })} active={state.category === null}>All</Chip>
      <Chip href={filterHref(base, { ...state, category: 'restaurant', item: null })} active={state.category === 'restaurant'}>Restaurants</Chip>
      <Chip href={filterHref(base, { ...state, category: 'grocery', item: null })} active={state.category === 'grocery'}>Grocery</Chip>
      <Chip href={filterHref(base, { ...state, todayOnly: !state.todayOnly })} active={state.todayOnly}>Today only</Chip>
      <ItemSelect value={state.item} category={state.category} todayOnly={state.todayOnly} />
    </div>
  );
}
