import type { SupabaseClient } from '@supabase/supabase-js';

export interface JobRow {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
}

export async function claimJobs(db: SupabaseClient, limit: number): Promise<JobRow[]> {
  const { data, error } = await db.rpc('claim_jobs', { p_limit: limit });
  if (error) throw new Error(`claim_jobs: ${error.message}`);
  return (data ?? []) as JobRow[];
}

export async function completeJob(db: SupabaseClient, id: number, ok: boolean, err?: string): Promise<void> {
  const { error } = await db.rpc('complete_job', { p_id: id, p_ok: ok, p_error: err ?? null });
  if (error) throw new Error(`complete_job: ${error.message}`);
}

export async function enqueueJob(db: SupabaseClient, type: string, payload: Record<string, unknown>, runAt?: Date): Promise<number> {
  const { data, error } = await db.rpc('enqueue_job', { p_type: type, p_payload: payload, p_run_at: runAt?.toISOString() ?? new Date().toISOString() });
  if (error) throw new Error(`enqueue_job: ${error.message}`);
  return data as number;
}

export async function rpcNumber(db: SupabaseClient, fn: string): Promise<number> {
  const { data, error } = await db.rpc(fn);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return Number(data ?? 0);
}
