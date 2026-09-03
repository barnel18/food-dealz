/**
 * Google Places `types` → the cuisine / kind-of-place chips people actually browse by (Yelp-style).
 * Order matters: the first match becomes the primary label on tiles.
 */
export interface Cuisine { slug: string; label: string; emoji: string; types: string[] }

export const CUISINES: Cuisine[] = [
  { slug: 'pizza', label: 'Pizza', emoji: '🍕', types: ['pizza_restaurant'] },
  { slug: 'burgers', label: 'Burgers', emoji: '🍔', types: ['hamburger_restaurant'] },
  { slug: 'mexican', label: 'Mexican', emoji: '🌮', types: ['mexican_restaurant', 'taco_restaurant'] },
  { slug: 'chinese', label: 'Chinese', emoji: '🥡', types: ['chinese_restaurant'] },
  { slug: 'thai', label: 'Thai', emoji: '🍜', types: ['thai_restaurant'] },
  { slug: 'japanese', label: 'Japanese & sushi', emoji: '🍣', types: ['japanese_restaurant', 'sushi_restaurant', 'ramen_restaurant'] },
  { slug: 'korean', label: 'Korean', emoji: '🍲', types: ['korean_restaurant'] },
  { slug: 'vietnamese', label: 'Vietnamese', emoji: '🍜', types: ['vietnamese_restaurant'] },
  { slug: 'indian', label: 'Indian', emoji: '🍛', types: ['indian_restaurant'] },
  { slug: 'italian', label: 'Italian', emoji: '🍝', types: ['italian_restaurant'] },
  { slug: 'mediterranean', label: 'Mediterranean', emoji: '🥙', types: ['mediterranean_restaurant', 'middle_eastern_restaurant', 'greek_restaurant', 'turkish_restaurant', 'lebanese_restaurant'] },
  { slug: 'american', label: 'American', emoji: '🍽️', types: ['american_restaurant', 'diner', 'family_restaurant'] },
  { slug: 'bbq', label: 'BBQ', emoji: '🍖', types: ['barbecue_restaurant'] },
  { slug: 'steak', label: 'Steak & supper clubs', emoji: '🥩', types: ['steak_house', 'fine_dining_restaurant'] },
  { slug: 'seafood', label: 'Seafood', emoji: '🦞', types: ['seafood_restaurant'] },
  { slug: 'sandwiches', label: 'Sandwiches & subs', emoji: '🥪', types: ['sandwich_shop', 'deli'] },
  { slug: 'breakfast', label: 'Breakfast & brunch', emoji: '🥞', types: ['breakfast_restaurant', 'brunch_restaurant'] },
  { slug: 'vegan', label: 'Vegan & vegetarian', emoji: '🥗', types: ['vegan_restaurant', 'vegetarian_restaurant'] },
  { slug: 'fast-food', label: 'Fast food', emoji: '🍟', types: ['fast_food_restaurant'] },
  { slug: 'wings', label: 'Wings', emoji: '🍗', types: ['chicken_wings_restaurant', 'chicken_restaurant'] },
  { slug: 'bars', label: 'Bars & pubs', emoji: '🍺', types: ['bar', 'pub', 'sports_bar', 'night_club', 'bar_and_grill', 'cocktail_bar', 'karaoke'] },
  { slug: 'breweries', label: 'Breweries', emoji: '🍻', types: ['brewery', 'brewpub'] },
  { slug: 'wine', label: 'Wine bars', emoji: '🍷', types: ['wine_bar'] },
  { slug: 'coffee', label: 'Coffee & cafes', emoji: '☕', types: ['coffee_shop', 'cafe', 'tea_house'] },
  { slug: 'bakery', label: 'Bakeries', emoji: '🥐', types: ['bakery', 'donut_shop', 'bagel_shop'] },
  { slug: 'dessert', label: 'Ice cream & dessert', emoji: '🍦', types: ['ice_cream_shop', 'dessert_shop', 'dessert_restaurant', 'candy_store', 'chocolate_shop'] },
  { slug: 'grocery', label: 'Grocery', emoji: '🛒', types: ['grocery_store', 'supermarket', 'asian_grocery_store', 'wholesaler'] },
  { slug: 'butcher', label: 'Butchers & markets', emoji: '🔪', types: ['butcher_shop', 'fish_store'] },
  { slug: 'convenience', label: 'Convenience', emoji: '🏪', types: ['convenience_store', 'gas_station'] },
  { slug: 'liquor', label: 'Liquor', emoji: '🥃', types: ['liquor_store'] },
];

export const CUISINE_BY_SLUG = new Map(CUISINES.map((c) => [c.slug, c]));
const CUISINE_BY_TYPE = new Map<string, Cuisine>();
for (const c of CUISINES) for (const t of c.types) if (!CUISINE_BY_TYPE.has(t)) CUISINE_BY_TYPE.set(t, c);

/** Generic labels that only mean something when nothing more specific applies. */
const GENERIC = new Set(['american', 'fast-food']);

/** Google `types` (plus `primaryType`) → up to three cuisine slugs, primary first; generic ones only as a fallback. */
export function cuisinesFromTypes(types: string[], primaryType?: string | null): string[] {
  const out: string[] = [];
  const consider = primaryType ? [primaryType, ...types] : types;
  for (const t of consider) {
    const c = CUISINE_BY_TYPE.get(t);
    if (c && !out.includes(c.slug)) out.push(c.slug);
  }
  const specific = out.filter((s) => !GENERIC.has(s));
  const generic = out.filter((s) => GENERIC.has(s));
  // Keep a generic tag when it is the primary type (a burger chain really is "fast food") or when nothing specific matched.
  const primarySlug = primaryType ? CUISINE_BY_TYPE.get(primaryType)?.slug : undefined;
  const keep = specific.length === 0 ? generic : primarySlug && GENERIC.has(primarySlug) ? [primarySlug, ...specific] : specific;
  return Array.from(new Set(keep)).slice(0, 3);
}

export function cuisineLabel(slug: string): string {
  return CUISINE_BY_SLUG.get(slug)?.label ?? slug;
}

/** Chips shown on the directory for a category (restaurant vs grocery). */
export function cuisineChips(category: 'restaurant' | 'grocery' | null): Cuisine[] {
  if (category === 'grocery') return CUISINES.filter((c) => ['grocery', 'butcher', 'convenience', 'liquor', 'bakery'].includes(c.slug));
  if (category === 'restaurant') return CUISINES.filter((c) => !['grocery', 'butcher', 'convenience', 'liquor'].includes(c.slug));
  return CUISINES;
}

export function priceLevelLabel(level: number | null | undefined): string | null {
  if (!level || level < 1) return null;
  return '$'.repeat(Math.min(level, 4));
}
