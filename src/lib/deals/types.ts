import type { BusinessCategory, UnitKind } from '@/lib/taxonomy/canonical-items';

export type { BusinessCategory, UnitKind };
export type DealType = 'fixed_price' | 'percent_off' | 'amount_off' | 'bogo' | 'bundle' | 'free_item';
export type DealStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type SourceType = 'website' | 'instagram' | 'facebook' | 'google_posts' | 'kroger_api' | 'flipp' | 'manual' | 'business_portal';
export type ReportReason = 'still_valid' | 'expired' | 'wrong_price' | 'not_a_deal' | 'other';

export const REPORT_REASONS: ReadonlyArray<{ value: ReportReason; label: string }> = [
  { value: 'still_valid', label: 'Still valid — I just used it' },
  { value: 'expired', label: 'Expired or no longer offered' },
  { value: 'wrong_price', label: 'Price is wrong' },
  { value: 'not_a_deal', label: "This isn't really a deal" },
  { value: 'other', label: 'Something else' },
];

/** Row shape returned by the `deals_in_radius` RPC. */
export interface DealInRadius {
  deal_id: string;
  business_id: string;
  business_name: string;
  business_slug: string;
  business_category: BusinessCategory;
  address: string | null;
  lat: number;
  lng: number;
  distance_m: number;
  title: string;
  item_name: string;
  canonical_item_slug: string | null;
  deal_type: DealType;
  price: number | null;
  regular_price: number | null;
  percent_off: number | null;
  quantity: number;
  unit: UnitKind;
  unit_price: number | null;
  conditions: string | null;
  starts_at: string | null;
  ends_at: string | null;
  days_of_week: number[] | null;
  time_window: string | null;
  source_type: SourceType;
  last_seen_at: string;
  is_featured: boolean;
}

/** Row shape returned by the `cheapest_by_item` RPC. */
export interface CheapestByItem {
  canonical_item_slug: string;
  display_name: string;
  category: string;
  comparable_unit: UnitKind;
  deal_id: string;
  business_id: string;
  business_name: string;
  business_slug: string;
  title: string;
  price: number | null;
  quantity: number;
  unit: UnitKind;
  unit_price: number;
  distance_m: number;
  ends_at: string | null;
  deal_count: number;
}

/** `businesses` table row (plus PostgREST computed columns lat/lng when selected). */
export interface BusinessRow {
  id: string;
  name: string;
  slug: string;
  category: BusinessCategory;
  chain_key: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  website_url: string | null;
  google_place_id: string | null;
  featured_until: string | null;
  is_active: boolean;
  lat?: number;
  lng?: number;
}

/** `deals` table row. */
export interface DealRow {
  id: string;
  business_id: string;
  source_type: SourceType;
  title: string;
  item_name: string;
  canonical_item_slug: string | null;
  deal_type: DealType;
  price: number | null;
  regular_price: number | null;
  percent_off: number | null;
  quantity: number;
  unit: UnitKind;
  unit_price: number | null;
  conditions: string | null;
  starts_at: string | null;
  ends_at: string | null;
  days_of_week: number[] | null;
  time_window: string | null;
  extraction_confidence: number | null;
  evidence_quote: string | null;
  status: DealStatus;
  is_featured: boolean;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export type DealDetail = DealRow & { business: BusinessRow };

/** Normalized shape consumed by <DealCard>. */
export interface DealCardData {
  id: string;
  title: string;
  itemName: string;
  slug: string | null;
  dealType: DealType;
  price: number | null;
  regularPrice: number | null;
  percentOff: number | null;
  quantity: number;
  unit: UnitKind;
  unitPrice: number | null;
  conditions: string | null;
  startsAt: string | null;
  endsAt: string | null;
  daysOfWeek: number[] | null;
  timeWindow: string | null;
  sourceType: SourceType;
  lastSeenAt: string;
  isFeatured: boolean;
  business: { id: string; name: string; slug: string; category: BusinessCategory; address: string | null };
  distanceM: number | null;
}
