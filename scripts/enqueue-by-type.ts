/** Queue crawls for every active source of a type. pnpm crawl:type <website|instagram|kroger_api|flipp> [limit] [--never-crawled] */
import { loadEnv } from '../worker/env';
loadEnv();
import { createServiceClient } from '../src/lib/supabase/service-client';

async function main() {
  const [type, limitArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const neverOnly = process.argv.includes('--never-crawled');
  if (!type) throw new Error('usage: pnpm crawl:type <type> [limit] [--never-crawled]');
  const db = createServiceClient();
  let q = db.from('sources').select('id').eq('type', type).eq('is_active', true).order('last_crawled_at', { ascending: true, nullsFirst: true });
  if (neverOnly) q = q.is('last_crawled_at', null);
  if (limitArg) q = q.limit(Number(limitArg));
  const { data, error } = await q;
  if (error) throw error;
  let n = 0;
  for (const s of (data ?? []) as { id: string }[]) {
    const { error: e } = await db.rpc('enqueue_job', { p_type: 'crawl_source', p_payload: { source_id: s.id } });
    if (!e) n++;
  }
  console.log(`queued ${n} ${type} crawl(s)`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
