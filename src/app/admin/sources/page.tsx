import Link from 'next/link';
import { Pill, btnDanger, btnGhost, fmt } from '@/components/admin/ui';
import { sourceOpAction } from '@/lib/actions/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Sources' };

interface Row { id: string; type: string; url: string | null; handle: string | null; external_id: string | null; crawl_interval_hours: number; last_crawled_at: string | null; last_changed_at: string | null; consecutive_failures: number; is_active: boolean; business: { id: string; name: string } | null }

export default async function SourcesPage() {
  const db = createAdminClient();
  const { data } = await db.from('sources').select('*, business:businesses(id,name)').order('is_active', { ascending: false }).order('consecutive_failures', { ascending: false }).limit(300);
  const rows = (data ?? []) as unknown as Row[];
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted"><tr><th className="p-2">Business</th><th className="p-2">Type</th><th className="p-2">Target</th><th className="p-2">Every</th><th className="p-2">Last crawl</th><th className="p-2">Changed</th><th className="p-2">State</th><th className="p-2"></th></tr></thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-t border-line">
              <td className="p-2">{s.business ? <Link href={`/admin/businesses/${s.business.id}`} className="hover:underline">{s.business.name}</Link> : '—'}</td>
              <td className="p-2"><Pill>{s.type}</Pill></td>
              <td className="max-w-[280px] truncate p-2">{s.url ?? (s.handle ? `@${s.handle}` : s.external_id)}</td>
              <td className="p-2">{s.crawl_interval_hours}h</td>
              <td className="p-2 text-muted">{fmt(s.last_crawled_at)}</td>
              <td className="p-2 text-muted">{fmt(s.last_changed_at)}</td>
              <td className="p-2 space-x-1">{!s.is_active && <Pill tone="bad">disabled</Pill>}{s.consecutive_failures > 0 && <Pill tone="bad">{s.consecutive_failures} fails</Pill>}</td>
              <td className="p-2">
                <form action={sourceOpAction} className="flex gap-1">
                  <input type="hidden" name="id" value={s.id} />
                  <button name="op" value="crawl" className={btnGhost}>Crawl</button>
                  <button name="op" value={s.is_active ? 'disable' : 'enable'} className={btnGhost}>{s.is_active ? 'Off' : 'On'}</button>
                  <button name="op" value="delete" className={btnDanger}>✕</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
