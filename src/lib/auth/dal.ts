import 'server-only';
import { cache } from 'react';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export interface CurrentUser {
  id: string;
  email: string | null;
}

/** Verified from the session JWT; memoized per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  const claims = data.claims as { sub?: string; email?: string };
  if (!claims.sub) return null;
  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : null };
});
