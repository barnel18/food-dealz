/**
 * Attach one fan-out deals source per chain and queue its crawl.
 *   pnpm chains:sync [--dry] [--only key1,key2]
 * For each entry in CHAIN_SOURCES: set businesses.chain_key on every active store whose brand/name matches,
 * upsert a `website` source (fan_out=true) on the store nearest downtown, and enqueue a crawl_source job.
 */
import { loadEnv } from '../worker/env';
loadEnv();
import { CHAIN_SOURCES } from '../src/lib/chains';
import { createServiceClient } from '../src/lib/supabase/service-client';

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const onlyIdx = argv.indexOf('--only');
const ONLY = onlyIdx >= 0 ? new Set(argv[onlyIdx + 1]?.split(',').map((s) => s.trim())) : null;
const CENTER = { lat: Number(process.env.LAUNCH_CENTER_LAT ?? 43.0731), lng: Number(process.env.LAUNCH_CENTER_LNG ?? -89.4012) };

type Biz = { id: string; name: string; brand: string | null; chain_key: string | null; lat: number | null; lng: number | null };

async function main() {
  const db = createServiceClient();
  // PostgREST caps a single request at 1,000 rows, so page through every active business.
  const all: Biz[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('businesses').select('id,name,brand,chain_key,lat,lng').eq('is_active', true).order('name').range(from, from + 999);
    if (error) throw error;
    all.push(...((data ?? []) as Biz[]));
    if (!data || data.length < 1000) break;
  }
  let sources = 0, stores = 0;
  for (const chain of CHAIN_SOURCES) {
    if (ONLY && !ONLY.has(chain.key)) continue;
    // OSM/Google spell brands inconsistently ("Domino’s" vs "Domino's", "Dunkin" vs "Dunkin' Donuts"): normalise apostrophes
    // and match either the brand field or the start of the business name.
    const norm = (s: string) => s.toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, ' ').trim();
    const needles = chain.brandMatch.map(norm);
    const members = all.filter((b) => {
      const brand = norm(b.brand ?? '');
      const name = norm(b.name);
      return needles.some((n) => brand === n || name === n || name.startsWith(`${n} `) || name.startsWith(`${n} -`) || name.startsWith(`${n}:`));
    });
    if (members.length === 0) { console.log(`  · ${chain.key}: no Madison stores matched ${chain.brandMatch.join('/')}`); continue; }
    const anchor = [...members].sort((a, b) => dist(a) - dist(b))[0];
    console.log(`  ${chain.key}: ${members.length} store(s), anchor ${anchor.name} → ${chain.url}`);
    stores += members.length;
    if (DRY) continue;
    const ids = members.map((m) => m.id);
    const { error: e1 } = await db.from('businesses').update({ chain_key: chain.key }).in('id', ids);
    if (e1) throw new Error(`${chain.key}: chain_key update: ${e1.message}`);
    const { data: existing } = await db.from('sources').select('id').eq('business_id', anchor.id).eq('type', 'website').eq('url', chain.url).maybeSingle();
    let sourceId = (existing as { id: string } | null)?.id;
    if (sourceId) {
      const { error: e2 } = await db.from('sources').update({ fan_out: true, is_active: true, crawl_interval_hours: chain.intervalHours ?? 168, notes: chain.notes ?? `chain deals page (${chain.key})` }).eq('id', sourceId);
      if (e2) throw new Error(`${chain.key}: source update: ${e2.message}`);
    } else {
      const { data: ins, error: e3 } = await db.from('sources').insert({
        business_id: anchor.id, type: 'website', url: chain.url, fan_out: true, crawl_interval_hours: chain.intervalHours ?? 168, notes: chain.notes ?? `chain deals page (${chain.key})`,
      }).select('id').single();
      if (e3) throw new Error(`${chain.key}: source insert: ${e3.message}`);
      sourceId = (ins as { id: string }).id;
    }
    const { error: e4 } = await db.rpc('enqueue_job', { p_type: 'crawl_source', p_payload: { source_id: sourceId } });
    if (e4) console.warn(`  ! ${chain.key}: enqueue failed: ${e4.message}`);
    sources++;
  }
  console.log(`${DRY ? '[dry] ' : ''}${sources} chain source(s) queued covering ${stores} store(s)`);

  function dist(b: Biz): number {
    if (b.lat == null || b.lng == null) return Infinity;
    return Math.hypot(b.lat - CENTER.lat, (b.lng - CENTER.lng) * Math.cos((CENTER.lat * Math.PI) / 180));
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
