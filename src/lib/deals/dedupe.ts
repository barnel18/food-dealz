import type { UnitKind } from '@/lib/taxonomy/canonical-items';
import type { DealType } from './types';

/** Stable key identifying "the same deal" at a business, used to merge re-crawls. */
export function dedupeKey(p: {
  businessId: string;
  slug: string | null;
  itemName: string;
  dealType: DealType;
  price: number | null;
  quantity: number;
  unit: UnitKind;
}): string {
  const item = p.slug ?? p.itemName.trim().toLowerCase().replace(/\s+/g, ' ');
  const price = p.price == null ? '' : Number(p.price).toFixed(2);
  return [p.businessId, item, p.dealType, price, String(Number(p.quantity)), p.unit].join('|');
}
