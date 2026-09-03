'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { dedupeKey } from '@/lib/deals/dedupe';
import { dayEndIso, dayStartIso } from '@/lib/deals/dates';
import type { DealType } from '@/lib/deals/types';
import { computeUnitPrice } from '@/lib/deals/unit-price';
import { serverEnv } from '@/lib/env';
import { forwardGeocode } from '@/lib/geo/mapbox';
import { createAdminClient } from '@/lib/supabase/admin';
import { CANONICAL_ITEM_BY_SLUG, type UnitKind } from '@/lib/taxonomy/canonical-items';

const Uuid = z.uuid();
const DEAL_TYPES = ['fixed_price', 'percent_off', 'amount_off', 'bogo', 'bundle', 'free_item'] as const;
const UNITS = ['each', 'slice', 'lb', 'oz', 'kg', 'g', 'dozen', 'pack', 'gallon', 'liter', 'fl_oz'] as const;

const optNum = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const optStr = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  return s ? s : null;
};

function revalidateAdmin() {
  revalidatePath('/admin', 'layout');
  revalidatePath('/deals');
  revalidatePath('/cheapest');
}

// ---------------------------------------------------------------- deals
export async function reviewDealAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin('/admin/review');
  const db = createAdminClient();
  const id = Uuid.parse(formData.get('id'));
  const op = String(formData.get('op'));

  if (op === 'reject' || op === 'expire') {
    await db.from('deals').update({ status: op === 'reject' ? 'rejected' : 'expired', reviewed_by: admin.id, reviewed_at: new Date().toISOString() }).eq('id', id);
    revalidateAdmin();
    return;
  }

  const { data: current } = await db.from('deals').select('business_id').eq('id', id).maybeSingle();
  if (!current) return;
  const businessId = (current as { business_id: string }).business_id;

  const dealType = z.enum(DEAL_TYPES).parse(formData.get('deal_type')) as DealType;
  const unit = z.enum(UNITS).parse(formData.get('unit')) as UnitKind;
  const slugRaw = optStr(formData.get('canonical_item_slug'));
  const slug = slugRaw && CANONICAL_ITEM_BY_SLUG.has(slugRaw) ? slugRaw : null;
  const price = optNum(formData.get('price'));
  const regular = optNum(formData.get('regular_price'));
  const percent = optNum(formData.get('percent_off'));
  const quantity = optNum(formData.get('quantity')) ?? 1;
  const title = String(formData.get('title') ?? '').trim().slice(0, 120);
  const itemName = String(formData.get('item_name') ?? '').trim().slice(0, 80) || title;
  const days = formData.getAll('dow').map((d) => Number(d)).filter((n) => n >= 0 && n <= 6);
  const startsAt = optStr(formData.get('starts_at'));
  const endsAt = optStr(formData.get('ends_at'));
  const comparable = slug ? CANONICAL_ITEM_BY_SLUG.get(slug)?.comparableUnit : undefined;

  const patch = {
    title,
    item_name: itemName,
    canonical_item_slug: slug,
    deal_type: dealType,
    price,
    regular_price: regular,
    percent_off: percent,
    quantity,
    unit,
    unit_price: comparable ? computeUnitPrice({ dealType, price, regularPrice: regular, percentOff: percent, quantity, unit }, comparable) : null,
    conditions: optStr(formData.get('conditions')),
    time_window: optStr(formData.get('time_window')),
    days_of_week: days.length && days.length < 7 ? days : null,
    starts_at: startsAt ? dayStartIso(startsAt) : null,
    ends_at: endsAt ? dayEndIso(endsAt) : null,
    is_featured: formData.get('is_featured') === 'on',
    dedupe_key: dedupeKey({ businessId, slug, itemName, dealType, price, quantity, unit }),
    ...(op === 'approve' ? { status: 'approved' as const, reviewed_by: admin.id, reviewed_at: new Date().toISOString() } : {}),
  };
  const { error } = await db.from('deals').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function bulkApproveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin('/admin/review');
  const min = Number(formData.get('min_confidence') ?? '0.9');
  const db = createAdminClient();
  await db
    .from('deals')
    .update({ status: 'approved', reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq('status', 'pending')
    .gte('extraction_confidence', min)
    .not('canonical_item_slug', 'is', null);
  revalidateAdmin();
}

// ------------------------------------------------------------ businesses
function slugify(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'business';
}

export async function createBusinessAction(formData: FormData): Promise<void> {
  await requireAdmin('/admin/businesses');
  const db = createAdminClient();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('name required');
  const category = formData.get('category') === 'grocery' ? 'grocery' : 'restaurant';
  const address = optStr(formData.get('address'));
  let lat = optNum(formData.get('lat'));
  let lng = optNum(formData.get('lng'));
  if ((lat == null || lng == null) && address) {
    const token = serverEnv().mapboxServerToken;
    if (!token) throw new Error('Enter lat/lng, or add a Mapbox token to geocode addresses');
    const [hit] = await forwardGeocode(`${address}, Madison, WI`, token);
    if (!hit) throw new Error(`Could not geocode "${address}"`);
    lat = hit.lat;
    lng = hit.lng;
  }
  if (lat == null || lng == null) throw new Error('Address or lat/lng required');

  let slug = slugify(name);
  const { data: clash } = await db.from('businesses').select('id').eq('slug', slug).maybeSingle();
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const { error } = await db.from('businesses').insert({
    name,
    slug,
    category,
    address,
    city: 'Madison',
    state: 'WI',
    website_url: optStr(formData.get('website_url')),
    phone: optStr(formData.get('phone')),
    chain_key: optStr(formData.get('chain_key')),
    location: `SRID=4326;POINT(${lng} ${lat})`,
  });
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function updateBusinessAction(formData: FormData): Promise<void> {
  await requireAdmin('/admin/businesses');
  const db = createAdminClient();
  const id = Uuid.parse(formData.get('id'));
  const featured = optStr(formData.get('featured_until'));
  const lat = optNum(formData.get('lat'));
  const lng = optNum(formData.get('lng'));
  const patch: Record<string, unknown> = {
    name: String(formData.get('name') ?? '').trim(),
    category: formData.get('category') === 'grocery' ? 'grocery' : 'restaurant',
    address: optStr(formData.get('address')),
    website_url: optStr(formData.get('website_url')),
    phone: optStr(formData.get('phone')),
    chain_key: optStr(formData.get('chain_key')),
    is_active: formData.get('is_active') === 'on',
    is_aggregator: formData.get('is_aggregator') === 'on',
    featured_until: featured ? dayEndIso(featured) : null,
  };
  if (lat != null && lng != null) patch.location = `SRID=4326;POINT(${lng} ${lat})`;
  const { error } = await db.from('businesses').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
  revalidateAdmin();
}

export async function setBusinessActiveAction(formData: FormData): Promise<void> {
  await requireAdmin('/admin/businesses');
  const db = createAdminClient();
  const id = Uuid.parse(formData.get('id'));
  const active = String(formData.get('active')) === '1';
  await db.from('businesses').update({ is_active: active }).eq('id', id);
  if (active) {
    const { data } = await db.from('sources').select('id').eq('business_id', id).eq('is_active', true);
    for (const s of (data ?? []) as { id: string }[]) await db.rpc('enqueue_job', { p_type: 'crawl_source', p_payload: { source_id: s.id } });
  }
  revalidateAdmin();
}

// --------------------------------------------------------------- sources
export async function addSourceAction(formData: FormData): Promise<void> {
  await requireAdmin('/admin/sources');
  const db = createAdminClient();
  const businessId = Uuid.parse(formData.get('business_id'));
  const type = z.enum(['website', 'instagram', 'facebook', 'kroger_api', 'flipp', 'google_posts']).parse(formData.get('type'));
  const value = String(formData.get('value') ?? '').trim();
  if (!value) throw new Error('value required');
  const row: Record<string, unknown> = { business_id: businessId, type, crawl_interval_hours: optNum(formData.get('interval')) ?? (type === 'website' ? 48 : 24) };
  if (type === 'website' || type === 'facebook' || type === 'google_posts') row.url = value;
  else if (type === 'instagram') row.handle = value.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '');
  else row.external_id = value;
  const { data, error } = await db.from('sources').insert(row).select('id').single();
  if (error) throw new Error(error.message);
  if (formData.get('crawl_now') === 'on') await db.rpc('enqueue_job', { p_type: 'crawl_source', p_payload: { source_id: (data as { id: string }).id } });
  revalidateAdmin();
}

export async function sourceOpAction(formData: FormData): Promise<void> {
  await requireAdmin('/admin/sources');
  const db = createAdminClient();
  const id = Uuid.parse(formData.get('id'));
  const op = String(formData.get('op'));
  if (op === 'crawl') await db.rpc('enqueue_job', { p_type: 'crawl_source', p_payload: { source_id: id } });
  else if (op === 'enable') await db.from('sources').update({ is_active: true, consecutive_failures: 0 }).eq('id', id);
  else if (op === 'disable') await db.from('sources').update({ is_active: false }).eq('id', id);
  else if (op === 'delete') await db.from('sources').delete().eq('id', id);
  revalidateAdmin();
}

// -------------------------------------------------------------- captures
export async function rerunExtractionAction(formData: FormData): Promise<void> {
  await requireAdmin('/admin/captures');
  const db = createAdminClient();
  const id = Uuid.parse(formData.get('id'));
  await db.from('raw_captures').update({ extraction_status: 'pending', extraction_error: null }).eq('id', id);
  await db.rpc('enqueue_job', { p_type: 'extract_capture', p_payload: { capture_id: id } });
  revalidateAdmin();
}

// ------------------------------------------------------------------ jobs
export async function jobsOpAction(formData: FormData): Promise<void> {
  await requireAdmin('/admin/jobs');
  const db = createAdminClient();
  const op = String(formData.get('op'));
  if (op === 'retry_failed') await db.rpc('retry_failed_jobs');
  else if (op === 'schedule') {
    await db.rpc('enqueue_due_crawls');
    await db.rpc('enqueue_pending_extractions');
  } else if (op === 'sweep') await db.rpc('enqueue_job', { p_type: 'expire_sweep', p_payload: {} });
  else if (op === 'crawl_all') {
    const { data } = await db.from('sources').select('id').eq('is_active', true);
    for (const s of (data ?? []) as { id: string }[]) await db.rpc('enqueue_job', { p_type: 'crawl_source', p_payload: { source_id: s.id } });
  }
  revalidateAdmin();
}
