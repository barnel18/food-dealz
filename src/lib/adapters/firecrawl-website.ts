import { AdapterError, requireEnv, type Adapter, type CrawlResult, type SourceRow } from './types';

const MAX_MARKDOWN = 40_000;

interface ScrapeResponse {
  success: boolean;
  error?: string;
  data?: {
    markdown?: string;
    metadata?: { title?: string | string[]; sourceURL?: string; url?: string; statusCode?: number };
    changeTracking?: { previousScrapeAt?: string | null; changeStatus?: 'new' | 'same' | 'changed' | 'removed'; visibility?: string };
  };
}

/** Restaurant/grocery web pages via Firecrawl v2 scrape (markdown + change tracking). */
export const firecrawlWebsiteAdapter: Adapter = {
  type: 'website',
  async crawl(source: SourceRow): Promise<CrawlResult> {
    const url = source.url;
    if (!url) throw new AdapterError('website source has no url', false);
    const key = requireEnv('FIRECRAWL_API_KEY');

    const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        formats: ['markdown', { type: 'changeTracking', modes: [] }],
        onlyMainContent: true,
        timeout: 60_000,
      }),
    });
    if (res.status === 429 || res.status >= 500) throw new AdapterError(`firecrawl ${res.status}`, true);
    const json = (await res.json().catch(() => null)) as ScrapeResponse | null;
    if (!res.ok || !json?.success || !json.data) {
      throw new AdapterError(`firecrawl failed: ${json?.error ?? res.status}`, false);
    }
    const status = json.data.changeTracking?.changeStatus;
    if (status === 'same') return { candidates: [], unchanged: true, note: 'unchanged since last scrape' };
    if (status === 'removed' || (json.data.metadata?.statusCode ?? 200) >= 400) {
      throw new AdapterError(`page unavailable (${json.data.metadata?.statusCode ?? status})`, false);
    }
    const markdown = (json.data.markdown ?? '').trim();
    if (!markdown) return { candidates: [], note: 'empty page' };
    const title = Array.isArray(json.data.metadata?.title) ? json.data.metadata?.title[0] : json.data.metadata?.title;
    return {
      candidates: [
        {
          external_id: url,
          content_text: markdown.slice(0, MAX_MARKDOWN),
          image_urls: [],
          posted_at: null,
          payload: { source_url: url, title: title ?? null, change_status: status ?? null, scraped_at: new Date().toISOString() },
        },
      ],
    };
  },
};
