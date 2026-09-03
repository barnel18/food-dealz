import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AdapterError, getAdapter, type SourceRow } from '@/lib/adapters';
import type { BusinessRow } from '@/lib/deals/types';
import { resolveAndStoreLogo } from '@/lib/logos/resolve-logo';
import { enqueueJob } from '../queue';

const DISABLE_AFTER_FAILURES = 5;

function contentHash(text: string, images: string[]): string {
  const norm = text.toLowerCase().replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(`${norm}|${[...images].sort().join(',')}`).digest('hex');
}

export async function handleCrawlSource(db: SupabaseClient, payload: Record<string, unknown>): Promise<string> {
  const sourceId = String(payload.source_id ?? '');
  const { data: source, error } = await db.from('sources').select('*').eq('id', sourceId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!source) return 'source no longer exists';
  const src = source as SourceRow;
  if (!src.is_active) return 'source inactive';
  const { data: business } = await db.from('businesses').select('*').eq('id', src.business_id).maybeSingle();
  if (!business) return 'business missing';
  const adapter = getAdapter(src.type);
  if (!adapter) throw new AdapterError(`no adapter for source type ${src.type}`, false);

  try {
    const result = await adapter.crawl(src, business as BusinessRow);
    const rows = result.candidates.map((c) => ({
      source_id: src.id,
      business_id: src.business_id,
      external_id: c.external_id,
      content_hash: contentHash(c.content_text, c.image_urls),
      content_text: c.content_text,
      image_urls: c.image_urls,
      payload: { ...c.payload, structured: c.structured ?? null },
      posted_at: c.posted_at,
    }));

    let inserted: { id: string }[] = [];
    if (rows.length) {
      const { data, error: insErr } = await db
        .from('raw_captures')
        .upsert(rows, { onConflict: 'source_id,content_hash', ignoreDuplicates: true })
        .select('id');
      if (insErr) throw new Error(`insert captures: ${insErr.message}`);
      inserted = (data ?? []) as { id: string }[];

      // Re-seen captures (same hash) keep their deals fresh.
      const hashes = rows.map((r) => r.content_hash);
      const { data: seen } = await db.from('raw_captures').select('id').eq('source_id', src.id).in('content_hash', hashes);
      const seenIds = ((seen ?? []) as { id: string }[]).map((r) => r.id).filter((id) => !inserted.some((i) => i.id === id));
      if (seenIds.length) {
        await db.from('deals').update({ last_seen_at: new Date().toISOString() }).in('source_capture_id', seenIds).in('status', ['approved', 'pending']);
      }
    }
    for (const row of inserted) await enqueueJob(db, 'extract_capture', { capture_id: row.id });

    // First crawl of a business without a logo: try to find one (Instagram profile picture wins).
    const biz = business as BusinessRow;
    if (!biz.logo_url) {
      const pic = (result.candidates[0]?.payload as { profile?: { pic_url?: string | null } } | undefined)?.profile?.pic_url ?? null;
      await resolveAndStoreLogo(db, { id: biz.id, website_url: biz.website_url }, { instagramPicUrl: pic }).catch(() => null);
    }

    // Websites that never change and never yield deals get checked less often (saves crawl credits).
    let interval = src.crawl_interval_hours;
    if (src.type === 'website' && inserted.length === 0) {
      const { count } = await db.from('deals').select('id', { count: 'exact', head: true }).eq('business_id', src.business_id).eq('source_type', 'website');
      if (!count) interval = Math.min(720, Math.max(interval * 2, 168));
    }
    await db
      .from('sources')
      .update({
        last_crawled_at: new Date().toISOString(),
        consecutive_failures: 0,
        crawl_interval_hours: interval,
        ...(inserted.length ? { last_changed_at: new Date().toISOString() } : {}),
      })
      .eq('id', src.id);
    const merchantLogo = (result.candidates[0]?.payload as { merchant_logo?: string | null } | undefined)?.merchant_logo ?? null;
    if (merchantLogo && (business as BusinessRow).chain_key) {
      await db.from('businesses').update({ logo_url: merchantLogo }).eq('chain_key', (business as BusinessRow).chain_key).is('logo_url', null);
    }
    return `${rows.length} captured, ${inserted.length} new${result.unchanged ? ' (unchanged)' : ''}${result.note ? ` — ${result.note}` : ''}`;
  } catch (e) {
    const failures = (src.consecutive_failures ?? 0) + 1;
    await db
      .from('sources')
      .update({ consecutive_failures: failures, last_crawled_at: new Date().toISOString(), ...(failures >= DISABLE_AFTER_FAILURES ? { is_active: false } : {}) })
      .eq('id', src.id);
    throw e;
  }
}
