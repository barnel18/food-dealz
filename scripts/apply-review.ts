/** Apply reviewed decisions to pending deals. pnpm deals:apply <decisions.json> [--dry]
 *  decisions.json: { decisions: [{ id, action: 'approve'|'reject', slug, quantity, unit, item_name, reason, needs_human? }] }
 *  Recomputes unit_price from the deal's stored price fields and the (possibly corrected) slug/quantity/unit. */
import { loadEnv } from '../worker/env';
loadEnv();
import { readFileSync } from 'node:fs';
import { createServiceClient } from '../src/lib/supabase/service-client';
import { CANONICAL_ITEM_BY_SLUG } from '../src/lib/taxonomy/canonical-items';
import { computeUnitPrice } from '../src/lib/deals/unit-price';
import type { UnitKind } from '../src/lib/taxonomy/canonical-items';

type Decision = { id: string; action: 'approve' | 'reject'; slug: string | null; quantity: number; unit: UnitKind; item_name?: string; reason: string; needs_human?: boolean };
type DealRow = { id: string; status: string; deal_type: 'fixed_price' | 'percent_off' | 'amount_off' | 'bogo' | 'bundle' | 'free_item'; price: number | null; regular_price: number | null; percent_off: number | null };

async function main() {
  const [file] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const dry = process.argv.includes('--dry');
  if (!file) throw new Error('usage: pnpm deals:apply <decisions.json> [--dry]');
  const { decisions } = JSON.parse(readFileSync(file, 'utf8')) as { decisions: Decision[] };
  const db = createServiceClient();
  const ids = decisions.map((d) => d.id);
  const { data, error } = await db.from('deals').select('id,status,deal_type,price,regular_price,percent_off').in('id', ids);
  if (error) throw error;
  const byId = new Map(((data ?? []) as DealRow[]).map((r) => [r.id, r]));
  let approved = 0, rejected = 0, skipped = 0;
  for (const d of decisions) {
    const row = byId.get(d.id);
    if (!row || row.status !== 'pending' || d.needs_human) { skipped++; continue; }
    if (d.slug && !CANONICAL_ITEM_BY_SLUG.has(d.slug)) { console.log(`  unknown slug ${d.slug} on ${d.id} → left pending`); skipped++; continue; }
    const item = d.slug ? CANONICAL_ITEM_BY_SLUG.get(d.slug)! : null;
    const unitPrice = item
      ? computeUnitPrice({ dealType: row.deal_type, price: row.price, regularPrice: row.regular_price, percentOff: row.percent_off, quantity: d.quantity, unit: d.unit }, item.comparableUnit)
      : null;
    const patch = {
      status: d.action === 'approve' ? 'approved' : 'rejected',
      canonical_item_slug: d.slug,
      quantity: d.quantity,
      unit: d.unit,
      unit_price: unitPrice,
      ...(d.item_name ? { item_name: d.item_name } : {}),
      reviewed_at: new Date().toISOString(),
    };
    console.log(`  ${patch.status.padEnd(8)} ${d.id.slice(0, 8)} ${String(d.slug ?? '-').padEnd(22)} ${d.quantity} ${d.unit} → unit ${unitPrice ?? '-'} | ${d.reason.slice(0, 90)}`);
    if (!dry) {
      const { error: e } = await db.from('deals').update(patch).eq('id', d.id);
      if (e) throw e;
    }
    if (d.action === 'approve') approved++; else rejected++;
  }
  console.log(`${dry ? '[dry] ' : ''}approved ${approved}, rejected ${rejected}, skipped ${skipped} (needs human / not pending)`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
