import { taxonomyPromptBlock, type BusinessCategory } from '@/lib/taxonomy/canonical-items';

/** Bump when the rules change; part of the cached prefix. */
export const PROMPT_VERSION = '2026-09-03.2';

const RULES = `You extract food deals from a single social post, web page, or product listing into structured JSON.

A "deal" is a specific food or drink item with an explicit price, discount, or free-item offer a customer can get.
Do not extract: menus with no promotional framing (unless the business is a grocery store listing sale prices),
events without prices, vague marketing ("great prices!"), gift cards, merchandise, or prices you cannot see verbatim in the source.

Rules:
1. Never invent or estimate a price. Every price you output must appear verbatim in the source text or image. Copy the
   surrounding phrase into evidence_quote.
2. One deal per distinct item + price. "2 large pizzas for $20" is one deal: canonical pizza_large, quantity 2, price 20.
   A menu with many items at regular prices is not a list of deals.
3. Map item_name to the closest canonical_item_slug from the list below, or null if nothing fits. Prefer null over a wrong slug.
4. Grocery prices: quantity and unit describe the priced amount. "$2.99/lb" -> quantity 1, unit lb. "10 for $10" -> quantity 10,
   unit each, price 10, deal_type bundle. "16 oz for $3" -> quantity 16, unit oz. "18 ct eggs $3.49" -> quantity 1.5, unit dozen.
5. deal_type: fixed_price (a stated price), bundle (N for $X of the same item), percent_off, amount_off (price = the dollars off),
   bogo (buy one get one; price = what you pay for the first), free_item (free with purchase).
6. Dates: resolve relative phrases ("this weekend", "through Sunday", "today only") against CAPTURE_DATE in the user message.
   Output YYYY-MM-DD. Recurring offers ("Taco Tuesday", "every Friday", "fish fry Fridays") -> days_of_week (0=Sunday..6=Saturday)
   with ends_at null. If no end date is stated, ends_at null. time_window is free text like "3-6pm" or "until 11am".
7. regular_price only when the source states the normal price. percent_off only for percent_off deals.
8. confidence: 0.9+ when price, item, and validity are explicit; 0.6-0.8 when one of those is inferred; below 0.6 when the
   post is ambiguous or the price might belong to a different item.
9. Single-serving slugs stay single-serving: beer_pint is one glass or pint; pitchers use beer_pitcher; growlers, crowlers and
   packs to go use beer_to_go. A "10 or more" or catering price is still one deal, with the minimum in conditions.
10. If there are no deals, return an empty deals array and a short no_deal_reason.`;

const cache = new Map<BusinessCategory, string>();

export function buildSystemPrompt(category: BusinessCategory): string {
  const hit = cache.get(category);
  if (hit) return hit;
  const prompt = `${RULES}\n\nCanonical items for this ${category} (slug: name [comparable unit]):\n${taxonomyPromptBlock(category)}\n\n(prompt ${PROMPT_VERSION})`;
  cache.set(category, prompt);
  return prompt;
}

export interface UserMessageInput {
  businessName: string;
  category: BusinessCategory;
  sourceType: string;
  sourceUrl: string | null;
  captureDate: string;
  postedAt: string | null;
  text: string;
  /** Extra framing for special page kinds (e.g. a chain's national offers page). */
  pageHint?: string | null;
}

export function buildUserMessage(i: UserMessageInput): string {
  return [
    `BUSINESS: ${i.businessName} (${i.category})`,
    `SOURCE: ${i.sourceType}${i.sourceUrl ? ` ${i.sourceUrl}` : ''}`,
    `CAPTURE_DATE: ${i.captureDate}`,
    i.postedAt ? `POSTED_AT: ${i.postedAt}` : null,
    i.pageHint ? `PAGE: ${i.pageHint}` : null,
    '---',
    i.text.trim() || '(no text; see attached image)',
  ]
    .filter((l): l is string => l !== null)
    .join('\n');
}
