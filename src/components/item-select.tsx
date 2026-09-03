'use client';

import { useRouter } from 'next/navigation';
import { CANONICAL_ITEMS, type BusinessCategory } from '@/lib/taxonomy/canonical-items';
import { CATEGORY_META, categoryMeta } from '@/lib/taxonomy/categories';

export function ItemSelect({
  value,
  category,
  todayOnly,
}: {
  value: string | null;
  category: BusinessCategory | null;
  todayOnly: boolean;
}) {
  const router = useRouter();
  const items = CANONICAL_ITEMS.filter((i) => !category || i.businessCategory === category);
  const groups = Array.from(new Set(items.map((i) => i.category))).sort(
    (a, b) => categoryMeta(a).order - categoryMeta(b).order,
  );

  function onChange(slug: string) {
    const params = new URLSearchParams();
    if (category) params.set('cat', category);
    if (todayOnly) params.set('today', '1');
    if (slug) params.set('item', slug);
    const qs = params.toString();
    router.push(qs ? `/deals?${qs}` : '/deals');
  }

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filter by item"
      className="h-9 max-w-[220px] rounded-full border border-line bg-surface px-3 text-sm"
    >
      <option value="">All items</option>
      {groups.map((g) => (
        <optgroup key={g} label={`${CATEGORY_META[g]?.emoji ?? ''} ${categoryMeta(g).label}`}>
          {items
            .filter((i) => i.category === g)
            .map((i) => (
              <option key={i.slug} value={i.slug}>
                {i.displayName}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
