import type { DealCardData, DealDetail, DealInRadius } from './types';

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export function fromRadiusRow(r: DealInRadius): DealCardData {
  return {
    id: r.deal_id,
    title: r.title,
    itemName: r.item_name,
    slug: r.canonical_item_slug,
    dealType: r.deal_type,
    price: num(r.price),
    regularPrice: num(r.regular_price),
    percentOff: num(r.percent_off),
    quantity: Number(r.quantity),
    unit: r.unit,
    unitPrice: num(r.unit_price),
    conditions: r.conditions,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    daysOfWeek: r.days_of_week,
    timeWindow: r.time_window,
    sourceType: r.source_type,
    lastSeenAt: r.last_seen_at,
    isFeatured: r.is_featured,
    business: { id: r.business_id, name: r.business_name, slug: r.business_slug, category: r.business_category, address: r.address },
    distanceM: r.distance_m == null ? null : Number(r.distance_m),
  };
}

export function fromDetail(d: DealDetail, distanceM: number | null = null): DealCardData {
  return {
    id: d.id,
    title: d.title,
    itemName: d.item_name,
    slug: d.canonical_item_slug,
    dealType: d.deal_type,
    price: num(d.price),
    regularPrice: num(d.regular_price),
    percentOff: num(d.percent_off),
    quantity: Number(d.quantity),
    unit: d.unit,
    unitPrice: num(d.unit_price),
    conditions: d.conditions,
    startsAt: d.starts_at,
    endsAt: d.ends_at,
    daysOfWeek: d.days_of_week,
    timeWindow: d.time_window,
    sourceType: d.source_type,
    lastSeenAt: d.last_seen_at,
    isFeatured: d.is_featured || (d.business.featured_until != null && new Date(d.business.featured_until) > new Date()),
    business: { id: d.business.id, name: d.business.name, slug: d.business.slug, category: d.business.category, address: d.business.address },
    distanceM,
  };
}
