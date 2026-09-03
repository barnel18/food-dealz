import Link from 'next/link';
import { formatDistance, formatUnitPrice } from '@/lib/deals/format';
import type { CheapestByItem } from '@/lib/deals/types';
import { categoryMeta } from '@/lib/taxonomy/categories';
import { ChevronRightIcon } from './icons';

export function Leaderboard({ rows }: { rows: CheapestByItem[] }) {
  const groups = new Map<string, CheapestByItem[]>();
  for (const r of rows) {
    const list = groups.get(r.category) ?? [];
    list.push(r);
    groups.set(r.category, list);
  }
  const ordered = Array.from(groups.entries()).sort((a, b) => categoryMeta(a[0]).order - categoryMeta(b[0]).order);

  return (
    <div className="space-y-8">
      {ordered.map(([category, items]) => {
        const meta = categoryMeta(category);
        return (
          <section key={category}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
              <span aria-hidden="true">{meta.emoji}</span> {meta.label}
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {items.map((r) => (
                <li key={r.canonical_item_slug}>
                  <Link href={`/cheapest/${r.canonical_item_slug}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{r.display_name}</div>
                      <div className="truncate text-sm text-muted">
                        {r.business_name} · {formatDistance(r.distance_m)}
                        {Number(r.deal_count) > 1 && <> · {r.deal_count} deals</>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-deal">{formatUnitPrice(Number(r.unit_price), r.comparable_unit)}</div>
                    </div>
                    <ChevronRightIcon className="h-4 w-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
