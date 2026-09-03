import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { publicEnv, serverEnv } from '@/lib/env';

/** Service-role client. Bypasses RLS — server-only, never import from client code. */
export function createAdminClient() {
  const { serviceRoleKey } = serverEnv();
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createSupabaseClient(publicEnv.supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
