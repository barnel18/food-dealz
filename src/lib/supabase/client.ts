import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';

/** Browser-side Supabase client (session stored in cookies, shared with the server). */
export function createClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
