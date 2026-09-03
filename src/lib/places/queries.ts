import 'server-only';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import type { UserLocation } from '@/lib/location/cookie';
import type { BusinessCategory } from '@/lib/taxonomy/canonical-items';
import type { QueryResult } from '@/lib/deals/queries';
import type { BusinessProfile, BusinessReview, PlaceRow } from './types';

export type PlaceSort = 'best' | 'distance' | 'rating' | 'deals';

export interface PlaceFilters {
  category?: BusinessCategory | null;
  query?: string | null;
  withDeals?: boolean;
  cuisine?: string | null;
  openNow?: boolean;
  sort?: PlaceSort;
  limit?: number;
  offset?: number;
}

export async function getPlacesInRadius(loc: UserLocation, f: PlaceFilters = {}): Promise<QueryResult<PlaceRow[]>> {
  if (!isSupabaseConfigured()) return { data: [], error: 'not_configured' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('businesses_in_radius', {
    p_lat: loc.lat,
    p_lng: loc.lng,
    p_radius_m: loc.radiusM,
    p_category: f.category ?? null,
    p_query: f.query?.trim() || null,
    p_with_deals: f.withDeals ?? false,
    p_limit: f.limit ?? 48,
    p_offset: f.offset ?? 0,
    p_cuisine: f.cuisine ?? null,
    p_open_now: f.openNow ?? false,
    p_sort: f.sort ?? 'best',
  });
  if (error) {
    console.error('[businesses_in_radius]', error.message);
    return { data: [], error: error.message };
  }
  return { data: (data ?? []) as PlaceRow[], error: null };
}

/** Places around a specific spot (e.g. neighbours of a business page). */
export async function getPlacesAround(lat: number, lng: number, radiusM: number, limit = 8): Promise<PlaceRow[]> {
  const { data } = await getPlacesInRadius({ lat, lng, radiusM, label: '' }, { withDeals: true, limit });
  return data;
}

export async function getBusinessReviews(businessId: string, limit = 5): Promise<BusinessReview[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('business_reviews')
    .select('id,business_id,source,author_name,author_uri,author_photo,rating,text,published_at,relative_time')
    .eq('business_id', businessId)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) {
    console.error('[business_reviews]', error.message);
    return [];
  }
  return (data ?? []) as BusinessReview[];
}

export async function getBusinessProfile(slug: string): Promise<BusinessProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('business_profile', { p_slug: slug });
  if (error) {
    console.error('[business_profile]', error.message);
    return null;
  }
  const row = (Array.isArray(data) ? data[0] : data) as BusinessProfile | undefined;
  if (!row) return null;
  return { ...row, posts: Array.isArray(row.posts) ? row.posts : [] };
}
