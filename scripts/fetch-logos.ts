/** Backfill logos/photos for businesses missing one. pnpm logos:fetch [--all] */
import { loadEnv } from '../worker/env';
loadEnv();
import { resolveAndStoreLogo } from '../src/lib/logos/resolve-logo';
import { createServiceClient } from '../src/lib/supabase/service-client';

async function main() {
  const all = process.argv.includes('--all');
  const db = createServiceClient();
  let q = db.from('businesses').select('id, name, website_url, logo_url').order('is_active', { ascending: false }).order('name');
  if (!all) q = q.is('logo_url', null);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as { id: string; name: string; website_url: string | null; logo_url: string | null }[];
  console.log(`${rows.length} businesses to process`);
  let ok = 0;
  await Promise.all(Array.from({ length: 4 }, async (_, w) => {
    for (let i = w; i < rows.length; i += 4) {
      const b = rows[i];
      const r = await resolveAndStoreLogo(db, b).catch((e) => ({ logoUrl: null, photoUrl: null, source: `error: ${e instanceof Error ? e.message : e}` }));
      if (r.logoUrl) ok++;
      console.log(`  ${r.logoUrl ? '✓' : '·'} ${b.name.padEnd(40)} ${r.source}${r.photoUrl ? ' +photo' : ''}`);
    }
  }));
  console.log(`${ok}/${rows.length} logos stored`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
