/**
 * Chains whose deals come from ONE official offers page and apply to every Madison location.
 * `pnpm chains:sync` stamps `chain_key` on the brand's businesses, attaches the page as a fan-out website source
 * to one store, and queues the crawl; the worker then copies each extracted deal to every sibling store.
 *
 * Only pages that actually show priced offers in plain HTML belong here (verified with Firecrawl before adding).
 * `brandMatch` is matched case-insensitively against businesses.brand and businesses.name.
 */
export interface ChainSource {
  key: string;
  brandMatch: string[];
  url: string;
  /** Hours between crawls. Chain pages change weekly at most; keep Firecrawl credits in mind. */
  intervalHours?: number;
  notes?: string;
}

export const CHAIN_SOURCES: ChainSource[] = [
  // Filled from the verified research list; see plan file "chain deals" entry.
];
