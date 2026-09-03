import { Pill, btnGhost, btnPrimary, fmt } from '@/components/admin/ui';
import { jobsOpAction } from '@/lib/actions/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Jobs' };

interface Row { id: number; type: string; payload: Record<string, unknown>; status: string; attempts: number; max_attempts: number; run_at: string; finished_at: string | null; last_error: string | null }

export default async function JobsPage() {
  const db = createAdminClient();
  const { data } = await db.from('jobs').select('*').order('id', { ascending: false }).limit(100);
  const rows = (data ?? []) as Row[];
  const tone = (s: string) => (s === 'done' ? 'ok' : s === 'failed' ? 'bad' : s === 'running' ? 'warn' : 'muted');
  return (
    <div className="space-y-4">
      <form action={jobsOpAction} className="flex flex-wrap gap-2">
        <button name="op" value="schedule" className={btnPrimary}>Queue due crawls + pending extractions</button>
        <button name="op" value="crawl_all" className={btnGhost}>Crawl every active source now</button>
        <button name="op" value="sweep" className={btnGhost}>Run expiry sweep</button>
        <button name="op" value="retry_failed" className={btnGhost}>Retry failed jobs</button>
      </form>
      <p className="text-xs text-muted">Jobs run only while the worker is up: <code>pnpm worker:dev</code> locally, or the Railway service in production.</p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted"><tr><th className="p-2">#</th><th className="p-2">Type</th><th className="p-2">Payload</th><th className="p-2">Status</th><th className="p-2">Tries</th><th className="p-2">Run at</th><th className="p-2">Error</th></tr></thead>
          <tbody>
            {rows.map((j) => (
              <tr key={j.id} className="border-t border-line align-top">
                <td className="p-2 text-muted">{j.id}</td>
                <td className="p-2 font-medium">{j.type}</td>
                <td className="max-w-[220px] truncate p-2 text-xs text-muted">{JSON.stringify(j.payload)}</td>
                <td className="p-2"><Pill tone={tone(j.status)}>{j.status}</Pill></td>
                <td className="p-2">{j.attempts}/{j.max_attempts}</td>
                <td className="p-2 text-muted">{fmt(j.run_at)}</td>
                <td className="max-w-[320px] p-2 text-xs text-brand">{j.last_error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
