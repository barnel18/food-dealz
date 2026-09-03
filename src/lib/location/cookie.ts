export const LOCATION_COOKIE = 'fd_loc';
export const SESSION_COOKIE = 'fd_sid';

export interface UserLocation {
  lat: number;
  lng: number;
  /** Search radius in meters. */
  radiusM: number;
  /** Human label, e.g. "Willy Street" or "Current location". */
  label: string;
}

export const RADIUS_OPTIONS: ReadonlyArray<{ miles: number; meters: number }> = [
  { miles: 1, meters: 1609 },
  { miles: 3, meters: 4828 },
  { miles: 5, meters: 8047 },
  { miles: 10, meters: 16093 },
];

export const DEFAULT_RADIUS_M = 4828;

export function metersToMiles(m: number): number {
  return m / 1609.344;
}

export function parseLocationCookie(raw: string | undefined): UserLocation | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as Partial<UserLocation>;
    if (
      typeof v.lat !== 'number' || typeof v.lng !== 'number' ||
      !Number.isFinite(v.lat) || !Number.isFinite(v.lng) ||
      Math.abs(v.lat) > 90 || Math.abs(v.lng) > 180
    ) return null;
    const radiusM = typeof v.radiusM === 'number' && v.radiusM >= 500 && v.radiusM <= 50000 ? Math.round(v.radiusM) : DEFAULT_RADIUS_M;
    const label = typeof v.label === 'string' && v.label.trim() ? v.label.trim().slice(0, 120) : 'Your location';
    return { lat: v.lat, lng: v.lng, radiusM, label };
  } catch {
    return null;
  }
}

export function serializeLocation(loc: UserLocation): string {
  return encodeURIComponent(JSON.stringify({
    lat: Number(loc.lat.toFixed(5)),
    lng: Number(loc.lng.toFixed(5)),
    radiusM: Math.round(loc.radiusM),
    label: loc.label.slice(0, 120),
  }));
}
