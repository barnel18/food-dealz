/**
 * Create one Flipp weekly-ad source per grocery chain that has stores in the DB, and copy the
 * chain logo from Flipp onto stores that lack one.   pnpm flipp:sync [postal]
 */
import { loadEnv } from '../worker/env';
loadEnv();
import { FLIPP_MERCHANTS, normalizeMerchant } from '../src/lib/adapters/flipp';
import { haversineM } from '../src/lib/geo/distance';
import { createServiceClient } from '../src/lib/supabase/service-client';

interface Flyer { merchant?: string; merchant_id?: number; merchant_logo?: string }

async function main() {
  const postal = process.argv[2] ?? '53703';
  const res = await fetch(`https://backflipp.wishabi.com/flipp/flyers?locale=en-us&postal_code=${postal}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const flyers = ((await res.json()) as Flyer[] | { flyers: Flyer[] });
  const list = Array.isArray(flyers) ? flyers : flyers.flyers;
  const merchants = new Map<string, Flyer>();
  for (const f of list) if (f.merchant && f.merchant_id) merchants.set(normalizeMerchant(f.merchant), f);
  const db = createServiceClient();
  const { data: stores } = await db.from('businesses').select('id, name, chain_key, lat, lng, logo_url').eq('category', 'grocery').eq('is_active', true).not('chain_key', 'is', null);
  const rows = (stores ?? []) as { id: string; name: string; chain_key: string; lat: number; lng: number; logo_url: string | null }[];
  let created = 0;
  for (const [mname, meta] of Object.entries(FLIPP_MERCHANTS)) {
    const flyer = merchants.get(mname);
    const chainStores = rows.filter((s) => s.chain_key === meta.chainKey);
    if (!flyer) { console.log(`  · ${meta.label}: no flyer in ${postal}`); continue; }
    if (chainStores.length === 0) { console.log(`  · ${meta.label}: flyer found but no stores in DB`); continue; }
    const primary = chainStores.sort((a, b) => haversineM(43.0731, -89.4012, a.lat, a.lng) - haversineM(43.0731, -89.4012, b.lat, b.lng))[0];
    const { data: exists } = await db.from('sources').select('id').eq('type', 'flipp').eq('external_id', String(flyer.merchant_id)).maybeSingle();
    if (!exists) {
      const { error } = await db.from('sources').insert({ business_id: primary.id, type: 'flipp', external_id: String(flyer.merchant_id), handle: meta.label, url: postal, crawl_interval_hours: 24, notes: `weekly ad → ${chainStores.length} stores` });
      if (error) { console.log(`  ! ${meta.label}: ${error.message}`); continue; }
      created++;
    }
    if (flyer.merchant_logo) await db.from('businesses').update({ logo_url: flyer.merchant_logo }).eq('chain_key', meta.chainKey).is('logo_url', null);
    console.log(`  ✓ ${meta.label}: merchant ${flyer.merchant_id} → ${chainStores.length} store(s), primary ${primary.name}`);
  }
  console.log(`${created} flipp source(s) created`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
