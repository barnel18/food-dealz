import { dedupeKey } from '@/lib/deals/dedupe';
import { dateInTz, dayEndIso, dayStartIso, normalizeDate } from '@/lib/deals/dates';
import type { DealType, SourceType } from '@/lib/deals/types';
import { computeUnitPrice } from '@/lib/deals/unit-price';
import { CANONICAL_ITEMS, CANONICAL_ITEM_BY_SLUG, type BusinessCategory, type UnitKind } from '@/lib/taxonomy/canonical-items';
import type { ExtractedDeal } from './schema';

/** Row ready to insert into public.deals (plus review metadata). */
export interface DealDraft {
  business_id: string;
  source_capture_id: string;
  source_type: SourceType;
  title: string;
  item_name: string;
  canonical_item_slug: string | null;
  deal_type: DealType;
  price: number | null;
  regular_price: number | null;
  percent_off: number | null;
  quantity: number;
  unit: UnitKind;
  unit_price: number | null;
  conditions: string | null;
  starts_at: string | null;
  ends_at: string | null;
  days_of_week: number[] | null;
  time_window: string | null;
  extraction_confidence: number;
  evidence_quote: string | null;
  status: 'pending' | 'approved';
  dedupe_key: string;
  /** Why this draft needs a human (empty when auto-approved). */
  review_reasons: string[];
}

export interface PostprocessContext {
  businessId: string;
  businessCategory: BusinessCategory;
  sourceType: SourceType;
  captureId: string;
  capturedAt: Date;
  capturedText: string;
  usedImages: boolean;
  autoApproveThreshold: number;
}

export interface PostprocessResult {
  drafts: DealDraft[];
  dropped: Array<{ title: string; reason: string }>;
}

/** Sources trusted enough to publish without a human when the checks pass. */
const AUTO_APPROVE_SOURCES: ReadonlySet<SourceType> = new Set(['website', 'kroger_api', 'business_portal', 'manual']);
const UNIT_PRICE_SANE = { min: 0.05, max: 500 };

const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

/** Every numeric token in the source text, normalized ("$5.00" -> 5, "99¢" -> 0.99). */
function numericTokens(text: string): Set<number> {
  const out = new Set<number>();
  for (const m of text.matchAll(/(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s*(¢|cents?)?/gi)) {
    const whole = Number(m[1].replace(/,/g, ''));
    const frac = m[2] ? Number(`0.${m[2]}`) : 0;
    const v = whole + frac;
    out.add(v);
    if (m[3]) out.add(Math.round(whole) / 100);
  }
  return out;
}

function priceAppearsInText(price: number, tokens: Set<number>): boolean {
  if (tokens.has(price)) return true;
  // "$1.50" may be written as "1.5", "150¢" etc.
  return tokens.has(Math.round(price * 100) / 100) || (price < 1 && tokens.has(Math.round(price * 100)));
}

function resolveSlug(raw: string | null, itemName: string, category: BusinessCategory): string | null {
  if (raw) {
    const item = CANONICAL_ITEM_BY_SLUG.get(raw);
    if (item && item.businessCategory === category) return raw;
  }
  const name = itemName.toLowerCase().trim();
  if (name.length < 3) return null;
  let best: { slug: string; score: number } | null = null;
  for (const item of CANONICAL_ITEMS) {
    if (item.businessCategory !== category) continue;
    for (const alias of [item.displayName.toLowerCase(), ...item.aliases]) {
      if (alias.length < 4) continue;
      const hit = name.includes(alias) || alias.includes(name);
      if (hit && (!best || alias.length > best.score)) best = { slug: item.slug, score: alias.length };
    }
  }
  return best?.slug ?? null;
}

export function postprocess(raw: ExtractedDeal[], ctx: PostprocessContext): PostprocessResult {
  const drafts: DealDraft[] = [];
  const dropped: PostprocessResult['dropped'] = [];
  const tokens = numericTokens(ctx.capturedText);
  const captureDate = dateInTz(ctx.capturedAt);
  const horizon = new Date(ctx.capturedAt.getTime() + 90 * 86400_000);

  for (const d of raw) {
    const reasons: string[] = [];
    let confidence = Math.min(1, Math.max(0, Number(d.confidence) || 0));
    const title = (d.title || d.item_name || '').trim().slice(0, 120);
    const itemName = (d.item_name || d.title || '').trim().slice(0, 80);
    if (!title) {
      dropped.push({ title: '(untitled)', reason: 'no title or item name' });
      continue;
    }

    const price = num(d.price);
    const regular = num(d.regular_price);
    const percent = num(d.percent_off);
    const quantity = num(d.quantity) || 1;
    const dealType = d.deal_type;

    if ((dealType === 'fixed_price' || dealType === 'bundle') && price == null) {
      dropped.push({ title, reason: `${dealType} without a price` });
      continue;
    }

    // Hallucination gate: prices must be visible in the source text.
    const pricesToCheck = [price, regular].filter((p): p is number => p != null);
    const gateFailed = pricesToCheck.some((p) => !priceAppearsInText(p, tokens));
    if (gateFailed) {
      if (ctx.usedImages && d.evidence_quote) {
        reasons.push('price read from image; verify against the photo');
        confidence = Math.min(confidence, 0.7);
      } else {
        dropped.push({ title, reason: `price not found in source text (${pricesToCheck.join(', ')})` });
        continue;
      }
    }

    // Dates.
    let startsAt = normalizeDate(d.starts_at, ctx.capturedAt);
    let endsAt = normalizeDate(d.ends_at, ctx.capturedAt);
    if (startsAt && endsAt && endsAt < startsAt) {
      endsAt = null;
      confidence -= 0.2;
      reasons.push('end date before start date');
    }
    if (endsAt && new Date(dayEndIso(endsAt)) > horizon) {
      endsAt = null;
      confidence -= 0.2;
      reasons.push('end date more than 90 days out');
    }
    if (startsAt && new Date(dayStartIso(startsAt)) > horizon) startsAt = null;
    if (endsAt && endsAt < captureDate) {
      dropped.push({ title, reason: `already ended (${endsAt})` });
      continue;
    }

    let days = Array.isArray(d.days_of_week) ? Array.from(new Set(d.days_of_week.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))) : null;
    if (days && (days.length === 0 || days.length === 7)) days = null;

    const slug = resolveSlug(d.canonical_item_slug, itemName, ctx.businessCategory);
    if (!slug) reasons.push('no canonical item matched');
    const comparable = slug ? CANONICAL_ITEM_BY_SLUG.get(slug)?.comparableUnit : undefined;
    const unitPrice = comparable
      ? computeUnitPrice({ dealType, price, regularPrice: regular, percentOff: percent, quantity, unit: d.unit }, comparable)
      : null;
    if (unitPrice != null && (unitPrice < UNIT_PRICE_SANE.min || unitPrice > UNIT_PRICE_SANE.max)) {
      reasons.push(`unit price ${unitPrice} outside sane range`);
    }

    confidence = Math.round(Math.min(1, Math.max(0, confidence)) * 100) / 100;
    const trustedSource = AUTO_APPROVE_SOURCES.has(ctx.sourceType);
    if (!trustedSource) reasons.push(`${ctx.sourceType} deals are reviewed by hand`);
    if (confidence < ctx.autoApproveThreshold) reasons.push(`confidence ${confidence} below ${ctx.autoApproveThreshold}`);
    const status: DealDraft['status'] = reasons.length === 0 ? 'approved' : 'pending';

    drafts.push({
      business_id: ctx.businessId,
      source_capture_id: ctx.captureId,
      source_type: ctx.sourceType,
      title,
      item_name: itemName,
      canonical_item_slug: slug,
      deal_type: dealType,
      price,
      regular_price: regular,
      percent_off: percent,
      quantity,
      unit: d.unit,
      unit_price: unitPrice,
      conditions: d.conditions?.trim() || null,
      starts_at: startsAt ? dayStartIso(startsAt) : null,
      ends_at: endsAt ? dayEndIso(endsAt) : null,
      days_of_week: days,
      time_window: d.time_window?.trim() || null,
      extraction_confidence: confidence,
      evidence_quote: d.evidence_quote?.trim().slice(0, 500) || null,
      status,
      dedupe_key: dedupeKey({ businessId: ctx.businessId, slug, itemName, dealType, price, quantity, unit: d.unit }),
      review_reasons: reasons,
    });
  }
  return { drafts, dropped };
}
