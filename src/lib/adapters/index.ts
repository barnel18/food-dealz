import type { SourceType } from '@/lib/deals/types';
import { apifyInstagramAdapter } from './apify-instagram';
import { firecrawlWebsiteAdapter } from './firecrawl-website';
import { flippAdapter } from './flipp';
import { krogerAdapter } from './kroger';
import type { Adapter } from './types';

const ADAPTERS: Partial<Record<SourceType, Adapter>> = {
  website: firecrawlWebsiteAdapter,
  instagram: apifyInstagramAdapter,
  kroger_api: krogerAdapter,
  flipp: flippAdapter,
};

export function getAdapter(type: SourceType): Adapter | null {
  return ADAPTERS[type] ?? null;
}

export * from './types';
