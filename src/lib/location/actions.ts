'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { safeNext } from '@/lib/utils/safe-next';
import {
  DEFAULT_RADIUS_M, LOCATION_COOKIE, RADIUS_OPTIONS, parseLocationCookie, serializeLocation, type UserLocation,
} from './cookie';
import { defaultLocation } from './server';

const LocationInput = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  label: z.string().trim().min(1).max(120),
  radiusM: z.number().int().min(500).max(50000).optional(),
});

const COOKIE_OPTS = { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' as const };

export async function setLocationAction(input: z.input<typeof LocationInput>, nextPath = '/deals'): Promise<void> {
  const parsed = LocationInput.parse(input);
  const store = await cookies();
  const existing = parseLocationCookie(store.get(LOCATION_COOKIE)?.value);
  const loc: UserLocation = {
    lat: parsed.lat,
    lng: parsed.lng,
    label: parsed.label,
    radiusM: parsed.radiusM ?? existing?.radiusM ?? DEFAULT_RADIUS_M,
  };
  store.set(LOCATION_COOKIE, serializeLocation(loc), COOKIE_OPTS);
  redirect(safeNext(nextPath));
}

export async function setRadiusAction(radiusM: number): Promise<void> {
  const meters = RADIUS_OPTIONS.find((o) => o.meters === radiusM)?.meters ?? DEFAULT_RADIUS_M;
  const store = await cookies();
  const existing = parseLocationCookie(store.get(LOCATION_COOKIE)?.value) ?? defaultLocation();
  store.set(LOCATION_COOKIE, serializeLocation({ ...existing, radiusM: meters }), COOKIE_OPTS);
  revalidatePath('/', 'layout');
}
