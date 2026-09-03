import { StatCard } from '@/components/admin/ui';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Admin' };

async function count(table: string, filter?: (q: ReturnType<ReturnType<typeof createAdminClient>['from']>['select']) => unknown): Promise<number> {
  const db = createAdminClient();
  let q = db.from(table).select('id', { count: 'exact', head: true });
  if (filter) q = filter(q as never) as typeof q;
  const { count: n } = await q;
  return n ?? 0;
}

export default async function AdminHome() {
  const db = createAdminClient();
  const [pending, approved, expired, captPending, captFailed, jobsQueued, jobsRunning, jobsFailed, sources, sourcesFailing, businesses] = await Promise.all([
    count('deals', (q) => (q as never as { eq: (a: string, b: string) => unknown }).eq('status', 'pending')),
    count('deals', (q) => (q as never as { eq: (a: string, b: string) => unknown }).eq('status', 'approved')),
    count('deals', (q) => (q as never as { eq: (a: string, b: string) => unknown }).eq('status', 'expired')),
    count('raw_captures', (q) => (q as never as { eq: (a: string, b: string) => unknown }).eq('extraction_status', 'pending')),
    count('raw_captures', (q) => (q as never as { eq: (a: string, b: string) => unknown }).eq('extraction_status', 'failed')),
    count('jobs', (q) => (q as never as { eq: (a: string, b: string) => unknown }).eq('status', 'queued')),
    count('jobs', (q) => (q as never as { eq: (a: string, b: string) => unknown }).eq('status', 'running')),
    count('jobs', (q) => (q as never as { eq: (a: string, b: string) => unknown }).eq('status', 'failed')),
    count('sources', (q) => (q as never as { eq: (a: string, b: boolean) => unknown }).eq('is_active', true)),
    count('sources', (q) => (q as never as { gt: (a: string, b: number) => unknown }).gt('consecutive_failures', 0)),
    count('businesses'),
  ]);
  const { data: recent } = await db.from('jobs').select('id, type, status, last_error, finished_at').order('id', { ascending: false }).limit(8);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Deals to review" value={pending} href="/admin/review" />
        <StatCard label="Live deals" value={approved} href="/admin/review?status=approved" />
        <StatCard label="Expired" value={expired} href="/admin/review?status=expired" />
        <StatCard label="Businesses" value={businesses} href="/admin/businesses" />
        <StatCard label="Active sources" value={`${sources}${sourcesFailing ? ` (${sourcesFailing} failing)` : ''}`} href="/admin/sources" />
        <StatCard label="Jobs queued / running / failed" value={`${jobsQueued} / ${jobsRunning} / ${jobsFailed}`} href="/admin/jobs" />
      </div>
      <div className="text-sm text-muted">
        Captures: {captPending} pending extraction, {captFailed} failed. The worker must be running (<code>pnpm worker:dev</code>) for queued jobs to move.
      </div>
      <div>
        <h2 className="mb-2 font-semibold">Recent jobs</h2>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface text-sm">
          {((recent ?? []) as { id: number; type: string; status: string; last_error: string | null }[]).map((j) => (
            <li key={j.id} className="flex items-center gap-3 px-4 py-2">
              <span className="w-10 text-muted">#{j.id}</span>
              <span className="w-32 font-medium">{j.type}</span>
              <span className="w-16">{j.status}</span>
              <span className="truncate text-muted">{j.last_error ?? ''}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
