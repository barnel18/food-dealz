/**
 * Score the extraction prompt against hand-labeled cases in eval/cases/*.json.
 *   pnpm eval             # all cases
 *   pnpm eval grocery     # cases whose file name contains "grocery"
 * A deal matches when slug + price (±0.01) agree; other expected fields are checked when present.
 */
import { loadEnv } from '../worker/env';
loadEnv();
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractDeals, type ExtractionInput } from '../src/lib/extraction/extract';
import { postprocess, type DealDraft } from '../src/lib/extraction/postprocess';
import type { SourceType } from '../src/lib/deals/types';
import { dateInTz } from '../src/lib/deals/dates';

interface Expected { canonical_item_slug: string | null; price?: number; deal_type?: string; days_of_week?: number[]; unit?: string; quantity?: number; regular_price?: number; ends_at?: string }
interface Case { name: string; input: ExtractionInput; expected: Expected[] }

const near = (a: number | null | undefined, b: number | undefined) => b === undefined || (a != null && Math.abs(Number(a) - b) < 0.011);
const sameDays = (a: number[] | null, b: number[] | undefined) => b === undefined || (!!a && a.length === b.length && b.every((d) => a.includes(d)));

function matches(d: DealDraft, e: Expected): boolean {
  return d.canonical_item_slug === e.canonical_item_slug && near(d.price, e.price)
    && (e.deal_type === undefined || d.deal_type === e.deal_type) && sameDays(d.days_of_week, e.days_of_week)
    && (e.unit === undefined || d.unit === e.unit) && near(d.quantity, e.quantity) && near(d.regular_price, e.regular_price)
    && (e.ends_at === undefined || (d.ends_at != null && dateInTz(new Date(d.ends_at)) === e.ends_at));
}

async function main() {
  const filter = process.argv[2] ?? '';
  const dir = join(process.cwd(), 'eval', 'cases');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f.includes(filter)).sort();
  let tp = 0, fp = 0, fn = 0, hallucinated = 0, tokens = 0;
  for (const f of files) {
    const c = JSON.parse(readFileSync(join(dir, f), 'utf8')) as Case;
    const started = Date.now();
    const res = await extractDeals(c.input);
    const { drafts, dropped } = postprocess(res.output.deals, {
      businessId: '00000000-0000-4000-8000-000000000001', businessCategory: c.input.category, sourceType: c.input.sourceType as SourceType,
      captureId: '00000000-0000-4000-8000-000000000002', capturedAt: new Date(`${c.input.captureDate}T18:00:00Z`), capturedText: c.input.text,
      usedImages: res.usedImages, autoApproveThreshold: 0.85,
    });
    tokens += res.usage.inputTokens + res.usage.outputTokens;
    hallucinated += dropped.filter((d) => /not found in source/.test(d.reason)).length;
    const unmatched = [...c.expected];
    const extra: DealDraft[] = [];
    for (const d of drafts) {
      const i = unmatched.findIndex((e) => matches(d, e));
      if (i >= 0) { unmatched.splice(i, 1); tp++; } else { extra.push(d); fp++; }
    }
    fn += unmatched.length;
    console.log(`\n${c.name} (${f}) — ${Date.now() - started}ms, ${drafts.length} extracted / ${c.expected.length} expected`);
    for (const e of unmatched) console.log(`  MISSED   ${e.canonical_item_slug} $${e.price ?? '?'}${e.days_of_week ? ' dow ' + JSON.stringify(e.days_of_week) : ''}`);
    for (const d of extra) console.log(`  EXTRA    ${d.canonical_item_slug ?? '-'} "${d.title}" $${d.price ?? '?'} ${d.deal_type} qty ${d.quantity} ${d.unit}${d.days_of_week ? ' dow ' + JSON.stringify(d.days_of_week) : ''}`);
    for (const d of dropped) console.log(`  DROPPED  ${d.title} (${d.reason})`);
    if (!unmatched.length && !extra.length) console.log('  ✓ exact');
  }
  const precision = tp + fp ? tp / (tp + fp) : 1;
  const recall = tp + fn ? tp / (tp + fn) : 1;
  console.log(`\n== ${files.length} cases: precision ${precision.toFixed(2)} (target ≥0.90), recall ${recall.toFixed(2)} (target ≥0.85), hallucinated prices dropped by gate: ${hallucinated}, tokens ${tokens} ==`);
  if (precision < 0.9 || recall < 0.85) process.exitCode = 1;
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
