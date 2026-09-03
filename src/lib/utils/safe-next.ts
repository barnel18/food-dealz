/** Only allow same-origin relative paths for post-action redirects. */
export function safeNext(input: unknown, fallback = '/deals'): string {
  if (typeof input !== 'string') return fallback;
  if (!input.startsWith('/') || input.startsWith('//') || input.includes('\\')) return fallback;
  return input;
}
