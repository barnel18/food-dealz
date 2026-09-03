import { CANONICAL_ITEM_BY_SLUG, type UnitKind } from '@/lib/taxonomy/canonical-items';
import { launch } from '@/lib/env';
import type { DealCardData, SourceType } from './types';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_PLURAL = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

const WEIGHT_VOLUME: ReadonlySet<UnitKind> = new Set(['lb', 'oz', 'kg', 'g', 'gallon', 'liter', 'fl_oz']);

export function unitShort(unit: UnitKind): string {
  switch (unit) {
    case 'each': return 'ea';
    case 'slice': return 'slice';
    case 'lb': return 'lb';
    case 'oz': return 'oz';
    case 'kg': return 'kg';
    case 'g': return 'g';
    case 'dozen': return 'dozen';
    case 'pack': return 'pack';
    case 'gallon': return 'gal';
    case 'liter': return 'L';
    case 'fl_oz': return 'fl oz';
  }
}

export function formatMoney(value: number | string | null | undefined, opts: { cents?: boolean } = {}): string {
  if (value === null || value === undefined) return '';
  const v = Number(value);
  if (!Number.isFinite(v)) return '';
  const wholeDollars = !opts.cents && Math.abs(v - Math.round(v)) < 0.005;
  return `$${wholeDollars ? v.toFixed(0) : v.toFixed(2)}`;
}

/** "$1.99/lb", "$4.00/slice", "$0.54 ea" */
export function formatUnitPrice(unitPrice: number | null | undefined, comparableUnit: UnitKind): string {
  if (unitPrice === null || unitPrice === undefined) return '';
  const money = formatMoney(unitPrice, { cents: true });
  return comparableUnit === 'each' ? `${money} ea` : `${money}/${unitShort(comparableUnit)}`;
}

/** The big price line on a card. */
export function dealHeadline(d: Pick<DealCardData, 'dealType' | 'price' | 'regularPrice' | 'percentOff' | 'quantity' | 'unit'>): string {
  const qty = d.quantity;
  const money = d.price != null ? formatMoney(d.price) : null;
  switch (d.dealType) {
    case 'fixed_price':
    case 'bundle': {
      if (money == null) return 'Special';
      if (WEIGHT_VOLUME.has(d.unit)) return qty === 1 ? `${money}/${unitShort(d.unit)}` : `${money} / ${qty} ${unitShort(d.unit)}`;
      if (d.unit === 'dozen' || d.unit === 'pack') return qty === 1 ? `${money}/${unitShort(d.unit)}` : `${money} for ${qty} ${d.unit}s`;
      return qty === 1 ? money : `${money} for ${qty}`;
    }
    case 'percent_off':
      return d.percentOff != null ? `${Number(d.percentOff) % 1 === 0 ? Number(d.percentOff).toFixed(0) : d.percentOff}% off` : 'Discount';
    case 'amount_off':
      return money ? `${money} off` : 'Discount';
    case 'bogo':
      return money ? `BOGO · ${money}` : 'Buy 1, get 1';
    case 'free_item':
      return 'Free';
  }
}

/** Secondary line: normalized unit price when it adds information. */
export function unitPriceLine(d: Pick<DealCardData, 'slug' | 'unitPrice' | 'quantity' | 'unit' | 'dealType'>): string {
  if (d.unitPrice == null || !d.slug) return '';
  const item = CANONICAL_ITEM_BY_SLUG.get(d.slug);
  if (!item) return '';
  const trivial = d.dealType === 'fixed_price' && d.quantity === 1 && d.unit === item.comparableUnit;
  if (trivial) return '';
  return formatUnitPrice(d.unitPrice, item.comparableUnit);
}

function dayRangeLabel(days: number[]): string {
  const sorted = Array.from(new Set(days)).filter((n) => n >= 0 && n <= 6).sort((a, b) => a - b);
  if (sorted.length === 0 || sorted.length === 7) return '';
  if (sorted.length === 1) return DAY_PLURAL[sorted[0]];
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (consecutive && sorted.length >= 3) return `${DAY_SHORT[sorted[0]]}–${DAY_SHORT[sorted[sorted.length - 1]]}`;
  if (sorted.length === 2) return `${DAY_SHORT[sorted[0]]} & ${DAY_SHORT[sorted[1]]}`;
  return sorted.map((d) => DAY_SHORT[d]).join(', ');
}

const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: launch.tz });

/** "Fridays · 3–6pm", "Through Sep 9", "Ends today" */
export function formatValidity(
  d: Pick<DealCardData, 'daysOfWeek' | 'timeWindow' | 'startsAt' | 'endsAt'>,
  now: Date = new Date(),
): string {
  const parts: string[] = [];
  if (d.daysOfWeek && d.daysOfWeek.length) {
    const label = dayRangeLabel(d.daysOfWeek);
    if (label) parts.push(label);
  }
  if (d.timeWindow) parts.push(d.timeWindow);
  if (d.startsAt && new Date(d.startsAt) > now) parts.push(`Starts ${shortDate.format(new Date(d.startsAt))}`);
  if (d.endsAt) {
    const end = new Date(d.endsAt);
    const hours = (end.getTime() - now.getTime()) / 36e5;
    if (hours <= 0) parts.push('Ended');
    else if (hours <= 24) parts.push('Ends today');
    else parts.push(`Through ${shortDate.format(end)}`);
  }
  return parts.join(' · ');
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return '';
  const mi = meters / 1609.344;
  if (mi < 0.1) return '0.1 mi';
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

export function sourceLabel(s: SourceType): string {
  switch (s) {
    case 'instagram': return 'Seen on Instagram';
    case 'facebook': return 'Seen on Facebook';
    case 'website': return 'From the business website';
    case 'google_posts': return 'From Google Business';
    case 'kroger_api': return 'Store price feed';
    case 'flipp': return 'Weekly ad';
    case 'business_portal': return 'Posted by the business';
    case 'manual': return 'Added by Food Dealz';
  }
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? 'yesterday' : `${days} days ago`;
  return shortDate.format(new Date(iso));
}

export function categoryLabel(c: 'restaurant' | 'grocery'): string {
  return c === 'restaurant' ? 'Restaurant' : 'Grocery';
}
