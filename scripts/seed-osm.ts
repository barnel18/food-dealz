/**
 * Seed every restaurant, bar, cafe and grocery store in the launch bbox from OpenStreetMap.
 *   pnpm osm:seed                 # queries Overpass live
 *   pnpm osm:seed --from-file f   # reuse a saved Overpass JSON
 * Independents with a website get a `website` source (weekly). Chains are tagged with brand/chain_key.
 */
import { loadEnv } from '../worker/env';
loadEnv();
import { readFileSync } from 'node:fs';
import { FLIPP_MERCHANTS } from '../src/lib/adapters/flipp';
import { haversineM } from '../src/lib/geo/distance';
import { createServiceClient } from '../src/lib/supabase/service-client';

interface El { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

const BBOX = (process.env.LAUNCH_BBOX ?? '-89.62,42.95,-89.18,43.22').split(',').map(Number);
const GROCERY_SHOPS = new Set(['supermarket', 'butcher', 'bakery', 'deli', 'greengrocer', 'convenience']);
const CHAIN_NAMES: Record<string, string> = {
  "pick 'n save": 'kroger', 'pick n save': 'kroger', 'metro market': 'kroger', ...Object.fromEntries(Object.entries(FLIPP_MERCHANTS).map(([k, v]) => [k, v.chainKey])),
  'whole foods': 'wholefoods', "trader joe": 'traderjoes', 'costco': 'costco', 'walmart': 'walmart', 'target': 'target', 'aldi': 'aldi', 'hy-vee': 'hyvee', 'hyvee': 'hyvee', "woodman": 'woodmans', 'meijer': 'meijer', 'festival foods': 'festival', "metcalfe": 'metcalfes',
};
// Big franchises whose location pages never carry local deals — skip the website source, keep the business.
const NO_CRAWL_BRANDS = /subway|mcdonald|burger king|wendy|taco bell|domino|little caesars|papa john|pizza hut|dairy queen|culver|starbucks|dunkin|panera|chipotle|jimmy john|arby|kfc|popeyes|chick-fil-a|five guys|noodles|qdoba|panda express|sonic|hardee|potbelly|jersey mike|cousins subs|erbert|kwik trip|casey|speedway|walgreens|cvs|7-eleven|applebee|olive garden|red lobster|buffalo wild wings|texas roadhouse|ihop|denny|perkins|caribou|einstein|jamba|smoothie king|hooters|hy-vee|walmart|target|costco|aldi|woodman|meijer|festival|metcalfe|pick 'n save|metro market|whole foods|trader joe|fresh madison|capitol centre/i;

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const titleish = (s: string) => s.replace(/\s+/g, ' ').trim();

async function fetchOverpass(): Promise<El[]> {
  const [minLng, minLat, maxLng, maxLat] = BBOX;
  const bb = `${minLat},${minLng},${maxLat},${maxLng}`;
  const q = `[out:json][timeout:90];(node["amenity"~"^(restaurant|bar|pub|cafe|fast_food|ice_cream|biergarten|food_court)$"](${bb});way["amenity"~"^(restaurant|bar|pub|cafe|fast_food|ice_cream|biergarten)$"](${bb});node["shop"~"^(supermarket|butcher|bakery|deli|greengrocer)$"](${bb});way["shop"~"^(supermarket|butcher|bakery|deli|greengrocer)$"](${bb}););out center tags;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'User-Agent': 'fooddealz/0.1', 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(q)}` });
  if (!res.ok) throw new Error(`overpass ${res.status}`);
  return ((await res.json()) as { elements: El[] }).elements;
}

function websiteOf(t: Record<string, string>): string | null {
  const w = t.website ?? t['contact:website'] ?? t.url ?? null;
  if (!w || /facebook|instagram|yelp|doordash|grubhub|linktr\.ee/i.test(w)) return null;
  return /^https?:\/\//.test(w) ? w : `https://${w}`;
}

async function main() {
  const idx = process.argv.indexOf('--from-file');
  const elements = idx >= 0 ? (JSON.parse(readFileSync(process.argv[idx + 1], 'utf8')) as { elements: El[] }).elements : await fetchOverpass();
  const db = createServiceClient();
  const { data: existingRows } = await db.from('businesses').select('id, name, osm_id, lat, lng, chain_key');
  const existing = (existingRows ?? []) as { id: string; name: string; osm_id: string | null; lat: number; lng: number; chain_key: string | null }[];
  const knownOsm = new Set(existing.map((e) => e.osm_id).filter(Boolean));
  let added = 0, sources = 0, skippedDup = 0, unnamed = 0;

  for (const el of elements) {
    const t = el.tags ?? {};
    const name = titleish(t.name ?? '');
    const lat = el.lat ?? el.center?.lat; const lng = el.lon ?? el.center?.lon;
    if (!name || lat == null || lng == null) { unnamed++; continue; }
    const osmId = `${el.type}/${el.id}`;
    if (knownOsm.has(osmId)) continue;
    // Same-named business within 150 m already exists (e.g. our seeded ones): link the osm id and move on.
    const dup = existing.find((e) => haversineM(e.lat, e.lng, lat, lng) < 150 && (e.name.toLowerCase().includes(name.toLowerCase().slice(0, 8)) || name.toLowerCase().includes(e.name.toLowerCase().slice(0, 8))));
    if (dup) { await db.from('businesses').update({ osm_id: osmId }).eq('id', dup.id).is('osm_id', null); skippedDup++; continue; }

    const kind = t.amenity ?? t.shop ?? '';
    const category = GROCERY_SHOPS.has(kind) ? 'grocery' : 'restaurant';
    const lname = name.toLowerCase();
    const chainKey = Object.entries(CHAIN_NAMES).find(([k]) => lname.includes(k))?.[1] ?? null;
    const brand = t.brand ?? (NO_CRAWL_BRANDS.test(name) ? name : null);
    const address = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ') || null;
    const city = t['addr:city'] ?? 'Madison';
    let slug = slugify(name) || `osm-${el.id}`;
    const { data: clash } = await db.from('businesses').select('id').eq('slug', slug).maybeSingle();
    if (clash) slug = `${slug}-${el.id.toString(36)}`;
    const website = websiteOf(t);
    const { data: biz, error } = await db.from('businesses').insert({
      name, slug, category, chain_key: chainKey, brand, osm_id: osmId,
      address: address ? `${address}, ${city}, WI${t['addr:postcode'] ? ` ${t['addr:postcode']}` : ''}` : null,
      city, state: 'WI', postal_code: t['addr:postcode'] ?? null,
      phone: t.phone ?? t['contact:phone'] ?? null, website_url: website,
      location: `SRID=4326;POINT(${lng} ${lat})`, is_active: true,
    }).select('id').single();
    if (error) { console.log(`  ! ${name}: ${error.message}`); continue; }
    added++;
    existing.push({ id: (biz as { id: string }).id, name, osm_id: osmId, lat, lng, chain_key: chainKey });
    if (website && !brand && !chainKey) {
      await db.from('sources').insert({ business_id: (biz as { id: string }).id, type: 'website', url: website, crawl_interval_hours: 168, notes: `osm ${kind}` });
      sources++;
    }
  }
  console.log(`OSM: ${elements.length} elements → ${added} businesses added, ${sources} website sources, ${skippedDup} matched existing, ${unnamed} unnamed skipped`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
