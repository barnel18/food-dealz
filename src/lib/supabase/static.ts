import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';

/** Cookie-less anonymous client for static/ISR pages and public route handlers. */
export function createStaticClient() {
  return createSupabaseClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
