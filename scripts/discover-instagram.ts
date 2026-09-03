/**
 * Find Madison food businesses that post on Instagram, via hashtag/keyword search.
 *   pnpm discover:instagram            # default hashtags
 *   pnpm discover:instagram tag1 tag2  # custom
 * Business accounts that geocode inside the launch bbox are inserted INACTIVE with an
 * Instagram source; review and activate them in /admin/businesses?status=inactive.
 */
import { loadEnv } from '../worker/env';
loadEnv();
import { runActor } from '../src/lib/adapters/apify-client';
import { haversineM } from '../src/lib/geo/distance';
import { FOOD_POI_RE, poiSearch } from '../src/lib/geo/mapbox';
import { createServiceClient } from '../src/lib/supabase/service-client';

const DEFAULT_TAGS = ['madisoneats', 'madisonwi', 'madisonfood', 'madisonfoodie', 'madisonhappyhour', 'madisonfishfry', 'eatmadison', 'madisonwisconsin'];
const FOOD_RE = /restaurant|food|pizza|bar\b|pub|tavern|cafe|café|coffee|bakery|brew|taco|burger|dining|deli|ice cream|dessert|grill|kitchen|eatery|bistro|supper club|sushi|bbq|barbecue|wings|donut|bagel|noodle|ramen|pho|mexican|italian|chinese|thai|indian|diner|market|grocery|creamery|custard|cheese|sandwich|juice|tea/i;
const SKIP_CATEGORY = /photograph|blogger|creator|influencer|personal|artist|media|magazine|journalist/i;

interface Post { ownerUsername?: string; ownerFullName?: string; caption?: string; locationName?: string }
interface Profile { username?: string; fullName?: string; biography?: string; isBusinessAccount?: boolean; businessCategoryName?: string | null; externalUrl?: string; followersCount?: number; postsCount?: number; private?: boolean }


function inBbox(lat: number, lng: number): boolean {
  const [minLng, minLat, maxLng, maxLat] = (process.env.LAUNCH_BBOX ?? '-89.62,42.95,-89.18,43.22').split(',').map(Number);
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

// Generic words that appear in most venue names and must not count as a match on their own.
const STOP = new Set(['the', 'and', 'bar', 'grill', 'restaurant', 'cafe', 'madison', 'wisconsin', 'llc', 'inc', 'co', 'company', 'shop', 'kitchen', 'lounge', 'pub', 'market', 'food', 'hall', 'wi']);
const nameTokens = (s: string) => new Set(s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t)));
/** True when the distinctive words of two venue names mostly overlap ("Ático Lounge - Madison" ↔ "Ático Lounge"; not "Silver Eagle" ↔ "Golden Eagle Barneveld"). */
export function namesMatch(a: string, b: string): boolean {
  const A = nameTokens(a), B = nameTokens(b);
  if (!A.size || !B.size) return false;
  let hit = 0;
  for (const t of A) if (B.has(t)) hit++;
  return hit / Math.min(A.size, B.size) >= 0.5;
}

async function main() {
  const tags = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_TAGS;
  const db = createServiceClient();
  const token = process.env.MAPBOX_SERVER_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new Error('Mapbox token needed to geocode businesses');

  console.log(`Scraping ${tags.length} hashtags…`);
  const posts = await runActor<Post>('apify~instagram-hashtag-scraper', { hashtags: tags, resultsType: 'posts', resultsLimit: 20 }, { timeoutSec: 600 });
  const counts = new Map<string, { n: number; captions: string[] }>();
  for (const p of posts) {
    const u = p.ownerUsername?.toLowerCase();
    if (!u) continue;
    const e = counts.get(u) ?? { n: 0, captions: [] };
    e.n++;
    if (p.caption) e.captions.push(p.caption.slice(0, 200));
    counts.set(u, e);
  }
  console.log(`${posts.length} posts from ${counts.size} accounts`);

  const { data: existing } = await db.from('sources').select('handle').eq('type', 'instagram');
  const known = new Set(((existing ?? []) as { handle: string | null }[]).map((s) => s.handle?.toLowerCase()).filter(Boolean));
  const candidates = [...counts.entries()].filter(([u]) => !known.has(u)).sort((a, b) => b[1].n - a[1].n).slice(0, 40).map(([u]) => u);
  if (candidates.length === 0) { console.log('no new accounts'); return; }

  console.log(`Profiling ${candidates.length} accounts…`);
  const profiles = await runActor<Profile>('apify~instagram-profile-scraper', { usernames: candidates }, { timeoutSec: 600 });
  let added = 0;
  let attached = 0;
  const skipped: string[] = [];
  for (const pr of profiles) {
    const u = pr.username?.toLowerCase();
    if (!u || pr.private) continue;
    const cat = pr.businessCategoryName ?? '';
    const bio = pr.biography ?? '';
    const name = (pr.fullName ?? u).trim();
    const localish = /madison|wisconsin|\bwi\b|608|middleton|fitchburg|verona|sun prairie|monona|waunakee/i.test(`${bio} ${name}`);
    const foodish = FOOD_RE.test(cat) || FOOD_RE.test(bio) || FOOD_RE.test(name);
    if (!foodish || SKIP_CATEGORY.test(cat)) { skipped.push(`${u} (${cat || 'no category'}: not food)`); continue; }
    // Verify it is a real place: Mapbox POI search by name near downtown, must be a food category inside the bbox
    // AND carry the same distinctive name (Mapbox happily returns "Silver Eagle" for "Golden Eagle Barneveld").
    const pois = await poiSearch(`${name}`, token, { lat: 43.0731, lng: -89.4012 }).catch(() => [] as Awaited<ReturnType<typeof poiSearch>>[number][]);
    const hit = pois.find((r) => inBbox(r.lat, r.lng) && (r.categories.some((c) => FOOD_POI_RE.test(c)) || r.categories.length === 0) && (namesMatch(name, r.name) || namesMatch(u, r.name)));
    if (!hit) { skipped.push(`${u} (${name}: ${localish ? 'no matching place in Madison' : 'not local'})`); continue; }
    // Already seeded (OSM/Reddit/Kroger)? Attach the handle to that business instead of creating a duplicate.
    const firstWord = [...nameTokens(hit.name)][0] ?? hit.name.split(/\s+/)[0];
    const { data: near } = await db.from('businesses').select('id,name,lat,lng').ilike('name', `%${firstWord}%`).limit(25);
    const dup = ((near ?? []) as { id: string; name: string; lat: number | null; lng: number | null }[])
      .find((b) => b.lat != null && b.lng != null && haversineM(b.lat, b.lng, hit.lat, hit.lng) < 150 && namesMatch(b.name, hit.name));
    if (dup) {
      const { error: se } = await db.from('sources').insert({ business_id: dup.id, type: 'instagram', handle: u, crawl_interval_hours: 24, notes: `discovered via #${tags[0]} · ${cat} · ${pr.followersCount ?? '?'} followers` });
      if (se) { skipped.push(`${u} (attach to ${dup.name} failed: ${se.message})`); continue; }
      attached++;
      console.log(`  ~ ${dup.name} (@${u}) — handle attached to existing business`);
      continue;
    }
    const isGrocery = /grocery|supermarket|co-op|coop/i.test(`${cat} ${name} ${hit.categories.join(' ')}`) && !/restaurant|bar|cafe/i.test(cat);
    let slug = slugify(name) || u;
    const { data: clash } = await db.from('businesses').select('id').eq('slug', slug).maybeSingle();
    if (clash) slug = `${slug}-${u.slice(0, 8)}`;
    const { data: biz, error } = await db.from('businesses').insert({
      name: hit.name.length > 2 ? hit.name : name, slug, category: isGrocery ? 'grocery' : 'restaurant', address: hit.label, city: 'Madison', state: 'WI',
      website_url: pr.externalUrl ?? null, location: `SRID=4326;POINT(${hit.lng} ${hit.lat})`, is_active: false,
    }).select('id').single();
    if (error) { skipped.push(`${u} (insert failed: ${error.message})`); continue; }
    await db.from('sources').insert({ business_id: (biz as { id: string }).id, type: 'instagram', handle: u, crawl_interval_hours: 24, notes: `discovered via #${tags[0]} · ${cat} · ${pr.followersCount ?? '?'} followers` });
    added++;
    console.log(`  + ${hit.name} (@${u}) — ${cat || hit.categories.slice(0, 2).join('/')} — ${hit.label}`);
  }
  console.log(`\n${added} businesses added (inactive, awaiting review), ${attached} handles attached to existing businesses. Skipped ${skipped.length}:`);
  for (const s of skipped) console.log(`  - ${s}`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
