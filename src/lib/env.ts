/** Public (client-safe) environment. NEXT_PUBLIC_* values are inlined at build time. */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '',
  appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
} as const;

/** Launch-market configuration (server-side; falls back to Madison, WI). */
export const launch = {
  city: process.env.LAUNCH_CITY ?? 'Madison, WI',
  slug: process.env.LAUNCH_CITY_SLUG ?? 'madison',
  lat: Number(process.env.LAUNCH_CENTER_LAT ?? '43.0731'),
  lng: Number(process.env.LAUNCH_CENTER_LNG ?? '-89.4012'),
  radiusKm: Number(process.env.LAUNCH_RADIUS_KM ?? '16'),
  tz: process.env.LAUNCH_TZ ?? 'America/Chicago',
} as const;

/** True once real Supabase credentials are in place (not the .env.example placeholders). */
export function isSupabaseConfigured(): boolean {
  const url = publicEnv.supabaseUrl;
  return (
    /^https?:\/\//.test(url) &&
    !url.includes('YOUR-PROJECT') &&
    publicEnv.supabaseAnonKey.length > 20
  );
}

export function serverEnv() {
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    mapboxServerToken: process.env.MAPBOX_SERVER_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
    adminEmails: (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  };
}
