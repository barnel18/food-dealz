import { afterEach, describe, expect, it, vi } from 'vitest';
import { capturePath, downloadImage } from './mirror';

function stubFetch(status: number, contentType: string, body: Uint8Array<ArrayBuffer>, extra: Record<string, string> = {}) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status, headers: { 'content-type': contentType, ...extra } })));
}

afterEach(() => vi.unstubAllGlobals());

describe('downloadImage', () => {
  it('maps supported content types to extensions', async () => {
    stubFetch(200, 'image/jpeg; charset=binary', new Uint8Array([1, 2, 3]));
    await expect(downloadImage('https://cdn.example/a')).resolves.toMatchObject({ contentType: 'image/jpeg', ext: 'jpg' });
    stubFetch(200, 'image/png', new Uint8Array([1]));
    await expect(downloadImage('https://cdn.example/a')).resolves.toMatchObject({ ext: 'png' });
    stubFetch(200, 'image/webp', new Uint8Array([1]));
    await expect(downloadImage('https://cdn.example/a')).resolves.toMatchObject({ ext: 'webp' });
  });

  it('treats .jpg URLs without a usable content type as jpeg', async () => {
    stubFetch(200, 'application/octet-stream', new Uint8Array([1]));
    await expect(downloadImage('https://cdn.example/photo.jpg?sig=1')).resolves.toMatchObject({ contentType: 'image/jpeg', ext: 'jpg' });
  });

  it('rejects unsupported types, HTTP errors, empty and oversized bodies', async () => {
    stubFetch(200, 'image/svg+xml', new Uint8Array([1]));
    await expect(downloadImage('https://cdn.example/a')).resolves.toBeNull();
    stubFetch(404, 'image/jpeg', new Uint8Array([1]));
    await expect(downloadImage('https://cdn.example/a')).resolves.toBeNull();
    stubFetch(200, 'image/jpeg', new Uint8Array(0));
    await expect(downloadImage('https://cdn.example/a')).resolves.toBeNull();
    stubFetch(200, 'image/jpeg', new Uint8Array(4 * 1024 * 1024 + 1));
    await expect(downloadImage('https://cdn.example/a')).resolves.toBeNull();
    stubFetch(200, 'image/jpeg', new Uint8Array([1]), { 'content-length': String(10 * 1024 * 1024) });
    await expect(downloadImage('https://cdn.example/a')).resolves.toBeNull();
  });

  it('returns null instead of throwing on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('boom'); }));
    await expect(downloadImage('https://cdn.example/a')).resolves.toBeNull();
  });
});

it('stores captures under captures/<id>.<ext>', () => {
  expect(capturePath('abc', 'jpg')).toBe('captures/abc.jpg');
});
