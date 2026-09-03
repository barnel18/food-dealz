/** Fuzzy venue-name matching shared by discovery and enrichment scripts. */
const STOP = new Set(['the', 'and', 'bar', 'grill', 'restaurant', 'cafe', 'madison', 'wisconsin', 'llc', 'inc', 'co', 'company', 'shop', 'kitchen', 'lounge', 'pub', 'market', 'food', 'hall', 'wi', 'of', 'on', 'at']);

export const nameTokens = (s: string): Set<string> =>
  new Set(s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t)));

/** True when the distinctive words of two venue names mostly overlap ("Ático Lounge - Madison" ↔ "Ático Lounge"). */
export function namesMatch(a: string, b: string): boolean {
  const A = nameTokens(a), B = nameTokens(b);
  if (!A.size || !B.size) return false;
  let hit = 0;
  for (const t of A) if (B.has(t)) hit++;
  return hit / Math.min(A.size, B.size) >= 0.5;
}
