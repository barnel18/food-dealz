/**
 * Google Places API (New) — the "Yelp layer": ratings, review counts, price level, types, hours, photos, reviews.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/op-overview
 * Pricing notes (2026): Text Search with an id-only field mask is free; Place Details with the atmosphere
 * fields below is billed at the "Enterprise + Atmosphere" SKU; each photo download is a separate Place Photo call.
 * Policy: place IDs may be stored indefinitely; other content must be refreshed within 30 days (google:sync does).
 */
import { AdapterError, requireEnv } from './types';

const BASE = 'https://places.googleapis.com/v1';

export interface GooglePhoto { name: string; widthPx: number; heightPx: number; authorAttributions?: Array<{ displayName?: string; uri?: string; photoUri?: string }> }
export interface GoogleReview {
  name: string;
  rating?: number;
  text?: { text?: string; languageCode?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  publishTime?: string;
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
}
export interface GooglePeriod { open: { day: number; hour: number; minute: number }; close?: { day: number; hour: number; minute: number } }
export interface GooglePlace {
  id: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: 'PRICE_LEVEL_UNSPECIFIED' | 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE';
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  regularOpeningHours?: { openNow?: boolean; periods?: GooglePeriod[]; weekdayDescriptions?: string[] };
  photos?: GooglePhoto[];
  reviews?: GoogleReview[];
  editorialSummary?: { text?: string };
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
}

export const DETAILS_FIELDS = [
  'id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'priceLevel', 'types', 'primaryType', 'primaryTypeDisplayName',
  'regularOpeningHours', 'photos', 'reviews', 'editorialSummary', 'googleMapsUri', 'nationalPhoneNumber', 'websiteUri', 'businessStatus',
].join(',');

function key(): string {
  return requireEnv('GOOGLE_PLACES_API_KEY');
}

async function call<T>(path: string, init: RequestInit & { fieldMask: string }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key(), 'X-Goog-FieldMask': init.fieldMask, ...(init.headers ?? {}) },
  });
  if (res.status === 429 || res.status >= 500) throw new AdapterError(`google places ${res.status}`, true);
  if (res.status === 402 || res.status === 403) throw new AdapterError(`google places ${res.status}: ${(await res.text()).slice(0, 200)}`, false, 'quota');
  if (!res.ok) throw new AdapterError(`google places ${res.status}: ${(await res.text()).slice(0, 200)}`, false);
  return (await res.json()) as T;
}

/** Cheapest possible lookup: text search returning only ids (free SKU), biased to a small circle around the known point. */
export async function findPlaceId(query: string, near: { lat: number; lng: number }, radiusM = 400): Promise<string | null> {
  const json = await call<{ places?: Array<{ id: string }> }>('/places:searchText', {
    method: 'POST',
    fieldMask: 'places.id',
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 1,
      locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: radiusM } },
      languageCode: 'en',
      regionCode: 'us',
    }),
  });
  return json.places?.[0]?.id ?? null;
}

export async function placeDetails(placeId: string): Promise<GooglePlace> {
  return call<GooglePlace>(`/places/${encodeURIComponent(placeId)}?languageCode=en&regionCode=us`, { method: 'GET', fieldMask: DETAILS_FIELDS });
}

/** Download one photo (JPEG/PNG bytes) via the Place Photo endpoint. */
export async function downloadPhoto(photoName: string, maxWidthPx = 1200): Promise<{ bytes: Buffer; contentType: string } | null> {
  const url = `${BASE}/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${encodeURIComponent(key())}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (res.status === 429 || res.status >= 500) throw new AdapterError(`google photo ${res.status}`, true);
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  if (!contentType.startsWith('image/')) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000 || buf.length > 6_000_000) return null;
  return { bytes: buf, contentType };
}

export function priceLevelNumber(p: GooglePlace['priceLevel']): number | null {
  switch (p) {
    case 'PRICE_LEVEL_INEXPENSIVE': return 1;
    case 'PRICE_LEVEL_MODERATE': return 2;
    case 'PRICE_LEVEL_EXPENSIVE': return 3;
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return 4;
    default: return null;
  }
}
