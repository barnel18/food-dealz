import { NextResponse, type NextRequest } from 'next/server';
import { launch, serverEnv } from '@/lib/env';
import { forwardGeocode, reverseGeocodeLabel } from '@/lib/geo/mapbox';

/** GET /api/geocode?q=…  → { results }   |   GET /api/geocode?lat=&lng= → { label } */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const token = serverEnv().mapboxServerToken;
  const lat = Number(sp.get('lat'));
  const lng = Number(sp.get('lng'));

  if (sp.has('lat') && sp.has('lng')) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ label: null }, { status: 400 });
    if (!token) return NextResponse.json({ label: null, reason: 'no_token' });
    try {
      return NextResponse.json({ label: await reverseGeocodeLabel(lat, lng, token) });
    } catch {
      return NextResponse.json({ label: null });
    }
  }

  const q = (sp.get('q') ?? '').trim().slice(0, 120);
  if (q.length < 3) return NextResponse.json({ results: [] });
  if (!token) return NextResponse.json({ results: [], reason: 'no_token' });
  try {
    const results = await forwardGeocode(q, token, { lat: launch.lat, lng: launch.lng });
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ results: [], error: e instanceof Error ? e.message : 'geocode failed' }, { status: 502 });
  }
}
