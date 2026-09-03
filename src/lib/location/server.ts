import 'server-only';
import { cookies } from 'next/headers';
import { launch } from '@/lib/env';
import { DEFAULT_RADIUS_M, LOCATION_COOKIE, parseLocationCookie, type UserLocation } from './cookie';

export async function getLocation(): Promise<UserLocation | null> {
  const store = await cookies();
  return parseLocationCookie(store.get(LOCATION_COOKIE)?.value);
}

export function defaultLocation(): UserLocation {
  return { lat: launch.lat, lng: launch.lng, radiusM: DEFAULT_RADIUS_M, label: 'Downtown Madison' };
}

export async function getLocationOrDefault(): Promise<{ location: UserLocation; isDefault: boolean }> {
  const loc = await getLocation();
  return loc ? { location: loc, isDefault: false } : { location: defaultLocation(), isDefault: true };
}
