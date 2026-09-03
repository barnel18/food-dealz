import type { UnitKind } from '@/lib/taxonomy/canonical-items';
import type { DealType } from './types';

type Family = 'weight' | 'volume' | 'count' | 'slice' | 'pack';

/** Conversion factor to the family's base unit (lb, gallon, each). */
const UNIT_INFO: Record<UnitKind, { family: Family; factor: number }> = {
  lb: { family: 'weight', factor: 1 },
  oz: { family: 'weight', factor: 1 / 16 },
  kg: { family: 'weight', factor: 2.20462 },
  g: { family: 'weight', factor: 0.00220462 },
  gallon: { family: 'volume', factor: 1 },
  liter: { family: 'volume', factor: 0.264172 },
  fl_oz: { family: 'volume', factor: 1 / 128 },
  each: { family: 'count', factor: 1 },
  dozen: { family: 'count', factor: 12 },
  slice: { family: 'slice', factor: 1 },
  pack: { family: 'pack', factor: 1 },
};

/** Convert a quantity between units of the same family; null when the units aren't comparable. */
export function convertQuantity(qty: number, from: UnitKind, to: UnitKind): number | null {
  const a = UNIT_INFO[from];
  const b = UNIT_INFO[to];
  if (!a || !b || a.family !== b.family || !Number.isFinite(qty)) return null;
  return (qty * a.factor) / b.factor;
}

export interface PriceInputs {
  dealType: DealType;
  price: number | null;
  regularPrice: number | null;
  percentOff: number | null;
  quantity: number;
  unit: UnitKind;
}

/**
 * What the customer pays for `quantity` units, after the discount.
 * - bogo returns price/2 because the customer receives 2× quantity for `price`.
 * - amount_off treats `price` as the discount amount.
 */
export function effectiveTotalPrice(d: PriceInputs): number | null {
  switch (d.dealType) {
    case 'fixed_price':
    case 'bundle':
      return d.price;
    case 'percent_off':
      return d.regularPrice != null && d.percentOff != null ? d.regularPrice * (1 - d.percentOff / 100) : null;
    case 'amount_off':
      return d.regularPrice != null && d.price != null ? Math.max(0, d.regularPrice - d.price) : null;
    case 'bogo':
      return d.price != null ? d.price / 2 : null;
    case 'free_item':
      return null;
  }
}

/** Price per canonical comparable unit, rounded to 4 decimals; null when not computable. */
export function computeUnitPrice(d: PriceInputs, comparableUnit: UnitKind): number | null {
  const total = effectiveTotalPrice(d);
  if (total == null || !Number.isFinite(total) || total < 0) return null;
  const q = convertQuantity(d.quantity, d.unit, comparableUnit);
  if (q == null || q <= 0) return null;
  return Math.round((total / q) * 10000) / 10000;
}
