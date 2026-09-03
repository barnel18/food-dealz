import type { BusinessCategory } from './canonical-items';

export interface CategoryMeta {
  label: string;
  emoji: string;
  businessCategory: BusinessCategory;
  order: number;
}

/** Display metadata for `CanonicalItem.category` values. */
export const CATEGORY_META: Record<string, CategoryMeta> = {
  pizza: { label: 'Pizza', emoji: '\u{1F355}', businessCategory: 'restaurant', order: 1 },
  burgers: { label: 'Burgers', emoji: '\u{1F354}', businessCategory: 'restaurant', order: 2 },
  chicken: { label: 'Chicken & wings', emoji: '\u{1F357}', businessCategory: 'restaurant', order: 3 },
  tacos: { label: 'Tacos & burritos', emoji: '\u{1F32E}', businessCategory: 'restaurant', order: 4 },
  sandwiches: { label: 'Sandwiches & brats', emoji: '\u{1F96A}', businessCategory: 'restaurant', order: 5 },
  entrees: { label: 'Entrées & fish fry', emoji: '\u{1F37D}️', businessCategory: 'restaurant', order: 6 },
  appetizers: { label: 'Apps & curds', emoji: '\u{1F9C0}', businessCategory: 'restaurant', order: 7 },
  specials: { label: 'Specials & family', emoji: '⭐', businessCategory: 'restaurant', order: 8 },
  breakfast: { label: 'Breakfast', emoji: '\u{1F373}', businessCategory: 'restaurant', order: 9 },
  desserts: { label: 'Desserts', emoji: '\u{1F366}', businessCategory: 'restaurant', order: 10 },
  drinks: { label: 'Drinks', emoji: '\u{1F37A}', businessCategory: 'restaurant', order: 11 },
  meat: { label: 'Meat', emoji: '\u{1F969}', businessCategory: 'grocery', order: 20 },
  seafood: { label: 'Seafood', emoji: '\u{1F41F}', businessCategory: 'grocery', order: 21 },
  dairy_eggs: { label: 'Dairy & eggs', emoji: '\u{1F95A}', businessCategory: 'grocery', order: 22 },
  produce: { label: 'Produce', emoji: '\u{1F96C}', businessCategory: 'grocery', order: 23 },
  pantry: { label: 'Pantry', emoji: '\u{1F96B}', businessCategory: 'grocery', order: 24 },
  snacks: { label: 'Snacks', emoji: '\u{1F37F}', businessCategory: 'grocery', order: 25 },
  prepared: { label: 'Prepared foods', emoji: '\u{1F357}', businessCategory: 'grocery', order: 26 },
  beverages: { label: 'Beverages', emoji: '\u{1F964}', businessCategory: 'grocery', order: 27 },
};

export function categoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? { label: category, emoji: '\u{1F37D}️', businessCategory: 'restaurant', order: 99 };
}

export function emojiForSlug(slug: string | null, itemCategory?: string): string {
  if (itemCategory) return categoryMeta(itemCategory).emoji;
  return slug ? '\u{1F37D}️' : '\u{1F3F7}️';
}
