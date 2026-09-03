/**
 * Approve pending deals that pass the same checks the pipeline applies at extraction time, using the current thresholds.
 *   pnpm deals:autoapprove [--dry] [--min-confidence 0.75] [--sources website,kroger_api,flipp,instagram]
 * Rules: confidence ≥ min (Instagram always ≥ 0.85 and must carry an evidence quote), window not already over,
 * unit price inside the item's plausible range when both exist. A missing canonical item is NOT a blocker (it only
 * keeps the deal off the leaderboard). Prints what it approves; use --dry to preview.
 */
import { loadEnv } from '../worker/env';
loadEnv();
import { CANONICAL_ITEM_BY_SLUG } from '../src/lib/taxonomy/canonical-items';
import { createServiceClient } from '../src/lib/supabase/service-client';

type Row = { id: string; title: string; source_type: string; canonical_item_slug: string | null; unit_price: number | null; extraction_confidence: number | null; evidence_quote: string | null; ends_at: string | null; business_id: string };

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const optIdx = (n: string) => argv.indexOf(n);
const MIN = Number(optIdx('--min-confidence') >= 0 ? argv[optIdx('--min-confidence') + 1] : process.env.EXTRACTION_AUTO_APPROVE_THRESHOLD ?? 0.75);
const SOURCES = (optIdx('--sources') >= 0 ? argv[optIdx('--sources') + 1] : 'website,kroger_api,flipp,business_portal,manual,instagram').split(',');

async function main() {
  const db = createServiceClient();
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('deals').select('id,title,source_type,canonical_item_slug,unit_price,extraction_confidence,evidence_quote,ends_at,business_id')
      .eq('status', 'pending').in('source_type', SOURCES).range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  const approve: Row[] = [];
  const held: Array<Row & { why: string }> = [];
  const now = Date.now();
  for (const r of rows) {
    const conf = r.extraction_confidence ?? 0;
    const min = r.source_type === 'instagram' ? Math.max(MIN, 0.85) : MIN;
    if (conf < min) { held.push({ ...r, why: `confidence ${conf} < ${min}` }); continue; }
    if (r.source_type === 'instagram' && !r.evidence_quote) { held.push({ ...r, why: 'instagram deal without evidence quote' }); continue; }
    if (r.ends_at && new Date(r.ends_at).getTime() < now) { held.push({ ...r, why: 'already ended' }); continue; }
    const range = r.canonical_item_slug ? CANONICAL_ITEM_BY_SLUG.get(r.canonical_item_slug)?.unitPriceRange : undefined;
    if (range && r.unit_price != null && (r.unit_price < range[0] || r.unit_price > range[1])) { held.push({ ...r, why: `unit price ${r.unit_price} outside ${range[0]}–${range[1]}` }); continue; }
    approve.push(r);
  }
  console.log(`${rows.length} pending · ${approve.length} approvable · ${held.length} held${DRY ? ' (dry run)' : ''}`);
  const bySource = new Map<string, number>();
  for (const a of approve) bySource.set(a.source_type, (bySource.get(a.source_type) ?? 0) + 1);
  console.log('  approve by source:', [...bySource.entries()].map(([k, v]) => `${k}=${v}`).join(' '));
  const reasons = new Map<string, number>();
  for (const h of held) { const k = h.why.replace(/[\d.]+/g, 'N'); reasons.set(k, (reasons.get(k) ?? 0) + 1); }
  console.log('  held reasons:', [...reasons.entries()].map(([k, v]) => `${k}=${v}`).join(' | ') || 'none');
  if (DRY || approve.length === 0) return;
  for (let i = 0; i < approve.length; i += 100) {
    const { error } = await db.from('deals').update({ status: 'approved', reviewed_at: new Date().toISOString() }).in('id', approve.slice(i, i + 100).map((a) => a.id));
    if (error) throw error;
  }
  console.log(`approved ${approve.length}`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
