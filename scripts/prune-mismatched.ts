/** Re-check structured (Kroger/Flipp) deals against the current taxonomy name rules and unit-price ranges: delete mismatches,
 *  approve pending rows that pass (structured deals only fail auto-approval on trust or range, so a clean one is safe to publish).
 *  pnpm deals:prune [--dry]  — run after tightening `excludes`/`unitPriceRange` in canonical-items.ts. */
import { loadEnv } from '../worker/env';
loadEnv();
import { createServiceClient } from '../src/lib/supabase/service-client';
import { CANONICAL_ITEM_BY_SLUG } from '../src/lib/taxonomy/canonical-items';
import { nameMatchesItem } from '../src/lib/adapters/kroger';

type Row = { id: string; title: string; canonical_item_slug: string; unit_price: number | null; source_type: string; status: string };

async function main() {
  const dry = process.argv.includes('--dry');
  const db = createServiceClient();
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('deals').select('id,title,canonical_item_slug,unit_price,source_type,status')
      .in('source_type', ['kroger_api', 'flipp']).not('canonical_item_slug', 'is', null).range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  const bad: Array<Row & { why: string }> = [];
  for (const r of rows) {
    const item = CANONICAL_ITEM_BY_SLUG.get(r.canonical_item_slug);
    if (!item) { bad.push({ ...r, why: 'unknown slug' }); continue; }
    if (!nameMatchesItem(r.title, item)) { bad.push({ ...r, why: 'name no longer matches item' }); continue; }
    const range = item.unitPriceRange;
    if (range && r.unit_price != null && (r.unit_price < range[0] || r.unit_price > range[1])) bad.push({ ...r, why: `unit price ${r.unit_price} outside ${range[0]}–${range[1]}` });
  }
  const badIds = new Set(bad.map((b) => b.id));
  const approve = rows.filter((r) => r.status === 'pending' && !badIds.has(r.id));
  console.log(`${rows.length} structured deals checked, ${bad.length} mismatched, ${approve.length} clean pending to approve${dry ? ' (dry run)' : ''}`);
  for (const b of bad) console.log(`  ${b.source_type} ${b.canonical_item_slug} | ${b.title.slice(0, 70)} | ${b.why}`);
  if (dry) return;
  for (let i = 0; i < bad.length; i += 100) {
    const { error } = await db.from('deals').delete().in('id', bad.slice(i, i + 100).map((b) => b.id));
    if (error) throw error;
  }
  for (let i = 0; i < approve.length; i += 100) {
    const { error } = await db.from('deals').update({ status: 'approved', reviewed_at: new Date().toISOString() }).in('id', approve.slice(i, i + 100).map((a) => a.id));
    if (error) throw error;
  }
  console.log(`deleted ${bad.length}, approved ${approve.length}`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
