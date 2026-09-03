/**
 * Find a real logo for a business and store it in the public `logos` bucket.
 * Order: Instagram profile picture (when a crawl provides it) → the site's apple-touch-icon /
 * largest <link rel=icon> → Google's favicon service (only if it returns a real icon) → none.
 * og:image is kept separately as a photo for business pages.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
const MAX_BYTES = 3 * 1024 * 1024;
const MIN_LOGO_BYTES = 1200; // below this it's a 16px favicon or a placeholder

export interface SiteImages { touchIcon: string | null; icon: string | null; ogImage: string | null }

function abs(base: string, href: string): string | null {
  try { return new URL(href, base).toString(); } catch { return null; }
}

/** Parse icon and og:image links out of a homepage without any headless browser. */
export async function fetchSiteImages(siteUrl: string): Promise<SiteImages> {
  const out: SiteImages = { touchIcon: null, icon: null, ogImage: null };
  let html = '';
  let finalUrl = siteUrl;
  try {
    const res = await fetch(siteUrl, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(15_000), redirect: 'follow' });
    if (!res.ok) return out;
    finalUrl = res.url || siteUrl;
    html = (await res.text()).slice(0, 600_000);
  } catch {
    return out;
  }
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1] ?? null;
  let bestIcon: { href: string; size: number } | null = null;
  for (const tag of links) {
    const rel = (attr(tag, 'rel') ?? '').toLowerCase();
    const href = attr(tag, 'href');
    if (!href) continue;
    if (rel.includes('apple-touch-icon')) {
      const size = Number((attr(tag, 'sizes') ?? '180').split('x')[0]) || 180;
      if (!out.touchIcon || size >= 180) out.touchIcon = abs(finalUrl, href);
    } else if (rel.includes('icon')) {
      const size = Number((attr(tag, 'sizes') ?? '0').split('x')[0]) || (href.endsWith('.svg') ? 256 : 32);
      if (!bestIcon || size > bestIcon.size) bestIcon = { href: abs(finalUrl, href) ?? href, size };
    }
  }
  if (bestIcon && bestIcon.size >= 96) out.icon = bestIcon.href;
  const og = html.match(/<meta\b[^>]*property\s*=\s*["']og:image["'][^>]*>/i)?.[0];
  const ogHref = og ? attr(og, 'content') : null;
  if (ogHref) out.ogImage = abs(finalUrl, ogHref);
  return out;
}

export interface FetchedImage { bytes: Buffer; contentType: string; ext: string }

export async function downloadImage(url: string, minBytes = 1): Promise<FetchedImage | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*' }, signal: AbortSignal.timeout(15_000), redirect: 'follow' });
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength < minBytes || bytes.byteLength > MAX_BYTES) return null;
    const ext = ct.includes('png') ? 'png' : ct.includes('svg') ? 'svg' : ct.includes('webp') ? 'webp' : ct.includes('gif') ? 'gif' : ct.includes('icon') ? 'ico' : ct.includes('jpeg') || ct.includes('jpg') ? 'jpg' : null;
    if (!ext) return null;
    return { bytes, contentType: ct, ext };
  } catch {
    return null;
  }
}

function googleFavicon(siteUrl: string): string {
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(siteUrl)}&size=128`;
}

export async function uploadToLogos(db: SupabaseClient, path: string, img: FetchedImage): Promise<string> {
  const { error } = await db.storage.from('logos').upload(path, img.bytes, { contentType: img.contentType, upsert: true, cacheControl: '604800' });
  if (error) throw new Error(`upload ${path}: ${error.message}`);
  return db.storage.from('logos').getPublicUrl(path).data.publicUrl;
}

export interface LogoResult { logoUrl: string | null; photoUrl: string | null; source: string }

/** Resolve + store logo (and photo) for a business. `instagramPicUrl` wins when supplied. */
export async function resolveAndStoreLogo(
  db: SupabaseClient,
  business: { id: string; website_url: string | null },
  hints: { instagramPicUrl?: string | null } = {},
): Promise<LogoResult> {
  const candidates: Array<{ url: string; source: string; minBytes: number }> = [];
  if (hints.instagramPicUrl) candidates.push({ url: hints.instagramPicUrl, source: 'instagram', minBytes: 1 });
  let ogImage: string | null = null;
  if (business.website_url) {
    const imgs = await fetchSiteImages(business.website_url);
    ogImage = imgs.ogImage;
    if (imgs.touchIcon) candidates.push({ url: imgs.touchIcon, source: 'apple-touch-icon', minBytes: 1 });
    if (imgs.icon) candidates.push({ url: imgs.icon, source: 'site-icon', minBytes: 1 });
    candidates.push({ url: googleFavicon(business.website_url), source: 'google-favicon', minBytes: MIN_LOGO_BYTES });
  }
  let logoUrl: string | null = null;
  let source = 'none';
  for (const c of candidates) {
    const img = await downloadImage(c.url, c.minBytes);
    if (!img) continue;
    logoUrl = await uploadToLogos(db, `businesses/${business.id}/logo.${img.ext}`, img);
    source = c.source;
    break;
  }
  let photoUrl: string | null = null;
  if (ogImage) {
    const img = await downloadImage(ogImage, 5000);
    if (img && img.ext !== 'svg' && img.ext !== 'ico') photoUrl = await uploadToLogos(db, `businesses/${business.id}/photo.${img.ext}`, img);
  }
  await db.from('businesses').update({ ...(logoUrl ? { logo_url: logoUrl } : {}), ...(photoUrl ? { photo_url: photoUrl } : {}) }).eq('id', business.id);
  return { logoUrl, photoUrl, source };
}
