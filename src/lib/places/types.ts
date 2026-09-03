import type { BusinessCategory } from '@/lib/taxonomy/canonical-items';

/** Row shape returned by the `businesses_in_radius` RPC (places directory). */
export interface PlaceRow {
  business_id: string;
  name: string;
  slug: string;
  category: BusinessCategory;
  address: string | null;
  phone: string | null;
  website_url: string | null;
  logo_url: string | null;
  photo_url: string | null;
  lat: number;
  lng: number;
  distance_m: number;
  deal_count: number;
  top_deal_title: string | null;
  top_deal_image: string | null;
  top_deal_price: number | null;
  instagram_handle: string | null;
  is_featured: boolean;
  last_seen_at: string | null;
  rating: number | null;
  review_count: number | null;
  price_level: number | null;
  cuisines: string[];
  primary_type: string | null;
  hours: OpeningHours | null;
  open_now: boolean | null;
  photo_count: number;
}

/** Google-style opening hours stored on `businesses.hours`. Day 0 = Sunday, local time (America/Chicago). */
export interface OpeningHours {
  periods: Array<{ open: { day: number; hour: number; minute?: number }; close?: { day: number; hour: number; minute?: number } }>;
  weekdayDescriptions?: string[];
}

export interface PlacePhoto { url: string; width: number; height: number; attribution: string | null; attribution_uri: string | null }

export interface BusinessReview {
  id: string;
  business_id: string;
  source: string;
  author_name: string | null;
  author_uri: string | null;
  author_photo: string | null;
  rating: number | null;
  text: string | null;
  published_at: string | null;
  relative_time: string | null;
}

export interface BusinessPost {
  id: string;
  image: string | null;
  caption: string;
  posted_at: string | null;
  url: string | null;
}

/** Row shape returned by the `business_profile` RPC. */
export interface BusinessProfile {
  business_id: string;
  instagram_handle: string | null;
  source_types: string[] | null;
  last_checked_at: string | null;
  posts: BusinessPost[];
}

/** "123 State St, Madison, WI 53703" → "123 State St". */
export function streetOnly(address: string | null | undefined): string | null {
  if (!address) return null;
  const s = address.split(',')[0]?.trim();
  return s || null;
}

export function instagramUrl(handle: string): string {
  return `https://www.instagram.com/${handle.replace(/^@/, '')}/`;
}
