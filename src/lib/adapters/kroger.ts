import type { BusinessRow } from '@/lib/deals/types';
import { CANONICAL_ITEMS, type CanonicalItem, type UnitKind } from '@/lib/taxonomy/canonical-items';
import { AdapterError, requireEnv, type Adapter, type CaptureCandidate, type CrawlResult, type SourceRow, type StructuredDeal } from './types';

/**
 * Kroger Public API (covers Pick 'n Save / Metro Market). Prices are structured, so captures
 * carry a `structured` deal and skip the LLM. Only promo prices become deals.
 */
interface KrogerItem {
  itemId?: string;
  size?: string;
  soldBy?: string;
  price?: { regular?: number; promo?: number };
  fulfillment?: { inStore?: boolean };
}
interface KrogerProduct {
  productId?: string;
  upc?: string;
  description?: string;
  brand?: string;
  categories?: string[];
  items?: KrogerItem[];
  images?: Array<{ perspective?: string; featured?: boolean; sizes?: Array<{ size?: string; url?: string }> }>;
}

function productImage(p: KrogerProduct): string | null {
  const imgs = p.images ?? [];
  const front = imgs.find((i) => i.perspective === 'front') ?? imgs.find((i) => i.featured) ?? imgs[0];
  const sizes = front?.sizes ?? [];
  return sizes.find((s) => s.size === 'medium')?.url ?? sizes.find((s) => s.size === 'large')?.url ?? sizes[0]?.url ?? null;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const id = requireEnv('KROGER_CLIENT_ID');
  const secret = requireEnv('KROGER_CLIENT_SECRET');
  const res = await fetch('https://api.kroger.com/v1/connect/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=product.compact',
  });
  if (!res.ok) throw new AdapterError(`kroger auth failed: ${res.status}`, res.status >= 500);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

const UNIT_RE = /(\d+(?:\.\d+)?)\s*(fl\s*oz|fluid ounces?|ounces?|oz|pounds?|lbs?|gal(?:lon)?s?|qt|quarts?|pt|pints?|ml|liters?|l\b|kg|g\b|ct|count|pk|pack|each|ea|dozen|doz)/;

function toUnit(n: number, u: string): { quantity: number; unit: UnitKind } {
  if (u.startsWith('fl')) return { quantity: n, unit: 'fl_oz' };
  if (u === 'oz' || u.startsWith('ounce')) return { quantity: n, unit: 'oz' };
  if (u.startsWith('lb') || u.startsWith('pound')) return { quantity: n, unit: 'lb' };
  if (u.startsWith('gal')) return { quantity: n, unit: 'gallon' };
  if (u === 'qt' || u.startsWith('quart')) return { quantity: n * 32, unit: 'fl_oz' };
  if (u === 'pt' || u.startsWith('pint')) return { quantity: n * 16, unit: 'fl_oz' };
  if (u === 'ml') return { quantity: n / 1000, unit: 'liter' };
  if (u === 'l' || u.startsWith('liter')) return { quantity: n, unit: 'liter' };
  if (u === 'kg') return { quantity: n, unit: 'kg' };
  if (u === 'g') return { quantity: n, unit: 'g' };
  if (u === 'ct' || u === 'count' || u === 'each' || u === 'ea') return { quantity: n, unit: 'each' };
  if (u.startsWith('doz')) return { quantity: n, unit: 'dozen' };
  return { quantity: n, unit: 'pack' };
}

/**
 * Kroger sizes: "16 oz", "1 lb", "12 ct", "64 fl oz", "3 ct / 1 lb", "8 ct / 30.4 ounce".
 * For "N ct / X unit" the second part is the total unless the description states a bigger
 * total (e.g. "Ground Beef Packs 3 LB" with size "3 ct / 1 lb" → 3 lb).
 */
export function parseKrogerSize(size: string | undefined, soldBy: string | undefined, description = ''): { quantity: number; unit: UnitKind } {
  const s = (size ?? '').toLowerCase().trim();
  if (soldBy?.toUpperCase() === 'WEIGHT' && !/\d/.test(s)) return { quantity: 1, unit: 'lb' };
  const parts = s.split('/').map((x) => x.trim());
  const parsed = parts.map((x) => x.match(UNIT_RE)).filter((m): m is RegExpMatchArray => m !== null).map((m) => toUnit(Number(m[1]), m[2].replace(/\s+/g, ' ')));
  const measured = parsed.find((x) => x.unit !== 'each' && x.unit !== 'pack');
  const counted = parsed.find((x) => x.unit === 'each');
  const desc = description.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(lb|lbs|pound|pounds|oz|ounce|ounces)\b/);
  if (desc && measured) {
    const d = toUnit(Number(desc[1]), desc[2]);
    if (d.unit === measured.unit && d.quantity > measured.quantity) return d;
  }
  if (measured) return measured;
  if (counted) return counted;
  return { quantity: 1, unit: 'each' };
}

function searchTerm(item: CanonicalItem): string {
  return item.aliases[0] ?? item.displayName.toLowerCase();
}

function matchesItem(product: KrogerProduct, item: CanonicalItem): boolean {
  const desc = (product.description ?? '').toLowerCase();
  const terms = [item.displayName.toLowerCase(), ...item.aliases];
  return terms.some((t) => t.length >= 4 && desc.includes(t.split(' ')[0]));
}

export const krogerAdapter: Adapter = {
  type: 'kroger_api',
  async crawl(source: SourceRow, business: BusinessRow): Promise<CrawlResult> {
    const locationId = source.external_id;
    if (!locationId) throw new AdapterError('kroger source needs external_id = locationId', false);
    const token = await getToken();
    const items = CANONICAL_ITEMS.filter((i) => i.businessCategory === 'grocery');
    const candidates: CaptureCandidate[] = [];
    let calls = 0;

    for (const item of items) {
      const url = new URL('https://api.kroger.com/v1/products');
      url.searchParams.set('filter.term', searchTerm(item));
      url.searchParams.set('filter.locationId', locationId);
      url.searchParams.set('filter.limit', '12');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      calls++;
      if (res.status === 429) throw new AdapterError('kroger rate limited', true);
      if (!res.ok) continue;
      const json = (await res.json()) as { data?: KrogerProduct[] };
      for (const p of json.data ?? []) {
        const it = p.items?.[0];
        const regular = it?.price?.regular ?? null;
        const promo = it?.price?.promo ?? null;
        if (!it || promo == null || promo <= 0 || regular == null || promo >= regular) continue;
        if (!matchesItem(p, item)) continue;
        const { quantity, unit } = parseKrogerSize(it.size, it.soldBy, p.description ?? '');
        const title = `${p.description ?? item.displayName}${it.size ? ` (${it.size})` : ''}`.slice(0, 120);
        const structured: StructuredDeal = {
          title,
          item_name: (p.description ?? item.displayName).slice(0, 80),
          canonical_item_slug: item.slug,
          deal_type: 'fixed_price',
          price: promo,
          regular_price: regular,
          percent_off: null,
          quantity,
          unit,
          conditions: 'Sale price at this store. Store card may be required.',
          starts_at: null,
          ends_at: null,
          days_of_week: null,
          time_window: null,
          evidence_quote: `${p.description} ${it.size ?? ''} regular ${regular} promo ${promo}`.trim(),
          confidence: 1,
          image_url: productImage(p),
        };
        candidates.push({
          external_id: p.productId ?? p.upc ?? null,
          content_text: `${title} — sale $${promo.toFixed(2)} (regular $${regular.toFixed(2)})`,
          image_urls: [],
          posted_at: null,
          payload: { product_id: p.productId, upc: p.upc, brand: p.brand, categories: p.categories, location_id: locationId, store: business.name },
          structured,
        });
      }
    }
    return { candidates, note: `${calls} product searches, ${candidates.length} promo prices` };
  },
};
