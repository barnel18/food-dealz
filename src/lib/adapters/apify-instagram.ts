import { runActor } from './apify-client';
import { AdapterError, type Adapter, type CaptureCandidate, type CrawlResult, type SourceRow } from './types';

const ACTOR = 'apify~instagram-profile-scraper';
const FIRST_CRAWL_WINDOW_DAYS = 30;

interface IgPost {
  id?: string;
  shortCode?: string;
  caption?: string;
  displayUrl?: string;
  images?: string[];
  timestamp?: string;
  url?: string;
  type?: string;
  hashtags?: string[];
  locationName?: string;
  isPinned?: boolean;
}
interface IgProfile {
  username?: string;
  fullName?: string;
  biography?: string;
  externalUrl?: string;
  followersCount?: number;
  profilePicUrlHD?: string;
  profilePicUrl?: string;
  private?: boolean;
  latestPosts?: IgPost[];
  error?: string;
}

/** Latest public posts of a business account via Apify's Instagram Profile Scraper (no login). */
export const apifyInstagramAdapter: Adapter = {
  type: 'instagram',
  async crawl(source: SourceRow): Promise<CrawlResult> {
    const handle = (source.handle ?? '').replace(/^@/, '').trim();
    if (!handle) throw new AdapterError('instagram source has no handle', false);
    const items = await runActor<IgProfile>(ACTOR, { usernames: [handle] }, { timeoutSec: 240, memoryMb: 512 });
    const profile = items[0];
    if (!profile) return { candidates: [], note: 'no profile returned' };
    if (profile.error) throw new AdapterError(`instagram: ${profile.error}`, false);
    if (profile.private) throw new AdapterError('instagram account is private', false);

    const since = source.last_crawled_at
      ? new Date(new Date(source.last_crawled_at).getTime() - 2 * 86400_000)
      : new Date(Date.now() - FIRST_CRAWL_WINDOW_DAYS * 86400_000);

    const candidates: CaptureCandidate[] = [];
    for (const p of profile.latestPosts ?? []) {
      const ts = p.timestamp ? new Date(p.timestamp) : null;
      if (ts && ts < since && !p.isPinned) continue;
      const caption = (p.caption ?? '').trim();
      const images = [p.displayUrl, ...(p.images ?? [])].filter((u): u is string => typeof u === 'string' && u.startsWith('http'));
      if (!caption && images.length === 0) continue;
      candidates.push({
        external_id: p.shortCode ?? p.id ?? null,
        content_text: caption,
        image_urls: Array.from(new Set(images)).slice(0, 4),
        posted_at: ts?.toISOString() ?? null,
        payload: {
          source_url: p.url ?? (p.shortCode ? `https://www.instagram.com/p/${p.shortCode}/` : null),
          post_type: p.type ?? null,
          hashtags: p.hashtags ?? [],
          location: p.locationName ?? null,
          profile: { username: profile.username, full_name: profile.fullName, followers: profile.followersCount, website: profile.externalUrl, pic_url: profile.profilePicUrlHD ?? profile.profilePicUrl ?? null },
        },
      });
    }
    return { candidates, note: `${profile.latestPosts?.length ?? 0} posts fetched, ${candidates.length} in window` };
  },
};
