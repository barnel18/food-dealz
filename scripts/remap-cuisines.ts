/** Recompute businesses.cuisines from the stored google_types after editing src/lib/places/cuisines.ts (no API calls).
 *  pnpm cuisines:remap [--dry] */
import { loadEnv } from '../worker/env';
loadEnv();
import { cuisinesFromTypes } from '../src/lib/places/cuisines';
import { createServiceClient } from '../src/lib/supabase/service-client';

async function main() {
  const dry = process.argv.includes('--dry');
  const db = createServiceClient();
  const rows: Array<{ id: string; name: string; google_types: string[]; cuisines: string[] }> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('businesses').select('id,name,google_types,cuisines').not('google_types', 'eq', '{}').range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as typeof rows));
    if (!data || data.length < 1000) break;
  }
  let changed = 0;
  for (const r of rows) {
    const next = cuisinesFromTypes(r.google_types.slice(1), r.google_types[0]);
    if (next.join(',') === (r.cuisines ?? []).join(',')) continue;
    changed++;
    if (dry) { console.log(`  ${r.name}: ${(r.cuisines ?? []).join('/') || '-'} → ${next.join('/') || '-'}`); continue; }
    const { error } = await db.from('businesses').update({ cuisines: next }).eq('id', r.id);
    if (error) throw error;
  }
  console.log(`${rows.length} businesses with Google types, ${changed} ${dry ? 'would change' : 'updated'}`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
