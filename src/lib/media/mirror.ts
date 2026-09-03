/**
 * Mirror third-party images into our public `media` Storage bucket.
 * Instagram returns signed CDN links that expire, so deal photos taken from a post rot unless we keep a copy.
 * Objects live at captures/<capture_id>.<ext>; bytes stay in memory and are capped at 4 MB (same as the Claude image fetch).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const MEDIA_BUCKET = 'media';
const MAX_BYTES = 4 * 1024 * 1024;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';

type MediaType = 'image/jpeg' | 'image/png' | 'image/webp';
type MediaExt = 'jpg' | 'png' | 'webp';
const EXT: Record<MediaType, MediaExt> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export interface DownloadedImage { bytes: Buffer; contentType: MediaType; ext: MediaExt }

/** Download an image (jpeg/png/webp, ≤ 4 MB). Null when unavailable, too large, or not a supported type. */
export async function downloadImage(url: string): Promise<DownloadedImage | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*' }, signal: AbortSignal.timeout(15_000), redirect: 'follow' });
    if (!res.ok) return null;
    const declared = Number(res.headers.get('content-length') ?? '0');
    if (declared > MAX_BYTES) return null;
    const ct = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const contentType: MediaType | null =
      ct === 'image/jpeg' || ct === 'image/png' || ct === 'image/webp' ? ct : ct === 'image/jpg' || /\.(jpe?g)(\?|$)/i.test(url) ? 'image/jpeg' : null;
    if (!contentType) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return null;
    return { bytes, contentType, ext: EXT[contentType] };
  } catch {
    return null;
  }
}

export function capturePath(captureId: string, ext: MediaExt): string {
  return `captures/${captureId}.${ext}`;
}

/** Upload a capture image into `media` (idempotent per capture) and return its public URL. Throws on storage errors. */
export async function uploadCaptureImage(db: SupabaseClient, captureId: string, img: DownloadedImage): Promise<string> {
  const path = capturePath(captureId, img.ext);
  // Content never changes for a given capture id, so let CDNs and browsers cache it for a year.
  const { error } = await db.storage.from(MEDIA_BUCKET).upload(path, img.bytes, { contentType: img.contentType, upsert: true, cacheControl: '31536000' });
  if (error) throw new Error(`upload ${path}: ${error.message}`);
  return db.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export type MirrorResult = { ok: true; url: string } | { ok: false; reason: string };

/** Download + upload in one step. Never throws: callers decide how to log and fall back. */
export async function mirrorCaptureImage(db: SupabaseClient, captureId: string, url: string): Promise<MirrorResult> {
  try {
    const img = await downloadImage(url);
    if (!img) return { ok: false, reason: 'download failed (unreachable, unsupported type, or over 4 MB)' };
    return { ok: true, url: await uploadCaptureImage(db, captureId, img) };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
