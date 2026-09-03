/**
 * Mine r/madisonwi for restaurants and bars people mention alongside deals, then add them as
 * INACTIVE businesses (with website + Instagram sources when discoverable) for review.
 *   pnpm discover:reddit
 * Costs: ~$1 Apify (60 posts + 8 comments each), a few cents of Claude, ~2 Firecrawl credits per candidate.
 *   pnpm discover:reddit --from-file items.json   # reuse a saved Apify dataset instead of scraping
 */
import { loadEnv } from '../worker/env';
loadEnv();
import { readFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { runActor } from '../src/lib/adapters/apify-client';
import { FOOD_POI_RE, poiSearch } from '../src/lib/geo/mapbox';
import { createServiceClient } from '../src/lib/supabase/service-client';

const SEARCHES = ['happy hour', 'fish fry', 'cheap eats', 'lunch special', 'taco tuesday', 'pizza deal', 'best deal', 'half price', 'brunch special', 'wing night', 'cheapest', 'daily specials'];
const SUB = 'madisonwi';

interface RedditItem { dataType?: string; title?: string; body?: string; postUrl?: string; url?: string; score?: number; createdAt?: string; searchTerm?: string }

const Out = z.object({
  businesses: z.array(z.object({
    name: z.string(),
    kind: z.enum(['restaurant', 'bar', 'cafe', 'grocery', 'other']),
    deal_hint: z.string().nullable(),
    mentions: z.number(),
    confidence: z.number(),
  })),
});


async function firecrawlSearch(q: string): Promise<string | null> {
  const res = await fetch('https://api.firecrawl.dev/v2/search', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, limit: 3 }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { data?: Array<{ url?: string }> | { web?: Array<{ url?: string }> } };
  const list = Array.isArray(j.data) ? j.data : j.data?.web ?? [];
  const bad = /yelp|tripadvisor|facebook|instagram|doordash|grubhub|ubereats|google|reddit|isthmus|madison\.com|opentable|restaurantji/i;
  return list.map((x) => x.url ?? '').find((u) => u && !bad.test(u)) ?? null;
}

async function instagramFromSite(url: string): Promise<string | null> {
  const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['links'], onlyMainContent: false, timeout: 30000 }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { data?: { links?: string[] } };
  for (const l of j.data?.links ?? []) {
    const m = String(l).match(/instagram\.com\/([A-Za-z0-9_.]+)\/?/i);
    if (m && !['p', 'explore', 'reel', 'reels', 'accounts', 'stories'].includes(m[1].toLowerCase())) return m[1].toLowerCase();
  }
  return null;
}

function inBbox(lat: number, lng: number): boolean {
  const [minLng, minLat, maxLng, maxLat] = (process.env.LAUNCH_BBOX ?? '-89.62,42.95,-89.18,43.22').split(',').map(Number);
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

async function main() {
  const db = createServiceClient();
  const token = process.env.MAPBOX_SERVER_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new Error('Mapbox token required');

  const fromFile = process.argv.indexOf('--from-file');
  let items: RedditItem[];
  if (fromFile >= 0 && process.argv[fromFile + 1]) {
    items = JSON.parse(readFileSync(process.argv[fromFile + 1], 'utf8')) as RedditItem[];
    console.log(`Loaded ${items.length} items from file`);
  } else {
  console.log(`Searching r/${SUB} for ${SEARCHES.length} phrases…`);
  items = await runActor<RedditItem>('harshmaur~reddit-scraper', {
    searchTerms: SEARCHES, withinCommunity: SUB, searchPosts: true, searchComments: false, searchSort: 'relevance', searchTime: 'year',
    maxPostsCount: 60, crawlCommentsPerPost: true, maxCommentsPerPost: 8, includeNSFW: false,
  }, { timeoutSec: 900, memoryMb: 2048 });
  }
  const posts = items.filter((i) => i.dataType === 'post' || i.title);
  const comments = items.filter((i) => i.dataType === 'comment');
  console.log(`${posts.length} posts, ${comments.length} comments`);
  const clean = (t: string) => t.replace(/[\uD800-\uDFFF]/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\s+\n/g, '\n');
  const corpus = clean([...posts.map((p) => `POST: ${p.title ?? ''}\n${(p.body ?? '').slice(0, 800)}`), ...comments.map((c) => `COMMENT: ${(c.body ?? '').slice(0, 500)}`)].join('\n---\n')).slice(0, 120_000);

  console.log('Asking Claude for the businesses people mention…');
  const client = new Anthropic();
  const res = await client.messages.parse({
    model: process.env.EXTRACTION_MODEL || 'claude-opus-5', max_tokens: 8000,
    system: 'You read Reddit threads from r/madisonwi and list the specific restaurants, bars, cafes and grocery stores in the Madison, Wisconsin area that people mention, especially in connection with deals, specials, happy hours or cheap food. Use the exact business name as locals write it. Skip chains with no local relevance, skip non-food businesses, skip cities other than the Madison metro. mentions = how many distinct posts/comments mention it. deal_hint = the deal people describe, if any. confidence 0-1 that this is a real Madison food business.',
    messages: [{ role: 'user', content: corpus }],
    output_config: { format: zodOutputFormat(Out), effort: 'low' },
  });
  const found = (res.parsed_output?.businesses ?? []).filter((b) => b.confidence >= 0.6).sort((a, b) => b.mentions - a.mentions);
  console.log(`${found.length} candidate businesses`);

  const { data: existing } = await db.from('businesses').select('name');
  const known = new Set(((existing ?? []) as { name: string }[]).map((b) => b.name.toLowerCase()));
  let added = 0; const skipped: string[] = [];
  for (const b of found.slice(0, 40)) {
    if ([...known].some((k) => k.includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(k))) { skipped.push(`${b.name} (already known)`); continue; }
    const pois = await poiSearch(b.name, token, { lat: 43.0731, lng: -89.4012 }).catch(() => [] as Awaited<ReturnType<typeof poiSearch>>[number][]);
    const hit = pois.find((r) => inBbox(r.lat, r.lng) && (r.categories.some((c) => FOOD_POI_RE.test(c)) || r.categories.length === 0));
    if (!hit) { skipped.push(`${b.name} (no matching place in Madison)`); continue; }
    const website = await firecrawlSearch(`${b.name} Madison WI`);
    const ig = website ? await instagramFromSite(website) : null;
    let slug = slugify(b.name);
    const { data: clash } = await db.from('businesses').select('id').eq('slug', slug).maybeSingle();
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: biz, error } = await db.from('businesses').insert({
      name: hit.name.length > 2 ? hit.name : b.name, slug, category: b.kind === 'grocery' ? 'grocery' : 'restaurant', address: hit.label, city: 'Madison', state: 'WI',
      website_url: website, location: `SRID=4326;POINT(${hit.lng} ${hit.lat})`, is_active: false,
    }).select('id').single();
    if (error) { skipped.push(`${b.name} (insert failed: ${error.message})`); continue; }
    const bizId = (biz as { id: string }).id;
    const note = `reddit: ${b.mentions} mentions${b.deal_hint ? ` · ${b.deal_hint.slice(0, 80)}` : ''}`;
    if (website) await db.from('sources').insert({ business_id: bizId, type: 'website', url: website, crawl_interval_hours: 48, notes: note });
    if (ig) await db.from('sources').insert({ business_id: bizId, type: 'instagram', handle: ig, crawl_interval_hours: 24, notes: note });
    added++;
    console.log(`  + ${b.name} — ${hit.label}${website ? ` — ${website}` : ''}${ig ? ` — @${ig}` : ''}${b.deal_hint ? ` — "${b.deal_hint.slice(0, 60)}"` : ''}`);
  }
  console.log(`\n${added} businesses added (inactive, review in /admin/businesses?status=inactive). Skipped ${skipped.length}:`);
  for (const s of skipped) console.log(`  - ${s}`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
