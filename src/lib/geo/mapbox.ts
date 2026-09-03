export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

interface MapboxFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: { full_address?: string; name?: string; place_formatted?: string; context?: { neighborhood?: { name?: string }; place?: { name?: string } } };
}

function toResult(f: MapboxFeature): GeocodeResult | null {
  const c = f.geometry?.coordinates;
  if (!c || c.length < 2) return null;
  const label = f.properties?.full_address ?? f.properties?.name ?? f.properties?.place_formatted;
  if (!label) return null;
  return { label, lng: c[0], lat: c[1] };
}

/** Mapbox Geocoding v6 forward search, biased to the launch market. */
export async function forwardGeocode(
  q: string,
  token: string,
  proximity?: { lat: number; lng: number },
): Promise<GeocodeResult[]> {
  const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
  url.searchParams.set('q', q);
  url.searchParams.set('access_token', token);
  url.searchParams.set('country', 'us');
  url.searchParams.set('limit', '5');
  url.searchParams.set('autocomplete', 'true');
  url.searchParams.set('types', 'address,street,neighborhood,locality,place,postcode,poi');
  if (proximity) url.searchParams.set('proximity', `${proximity.lng},${proximity.lat}`);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`mapbox forward geocode failed: ${res.status}`);
  const json = (await res.json()) as { features?: MapboxFeature[] };
  return (json.features ?? []).map(toResult).filter((r): r is GeocodeResult => r !== null);
}

/** Reverse geocode to a short neighborhood/place label. */
export async function reverseGeocodeLabel(lat: number, lng: number, token: string): Promise<string | null> {
  const url = new URL('https://api.mapbox.com/search/geocode/v6/reverse');
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('access_token', token);
  url.searchParams.set('types', 'neighborhood,locality,place');
  url.searchParams.set('limit', '1');
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = (await res.json()) as { features?: MapboxFeature[] };
  const f = json.features?.[0];
  return f?.properties?.name ?? f?.properties?.context?.neighborhood?.name ?? f?.properties?.context?.place?.name ?? null;
}
