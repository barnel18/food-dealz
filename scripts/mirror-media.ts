/**
 * Backfill: copy Instagram post images (expiring signed CDN links) into the public `media` bucket and
 * point the deals extracted from each capture at the copy. pnpm media:mirror [--dry]
 */
import { loadEnv } from '../worker/env';
loadEnv();
import { mirrorCaptureImage } from '../src/lib/media/mirror';
import { createServiceClient } from '../src/lib/supabase/service-client';

interface Row { id: string; image_urls: string[]; payload: Record<string, unknown> & { mirrored_image_url?: string | null } }

const PAGE = 500;
const WORKERS = 4;

async function main() {
  const dry = process.argv.includes('--dry');
  const db = createServiceClient();

  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('raw_captures')
      .select('id, image_urls, payload, sources!inner(type)')
      .eq('sources.type', 'instagram')
      .neq('image_urls', '{}')
      .is('payload->mirrored_image_url', null)
      .order('captured_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as Row[];
    rows.push(...page.filter((r) => r.image_urls?.length && !r.payload?.mirrored_image_url));
    if (page.length < PAGE) break;
  }
  console.log(`${rows.length} Instagram capture(s) to mirror${dry ? ' (dry run)' : ''}`);

  let mirrored = 0;
  let failed = 0;
  let dealsUpdated = 0;
  await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
    for (let i = w; i < rows.length; i += WORKERS) {
      const c = rows[i];
      if (dry) {
        const { count } = await db.from('deals').select('id', { count: 'exact', head: true }).eq('source_capture_id', c.id).in('image_url', c.image_urls);
        dealsUpdated += count ?? 0;
        console.log(`  · ${c.id} would mirror ${c.image_urls[0].slice(0, 80)}… (${count ?? 0} deal(s))`);
        continue;
      }
      const r = await mirrorCaptureImage(db, c.id, c.image_urls[0]);
      if (!r.ok) {
        failed++;
        console.log(`  ✗ ${c.id} ${r.reason}`);
        continue;
      }
      const { error: payloadErr } = await db.from('raw_captures').update({ payload: { ...c.payload, mirrored_image_url: r.url } }).eq('id', c.id);
      if (payloadErr) {
        failed++;
        console.log(`  ✗ ${c.id} payload update: ${payloadErr.message}`);
        continue;
      }
      const { data: updated, error: dealsErr } = await db.from('deals').update({ image_url: r.url }).eq('source_capture_id', c.id).in('image_url', c.image_urls).select('id');
      if (dealsErr) console.log(`  ! ${c.id} deals update: ${dealsErr.message}`);
      const n = updated?.length ?? 0;
      dealsUpdated += n;
      mirrored++;
      console.log(`  ✓ ${c.id} → ${r.url} (${n} deal(s))`);
    }
  }));

  console.log(dry
    ? `[dry] ${rows.length} capture(s) would be mirrored, ${dealsUpdated} deal image(s) would be updated`
    : `${mirrored}/${rows.length} capture(s) mirrored, ${failed} failed, ${dealsUpdated} deal image(s) updated`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
