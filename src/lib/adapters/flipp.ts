import type { BusinessRow } from '@/lib/deals/types';
import { CANONICAL_ITEMS, type CanonicalItem, type UnitKind } from '@/lib/taxonomy/canonical-items';
import { chooseQuantity, nameMatchesItem, sizeCandidates } from './kroger';
import { AdapterError, type Adapter, type CaptureCandidate, type CrawlResult, type SourceRow, type StructuredDeal } from './types';

/**
 * Flipp aggregates the printed weekly ads of most grocery chains (Hy-Vee, Aldi, Woodman's, Meijer,
 * Target, Festival, Metcalfe's…). One source per chain: external_id = Flipp merchant id, handle =
 * merchant name, url = postal code. Items carry product photos and are fanned out to every store
 * of the chain by the extract handler (chain_key).
 */
export const FLIPP_MERCHANTS: Record<string, { chainKey: string; label: string }> = {
  "woodman's food market": { chainKey: 'woodmans', label: "Woodman's" },
  'hy-vee': { chainKey: 'hyvee', label: 'Hy-Vee' },
  aldi: { chainKey: 'aldi', label: 'ALDI' },
  target: { chainKey: 'target', label: 'Target' },
  walmart: { chainKey: 'walmart', label: 'Walmart' },
  meijer: { chainKey: 'meijer', label: 'Meijer' },
  costco: { chainKey: 'costco', label: 'Costco' },
  "metcalfe's": { chainKey: 'metcalfes', label: "Metcalfe's" },
  'festival foods': { chainKey: 'festival', label: 'Festival Foods' },
  'fresh madison market': { chainKey: 'freshmadison', label: 'Fresh Madison Market' },
  'capitol centre foods': { chainKey: 'capitolcentre', label: 'Capitol Centre Foods' },
  'whole foods market': { chainKey: 'wholefoods', label: 'Whole Foods' },
  "trader joe's": { chainKey: 'traderjoes', label: "Trader Joe's" },
  'dollar general': { chainKey: 'dollargeneral', label: 'Dollar General' },
  'family dollar': { chainKey: 'familydollar', label: 'Family Dollar' },
};

export function normalizeMerchant(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

interface FlippItem {
  id?: number;
  flyer_item_id?: number;
  flyer_id?: number;
  merchant_id?: number;
  merchant_name?: string;
  merchant_logo?: string;
  name?: string;
  current_price?: number | string | null;
  original_price?: number | string | null;
  pre_price_text?: string | null;
  post_price_text?: string | null;
  sale_story?: string | null;
  item_weight?: string | null;
  clean_image_url?: string | null;
  clipping_image_url?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';

export async function flippSearch(postal: string, q: string): Promise<FlippItem[]> {
  const url = `https://backflipp.wishabi.com/flipp/items/search?locale=en-us&postal_code=${encodeURIComponent(postal)}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
  if (res.status === 429 || res.status >= 500) throw new AdapterError(`flipp ${res.status}`, true);
  if (!res.ok) throw new AdapterError(`flipp ${res.status}`, false);
  const json = (await res.json()) as { items?: FlippItem[] };
  return json.items ?? [];
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[^0-9.]/g, '')) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Turn ad text into quantity/unit/deal_type, choosing the package reading that yields a plausible unit price. */
export function interpretFlipp(it: FlippItem, item: CanonicalItem): { dealType: StructuredDeal['deal_type']; price: number | null; quantity: number; unit: UnitKind; conditions: string | null } | null {
  const texts = `${it.pre_price_text ?? ''} ${it.post_price_text ?? ''} ${it.sale_story ?? ''}`.toLowerCase();
  const name = it.name ?? '';
  const price = num(it.current_price);
  const conditions = [it.sale_story, it.pre_price_text, it.post_price_text].map((s) => (s ?? '').trim()).filter(Boolean).join(' · ') || null;
  const nFor = texts.match(/(\d+)\s*(?:for|\/)\s*\$?\s*(\d+(?:\.\d+)?)/) ?? name.toLowerCase().match(/(\d+)\s*for\s*\$(\d+(?:\.\d+)?)/);

  if (/buy\s*(one|1)[^a-z]*get\s*(one|1)\s*free|bogo/.test(texts) && price) {
    const c = chooseQuantity(sizeCandidates(it.item_weight ?? name, undefined, name), price, item);
    return c ? { dealType: 'bogo', price, quantity: c.quantity, unit: c.unit, conditions } : null;
  }
  if (nFor) {
    const qty = Number(nFor[1]);
    const total = Number(nFor[2]);
    if (qty > 0 && total > 0) {
      const perOne = total / qty;
      const c = chooseQuantity(sizeCandidates(it.item_weight ?? name, undefined, name), perOne, item);
      if (!c) return null;
      return { dealType: 'bundle', price: total, quantity: c.unit === 'each' ? qty : c.quantity * qty, unit: c.unit, conditions };
    }
  }
  if (!price) return null;
  const perLb = /per\s*lb|\/\s*lb|\blb\b\.?$|pound/.test(texts);
  const candidates = perLb ? [{ quantity: 1, unit: 'lb' as UnitKind }, ...sizeCandidates(it.item_weight ?? name, undefined, name)] : sizeCandidates(it.item_weight ?? name, undefined, name);
  const c = chooseQuantity(candidates, price, item);
  return c ? { dealType: 'fixed_price', price, quantity: c.quantity, unit: c.unit, conditions } : null;
}

export const flippAdapter: Adapter = {
  type: 'flipp',
  async crawl(source: SourceRow, business: BusinessRow): Promise<CrawlResult> {
    const merchantId = source.external_id;
    const postal = source.url ?? business.postal_code ?? '53703';
    if (!merchantId) throw new AdapterError('flipp source needs external_id = merchant id', false);
    const items = CANONICAL_ITEMS.filter((i) => i.businessCategory === 'grocery');
    const seen = new Set<string>();
    const candidates: CaptureCandidate[] = [];
    let merchantLogo: string | null = null;
    for (const item of items) {
      const results = await flippSearch(postal, item.aliases[0] ?? item.displayName.toLowerCase());
      for (const it of results) {
        if (String(it.merchant_id) !== String(merchantId)) continue;
        if (!it.name || !nameMatchesItem(it.name, item)) continue;
        const key = String(it.flyer_item_id ?? it.id ?? `${it.name}|${it.current_price}`);
        if (seen.has(key)) continue;
        seen.add(key);
        merchantLogo ??= it.merchant_logo ?? null;
        const parsed = interpretFlipp(it, item);
        if (!parsed) continue;
        const structured: StructuredDeal = {
          title: it.name.slice(0, 120),
          item_name: it.name.slice(0, 80),
          canonical_item_slug: item.slug,
          deal_type: parsed.dealType,
          price: parsed.price,
          regular_price: num(it.original_price),
          percent_off: null,
          quantity: parsed.quantity,
          unit: parsed.unit,
          conditions: parsed.conditions ? `${parsed.conditions} · Weekly ad` : 'Weekly ad price',
          starts_at: it.valid_from ? it.valid_from.slice(0, 10) : null,
          ends_at: it.valid_to ? it.valid_to.slice(0, 10) : null,
          days_of_week: null,
          time_window: null,
          evidence_quote: `${it.name} ${it.pre_price_text ?? ''} ${it.current_price ?? ''} ${it.post_price_text ?? ''} ${it.sale_story ?? ''}`.replace(/\s+/g, ' ').trim(),
          confidence: 0.95,
          image_url: it.clean_image_url ?? it.clipping_image_url ?? null,
        };
        candidates.push({
          external_id: key,
          content_text: `${it.name} — ${it.pre_price_text ?? ''} $${it.current_price ?? ''} ${it.post_price_text ?? ''} ${it.sale_story ?? ''} (${it.merchant_name}, valid ${it.valid_from?.slice(0, 10)} to ${it.valid_to?.slice(0, 10)})`.replace(/\s+/g, ' '),
          image_urls: it.clean_image_url ? [it.clean_image_url] : [],
          posted_at: it.valid_from ?? null,
          payload: { flyer_id: it.flyer_id, merchant_id: it.merchant_id, merchant: it.merchant_name, merchant_logo: it.merchant_logo, postal, chain_fanout: true },
          structured,
        });
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    return { candidates, note: `${items.length} searches, ${candidates.length} ad items${merchantLogo ? ' (logo available)' : ''}` };
  },
};
