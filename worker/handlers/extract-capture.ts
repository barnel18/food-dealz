import type { SupabaseClient } from '@supabase/supabase-js';
import type { StructuredDeal } from '@/lib/adapters';
import type { BusinessRow, SourceType } from '@/lib/deals/types';
import { ExtractionError, extractDeals } from '@/lib/extraction/extract';
import { postprocess, type DealDraft } from '@/lib/extraction/postprocess';
import { dateInTz } from '@/lib/deals/dates';

interface CaptureRow {
  id: string;
  source_id: string;
  business_id: string;
  content_text: string | null;
  image_urls: string[];
  payload: Record<string, unknown> & { structured?: StructuredDeal | null; source_url?: string | null };
  posted_at: string | null;
  captured_at: string;
  extraction_status: string;
}

function threshold(): number {
  const t = Number(process.env.EXTRACTION_AUTO_APPROVE_THRESHOLD ?? '0.85');
  return Number.isFinite(t) ? t : 0.85;
}

/** Merge with an existing live deal at the same business (same dedupe key), else insert. */
async function upsertDeal(db: SupabaseClient, draft: DealDraft): Promise<'merged' | 'inserted'> {
  const nowIso = new Date().toISOString();
  const { data: existing } = await db
    .from('deals')
    .select('id, ends_at, status')
    .eq('business_id', draft.business_id)
    .eq('dedupe_key', draft.dedupe_key)
    .in('status', ['approved', 'pending'])
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    .limit(1)
    .maybeSingle();
  if (existing) {
    const row = existing as { id: string; ends_at: string | null };
    const later = draft.ends_at && (!row.ends_at || draft.ends_at > row.ends_at) ? draft.ends_at : row.ends_at;
    await db.from('deals').update({ last_seen_at: nowIso, ends_at: later, source_capture_id: draft.source_capture_id }).eq('id', row.id);
    return 'merged';
  }
  const { review_reasons, ...row } = draft;
  const { error } = await db.from('deals').insert({ ...row, conditions: row.conditions ?? (review_reasons.length ? null : row.conditions) });
  if (error) throw new Error(`insert deal: ${error.message}`);
  return 'inserted';
}

export async function handleExtractCapture(db: SupabaseClient, payload: Record<string, unknown>): Promise<string> {
  const captureId = String(payload.capture_id ?? '');
  const { data, error } = await db.from('raw_captures').select('*').eq('id', captureId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return 'capture missing';
  const capture = data as CaptureRow;
  if (capture.extraction_status === 'done') return 'already extracted';

  const [{ data: business }, { data: source }] = await Promise.all([
    db.from('businesses').select('*').eq('id', capture.business_id).maybeSingle(),
    db.from('sources').select('type').eq('id', capture.source_id).maybeSingle(),
  ]);
  if (!business || !source) return 'business/source missing';
  const biz = business as BusinessRow;
  const sourceType = (source as { type: SourceType }).type;
  const capturedAt = new Date(capture.captured_at);
  const ctx = {
    businessId: biz.id,
    businessCategory: biz.category,
    sourceType,
    captureId: capture.id,
    capturedAt,
    capturedText: capture.content_text ?? '',
    usedImages: false,
    autoApproveThreshold: threshold(),
  };

  try {
    let drafts: DealDraft[];
    let dropped: Array<{ title: string; reason: string }> = [];
    let model: string | null = null;
    let tokens: number | null = null;
    let note = '';

    const structured = capture.payload?.structured ?? null;
    if (structured) {
      const r = postprocess([structured], ctx);
      drafts = r.drafts;
      dropped = r.dropped;
      model = 'structured';
      note = 'structured source (no LLM)';
    } else if (!(capture.content_text ?? '').trim() && capture.image_urls.length === 0) {
      await db.from('raw_captures').update({ extraction_status: 'skipped', extraction_error: 'empty capture' }).eq('id', capture.id);
      return 'skipped (empty)';
    } else {
      const result = await extractDeals({
        businessName: biz.name,
        category: biz.category,
        sourceType,
        sourceUrl: (capture.payload?.source_url as string | null) ?? null,
        captureDate: dateInTz(capturedAt),
        postedAt: capture.posted_at,
        text: capture.content_text ?? '',
        imageUrls: capture.image_urls ?? [],
      });
      const r = postprocess(result.output.deals, { ...ctx, usedImages: result.usedImages });
      drafts = r.drafts;
      dropped = r.dropped;
      model = result.model;
      tokens = result.usage.inputTokens + result.usage.outputTokens;
      note = `${result.output.deals.length} raw, cache read ${result.usage.cacheReadTokens}${result.output.no_deal_reason ? `; no deals: ${result.output.no_deal_reason}` : ''}`;
    }

    let inserted = 0;
    let merged = 0;
    for (const d of drafts) {
      if ((await upsertDeal(db, d)) === 'inserted') inserted++;
      else merged++;
    }

    await db
      .from('raw_captures')
      .update({
        extraction_status: 'done',
        extraction_model: model,
        extraction_tokens: tokens,
        extraction_error: dropped.length ? `dropped: ${dropped.map((x) => `${x.title} (${x.reason})`).join('; ')}`.slice(0, 2000) : null,
      })
      .eq('id', capture.id);
    return `${inserted} new, ${merged} merged, ${dropped.length} dropped — ${note}`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const retryable = e instanceof ExtractionError ? e.retryable : true;
    if (!retryable) await db.from('raw_captures').update({ extraction_status: 'failed', extraction_error: msg.slice(0, 2000) }).eq('id', capture.id);
    throw e;
  }
}
