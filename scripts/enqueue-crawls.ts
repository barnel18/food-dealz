/**
 * Queue crawls now.
 *   pnpm crawl:enqueue            # every active source (ignores the interval)
 *   pnpm crawl:enqueue <sourceId> # one source
 */
import { loadEnv } from '../worker/env';
loadEnv();
import { createServiceClient } from '../src/lib/supabase/service-client';

async function main() {
  const db = createServiceClient();
  const only = process.argv[2];
  const q = db.from('sources').select('id, type, url, handle, external_id').eq('is_active', true);
  const { data, error } = only ? await q.eq('id', only) : await q;
  if (error) throw error;
  const sources = (data ?? []) as { id: string; type: string; url: string | null; handle: string | null; external_id: string | null }[];
  for (const s of sources) {
    const { error: e } = await db.rpc('enqueue_job', { p_type: 'crawl_source', p_payload: { source_id: s.id } });
    if (e) throw e;
    console.log(`queued crawl: ${s.type} ${s.url ?? s.handle ?? s.external_id}`);
  }
  console.log(`${sources.length} crawl job(s) queued. Run: pnpm worker:once`);
}
main().catch((e) => { console.error(e); process.exit(1); });
