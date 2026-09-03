import type { BusinessRow, DealType, SourceType } from '@/lib/deals/types';
import type { UnitKind } from '@/lib/taxonomy/canonical-items';

export interface SourceRow {
  id: string;
  business_id: string;
  type: SourceType;
  url: string | null;
  handle: string | null;
  external_id: string | null;
  crawl_interval_hours: number;
  last_crawled_at: string | null;
  last_changed_at: string | null;
  consecutive_failures: number;
  is_active: boolean;
  notes: string | null;
  /** Deals from this source are copied to every active business with the same chain_key (chain offers pages). */
  fan_out?: boolean;
}

/** A deal the adapter already understands (no LLM needed), e.g. from a retailer price API. */
export interface StructuredDeal {
  title: string;
  item_name: string;
  canonical_item_slug: string | null;
  deal_type: DealType;
  price: number | null;
  regular_price: number | null;
  percent_off: number | null;
  quantity: number;
  unit: UnitKind;
  conditions: string | null;
  starts_at: string | null;
  ends_at: string | null;
  days_of_week: number[] | null;
  time_window: string | null;
  evidence_quote: string;
  confidence: number;
  image_url?: string | null;
}

export interface CaptureCandidate {
  /** Stable id at the source (post shortcode, product id, page URL). */
  external_id: string | null;
  content_text: string;
  image_urls: string[];
  posted_at: string | null;
  payload: Record<string, unknown>;
  structured?: StructuredDeal;
}

export interface CrawlResult {
  candidates: CaptureCandidate[];
  /** True when the source reported no change since the last crawl (nothing to extract). */
  unchanged?: boolean;
  note?: string;
}

export interface Adapter {
  type: SourceType;
  crawl(source: SourceRow, business: BusinessRow): Promise<CrawlResult>;
}

export type AdapterErrorKind = 'other' | 'quota';

export class AdapterError extends Error {
  /** `quota`: the provider is refusing for billing/usage reasons — not the source's fault, so it must not count toward auto-disable. */
  constructor(message: string, readonly retryable: boolean, readonly kind: AdapterErrorKind = 'other') {
    super(message);
    this.name = 'AdapterError';
  }
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new AdapterError(`${name} is not set`, false);
  return v;
}
