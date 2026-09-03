/**
 * Enrich businesses from Google Places (New): rating, review count, price level, cuisines, hours, photos, reviews.
 *   pnpm google:sync [--limit N] [--force] [--photos N] [--only-missing] [--dry] [--ids id1,id2]
 * Skips businesses synced in the last 25 days unless --force. Verifies the Google match by name + distance (<250 m)
 * before writing anything. Photos are copied into the public `media` bucket (places/<business_id>/<n>.jpg) — refreshed
 * with each sync to stay inside Google's 30-day content policy.
 */
import { loadEnv } from '../worker/env';
loadEnv();
import { downloadPhoto, findPlaceId, placeDetails, priceLevelNumber } from '../src/lib/adapters/google-places';
import { AdapterError } from '../src/lib/adapters/types';
import { haversineM } from '../src/lib/geo/distance';
import { cuisinesFromTypes } from '../src/lib/places/cuisines';
import { namesMatch } from '../src/lib/places/names';
import { createServiceClient } from '../src/lib/supabase/service-client';

type Biz = { id: string; name: string; address: string | null; lat: number | null; lng: number | null; google_place_id: string | null; phone: string | null; website_url: string | null; photo_url: string | null; google_synced_at: string | null; is_active: boolean };

const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(n);
const opt = (n: string) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const DRY = flag('--dry');
const FORCE = flag('--force');
const ONLY_MISSING = flag('--only-missing');
const LIMIT = Number(opt('--limit') ?? 5000);
const PHOTOS = Number(opt('--photos') ?? 3);
const IDS = opt('--ids')?.split(',').map((s) => s.trim()).filter(Boolean);
const CONCURRENCY = 4;
const STALE_DAYS = 25;

const db = createServiceClient();
const stats = { checked: 0, matched: 0, updated: 0, noMatch: 0, mismatch: 0, photos: 0, reviews: 0, errors: 0, searches: 0, details: 0 };

async function loadBusinesses(): Promise<Biz[]> {
  const out: Biz[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from('businesses').select('id,name,address,lat,lng,google_place_id,phone,website_url,photo_url,google_synced_at,is_active')
      .eq('is_active', true).eq('is_aggregator', false).order('name').range(from, from + 999);
    if (IDS?.length) q = q.in('id', IDS);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...((data ?? []) as Biz[]));
    if (!data || data.length < 1000) break;
  }
  const staleBefore = Date.now() - STALE_DAYS * 86400_000;
  return out.filter((b) => {
    if (ONLY_MISSING) return !b.google_synced_at;
    if (FORCE) return true;
    return !b.google_synced_at || new Date(b.google_synced_at).getTime() < staleBefore;
  }).slice(0, LIMIT);
}

async function syncOne(b: Biz): Promise<void> {
  stats.checked++;
  if (b.lat == null || b.lng == null) { stats.noMatch++; return; }
  let placeId = b.google_place_id;
  if (!placeId) {
    stats.searches++;
    placeId = await findPlaceId(`${b.name}, ${b.address ?? 'Madison, WI'}`, { lat: b.lat, lng: b.lng });
    if (!placeId) { stats.noMatch++; console.log(`  · ${b.name}: no Google match`); return; }
  }
  stats.details++;
  const p = await placeDetails(placeId);
  const gName = p.displayName?.text ?? '';
  const dist = p.location ? haversineM(b.lat, b.lng, p.location.latitude, p.location.longitude) : null;
  if (!namesMatch(b.name, gName) || dist == null || dist > 250) {
    stats.mismatch++;
    console.log(`  ✗ ${b.name}: Google returned "${gName}" ${dist == null ? '' : `${Math.round(dist)} m away`} — skipped`);
    return;
  }
  stats.matched++;
  if (DRY) { console.log(`  ✓ ${b.name} ← "${gName}" ★${p.rating ?? '-'} (${p.userRatingCount ?? 0}) ${p.primaryType ?? ''} photos ${p.photos?.length ?? 0} reviews ${p.reviews?.length ?? 0}`); return; }

  // Photos → our bucket (first one doubles as the hero photo when we have none).
  const photos: Array<{ url: string; width: number; height: number; attribution: string | null; attribution_uri: string | null }> = [];
  for (const [i, ph] of (p.photos ?? []).slice(0, PHOTOS).entries()) {
    try {
      const img = await downloadPhoto(ph.name, 1200);
      if (!img) continue;
      const ext = img.contentType.includes('png') ? 'png' : img.contentType.includes('webp') ? 'webp' : 'jpg';
      const path = `places/${b.id}/${i}.${ext}`;
      const { error } = await db.storage.from('media').upload(path, img.bytes, { contentType: img.contentType, upsert: true, cacheControl: '2592000' });
      if (error) throw new Error(error.message);
      const url = `${db.storage.from('media').getPublicUrl(path).data.publicUrl}?v=${Date.now().toString(36)}`;
      const a = ph.authorAttributions?.[0];
      photos.push({ url, width: ph.widthPx, height: ph.heightPx, attribution: a?.displayName ?? null, attribution_uri: a?.uri ?? null });
      stats.photos++;
    } catch (e) {
      console.warn(`  ! ${b.name}: photo ${i} failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  const hours = p.regularOpeningHours ? { periods: p.regularOpeningHours.periods ?? [], weekdayDescriptions: p.regularOpeningHours.weekdayDescriptions ?? [] } : null;
  const patch = {
    google_place_id: placeId,
    rating: p.rating ?? null,
    review_count: p.userRatingCount ?? null,
    price_level: priceLevelNumber(p.priceLevel),
    cuisines: cuisinesFromTypes(p.types ?? [], p.primaryType),
    google_types: [...(p.primaryType ? [p.primaryType] : []), ...(p.types ?? [])].filter((t, i, a) => a.indexOf(t) === i),
    primary_type: p.primaryTypeDisplayName?.text ?? p.primaryType ?? null,
    hours,
    photos,
    editorial_summary: p.editorialSummary?.text ?? null,
    google_maps_uri: p.googleMapsUri ?? null,
    google_synced_at: new Date().toISOString(),
    ...(b.phone ? {} : p.nationalPhoneNumber ? { phone: p.nationalPhoneNumber } : {}),
    ...(b.website_url ? {} : p.websiteUri ? { website_url: p.websiteUri } : {}),
    ...(!b.photo_url && photos[0] ? { photo_url: photos[0].url } : {}),
    ...(p.businessStatus === 'CLOSED_PERMANENTLY' ? { is_active: false } : {}),
  };
  const { error } = await db.from('businesses').update(patch).eq('id', b.id);
  if (error) throw new Error(`update ${b.name}: ${error.message}`);
  stats.updated++;

  const reviews = (p.reviews ?? []).filter((r) => r.name && (r.text?.text || r.originalText?.text)).map((r) => ({
    business_id: b.id,
    source: 'google',
    external_id: r.name,
    author_name: r.authorAttribution?.displayName ?? null,
    author_uri: r.authorAttribution?.uri ?? null,
    author_photo: r.authorAttribution?.photoUri ?? null,
    rating: r.rating ?? null,
    text: (r.text?.text ?? r.originalText?.text ?? '').slice(0, 2000),
    published_at: r.publishTime ?? null,
    relative_time: r.relativePublishTimeDescription ?? null,
  }));
  if (reviews.length) {
    const { error: re } = await db.from('business_reviews').upsert(reviews, { onConflict: 'business_id,source,external_id' });
    if (re) console.warn(`  ! ${b.name}: reviews upsert failed: ${re.message}`);
    else stats.reviews += reviews.length;
  }
  if (p.businessStatus === 'CLOSED_PERMANENTLY') console.log(`  ⚠ ${b.name}: permanently closed on Google → deactivated`);
  console.log(`  ✓ ${b.name} ★${p.rating ?? '-'} (${p.userRatingCount ?? 0}) ${patch.cuisines.join('/') || p.primaryType || ''} · ${photos.length} photos · ${reviews.length} reviews`);
}

async function main() {
  const list = await loadBusinesses();
  console.log(`${list.length} businesses to sync${DRY ? ' (dry run: search + details only, no writes)' : ''}; photos per place: ${PHOTOS}`);
  let i = 0;
  let quotaHit = false;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < list.length && !quotaHit) {
      const b = list[i++];
      try { await syncOne(b); }
      catch (e) {
        stats.errors++;
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`  ! ${b.name}: ${msg}`);
        if (e instanceof AdapterError && e.kind === 'quota') { quotaHit = true; console.error('Google quota/billing block — stopping.'); }
      }
    }
  }));
  console.log(`\nchecked ${stats.checked} · matched ${stats.matched} · updated ${stats.updated} · no match ${stats.noMatch} · mismatch ${stats.mismatch} · photos ${stats.photos} · reviews ${stats.reviews} · errors ${stats.errors}`);
  console.log(`API calls: ${stats.searches} text searches (free id-only SKU), ${stats.details} place details (~$${(stats.details * 0.025).toFixed(2)}), ${stats.photos} photos (~$${(stats.photos * 0.007).toFixed(2)})`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
