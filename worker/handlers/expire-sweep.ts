import type { SupabaseClient } from '@supabase/supabase-js';

export async function handleExpireSweep(db: SupabaseClient): Promise<string> {
  const { data, error } = await db.rpc('run_expire_sweep');
  if (error) throw new Error(`run_expire_sweep: ${error.message}`);
  return JSON.stringify(data);
}
