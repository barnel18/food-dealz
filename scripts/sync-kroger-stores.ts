/**
 * Upsert every Kroger-banner store near the launch market as a grocery business with a
 * kroger_api source (locationId). Re-runnable.
 *   pnpm kroger:sync [zip] [radiusMiles]
 */
import { loadEnv } from '../worker/env';
loadEnv();
import { createServiceClient } from '../src/lib/supabase/service-client';

interface Loc { locationId: string; chain: string; name: string; phone?: string; address: { addressLine1: string; city: string; state: string; zipCode: string }; geolocation?: { latitude: number; longitude: number } }

const CHAIN_LABEL: Record<string, string> = { 'PICK N SAVE': "Pick 'n Save", 'METRO MARKET': 'Metro Market', KROGER: 'Kroger', MARIANOS: "Mariano's" };
const CHAIN_SITE: Record<string, string> = { 'PICK N SAVE': 'https://www.picknsave.com', 'METRO MARKET': 'https://www.metromarket.net', KROGER: 'https://www.kroger.com' };

function titleCase(s: string) { return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }
function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

async function main() {
  const [zip = '53703', radius = '12'] = process.argv.slice(2);
  const id = process.env.KROGER_CLIENT_ID; const secret = process.env.KROGER_CLIENT_SECRET;
  if (!id || !secret) throw new Error('KROGER_CLIENT_ID / KROGER_CLIENT_SECRET not set');
  const tok = await fetch('https://api.kroger.com/v1/connect/oauth2/token', {
    method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=product.compact',
  }).then((r) => r.json() as Promise<{ access_token: string }>);
  const res = await fetch(`https://api.kroger.com/v1/locations?filter.zipCode.near=${zip}&filter.radiusInMiles=${radius}&filter.limit=50`, { headers: { Authorization: `Bearer ${tok.access_token}` } });
  const { data } = (await res.json()) as { data: Loc[] };
  const db = createServiceClient();
  let added = 0;
  for (const l of data) {
    if (!l.geolocation) continue;
    const chain = CHAIN_LABEL[l.chain] ?? titleCase(l.chain);
    const city = titleCase(l.address.city);
    const name = `${chain} ${titleCase(l.address.addressLine1.replace(/\.$/, ''))}`;
    const slug = slugify(`${chain}-${l.address.addressLine1}-${city}`);
    const { data: biz, error } = await db.from('businesses').upsert({
      name, slug, category: 'grocery', chain_key: 'kroger',
      address: `${titleCase(l.address.addressLine1)}, ${city}, ${l.address.state} ${l.address.zipCode}`,
      city, state: l.address.state, postal_code: l.address.zipCode,
      location: `SRID=4326;POINT(${l.geolocation.longitude} ${l.geolocation.latitude})`,
      phone: l.phone ?? null, website_url: CHAIN_SITE[l.chain] ?? null, is_active: true,
    }, { onConflict: 'slug' }).select('id').single();
    if (error) throw error;
    const bizId = (biz as { id: string }).id;
    const { data: existing } = await db.from('sources').select('id').eq('business_id', bizId).eq('type', 'kroger_api').eq('external_id', l.locationId).maybeSingle();
    if (!existing) {
      const { error: sErr } = await db.from('sources').insert({ business_id: bizId, type: 'kroger_api', external_id: l.locationId, crawl_interval_hours: 24, notes: `${l.chain} · ${l.name}` });
      if (sErr) throw sErr;
    }
    added++;
    console.log(`  ✓ ${name} (${l.locationId})`);
  }
  console.log(`${added} Kroger stores synced near ${zip} (${radius} mi)`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
