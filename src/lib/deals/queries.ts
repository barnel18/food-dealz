import 'server-only';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import type { UserLocation } from '@/lib/location/cookie';
import type { BusinessCategory, BusinessRow, CheapestByItem, DealDetail, DealInRadius, DealRow } from './types';

export interface QueryResult<T> {
  data: T;
  /** 'not_configured' until Supabase credentials exist; otherwise a Postgres/PostgREST message. */
  error: string | null;
}

const BUSINESS_SELECT = 'id,name,slug,category,chain_key,address,city,state,postal_code,phone,website_url,google_place_id,featured_until,is_active,lat,lng';

export interface DealFilters {
  category?: BusinessCategory | null;
  item?: string | null;
  todayOnly?: boolean;
  limit?: number;
  offset?: number;
}

export async function getDealsInRadius(loc: UserLocation, f: DealFilters = {}): Promise<QueryResult<DealInRadius[]>> {
  if (!isSupabaseConfigured()) return { data: [], error: 'not_configured' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('deals_in_radius', {
    p_lat: loc.lat,
    p_lng: loc.lng,
    p_radius_m: loc.radiusM,
    p_category: f.category ?? null,
    p_item: f.item ?? null,
    p_today_only: f.todayOnly ?? false,
    p_limit: f.limit ?? 40,
    p_offset: f.offset ?? 0,
  });
  if (error) {
    console.error('[deals_in_radius]', error.message);
    return { data: [], error: error.message };
  }
  return { data: (data ?? []) as DealInRadius[], error: null };
}

export async function getCheapestByItem(loc: UserLocation, category: BusinessCategory | null = null): Promise<QueryResult<CheapestByItem[]>> {
  if (!isSupabaseConfigured()) return { data: [], error: 'not_configured' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('cheapest_by_item', {
    p_lat: loc.lat,
    p_lng: loc.lng,
    p_radius_m: loc.radiusM,
    p_business_category: category,
  });
  if (error) {
    console.error('[cheapest_by_item]', error.message);
    return { data: [], error: error.message };
  }
  return { data: (data ?? []) as CheapestByItem[], error: null };
}

export async function getDealById(id: string): Promise<QueryResult<DealDetail | null>> {
  if (!isSupabaseConfigured()) return { data: null, error: 'not_configured' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('deals')
    .select(`*, business:businesses(${BUSINESS_SELECT})`)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[getDealById]', error.message);
    return { data: null, error: error.message };
  }
  return { data: (data as DealDetail | null) ?? null, error: null };
}

export async function getBusinessBySlug(slug: string): Promise<QueryResult<{ business: BusinessRow; deals: DealRow[] } | null>> {
  if (!isSupabaseConfigured()) return { data: null, error: 'not_configured' };
  const supabase = await createClient();
  const { data: business, error } = await supabase
    .from('businesses')
    .select(BUSINESS_SELECT)
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.error('[getBusinessBySlug]', error.message);
    return { data: null, error: error.message };
  }
  if (!business) return { data: null, error: null };
  const nowIso = new Date().toISOString();
  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select('*')
    .eq('business_id', (business as BusinessRow).id)
    .eq('status', 'approved')
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    .order('is_featured', { ascending: false })
    .order('unit_price', { ascending: true, nullsFirst: false });
  if (dealsError) {
    console.error('[getBusinessBySlug deals]', dealsError.message);
    return { data: { business: business as BusinessRow, deals: [] }, error: dealsError.message };
  }
  return { data: { business: business as BusinessRow, deals: (deals ?? []) as DealRow[] }, error: null };
}

export async function getSavedDealIds(userId: string): Promise<Set<string>> {
  if (!isSupabaseConfigured()) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from('saved_deals').select('deal_id').eq('user_id', userId);
  return new Set(((data ?? []) as { deal_id: string }[]).map((r) => r.deal_id));
}

export async function getSavedDeals(userId: string): Promise<QueryResult<DealDetail[]>> {
  if (!isSupabaseConfigured()) return { data: [], error: 'not_configured' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('saved_deals')
    .select(`created_at, deal:deals(*, business:businesses(${BUSINESS_SELECT}))`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[getSavedDeals]', error.message);
    return { data: [], error: error.message };
  }
  const rows = (data ?? []) as unknown as { deal: DealDetail | null }[];
  return { data: rows.map((r) => r.deal).filter((d): d is DealDetail => d !== null), error: null };
}
