/**
 * Chains whose deals come from ONE official offers page and apply to every Madison location.
 * `pnpm chains:sync` stamps `chain_key` on the brand's businesses, attaches the page as a fan-out website source
 * to one store, and queues the crawl; the worker then copies each extracted deal to every sibling store.
 *
 * Only pages that actually show priced offers in plain HTML belong here (verified with Firecrawl on 2026-09-03).
 * Not here on purpose (app-only / store-picker gated / unpriced): Subway, Starbucks, Culver's, Milio's, Noodles,
 * Qdoba, Arby's, Chipotle, Jersey Mike's, Burger King, Papa John's, Panera, Mooyah, Cousins, Wingstop, Auntie Anne's,
 * Speedway, Tropical Smoothie, Erbert & Gerbert's. Re-check them when they change their sites.
 * `brandMatch` is matched case-insensitively against businesses.brand (or a name prefix when brand is empty).
 */
export interface ChainSource {
  key: string;
  brandMatch: string[];
  url: string;
  /** Hours between crawls. Chain pages change weekly at most; keep Firecrawl credits in mind. */
  intervalHours?: number;
  notes?: string;
}

export const CHAIN_SOURCES: ChainSource[] = [
  { key: 'kwik-trip', brandMatch: ["Kwik Trip"], url: 'https://www.kwiktrip.com/savings/daily-deals', notes: 'dated daily deals calendar (e.g. $2.29 fish sandwich Fridays)' },
  { key: 'kwik-trip', brandMatch: ["Kwik Trip"], url: 'https://www.kwiktrip.com/savings/special-promos', notes: 'special promos' },
  { key: 'toppers', brandMatch: ["Toppers Pizza", 'Toppers'], url: 'https://toppers.com/deals/', notes: '22 priced bundles, no store needed' },
  { key: 'rocky-rococo', brandMatch: ['Rocky Rococo'], url: 'https://rockyrococo.com/deals/', notes: 'family meal deals' },
  { key: 'mcdonalds', brandMatch: ["McDonald's"], url: 'https://www.mcdonalds.com/us/en-us/deals.html', notes: 'McValue tiers; app-only items excluded by the gate' },
  { key: 'wendys', brandMatch: ["Wendy's"], url: 'https://www.wendys.com/mealdeals', notes: '$4/$6/$8 Biggie deals' },
  { key: 'taco-bell', brandMatch: ['Taco Bell'], url: 'https://www.tacobell.com/food/boxes-and-combos', notes: 'default national prices' },
  { key: 'dominos', brandMatch: ["Domino's", "Domino's Pizza"], url: 'https://www.dominos.com/en/deals', notes: 'national deals; prices may be higher locally' },
  { key: 'pizza-hut', brandMatch: ['Pizza Hut'], url: 'https://www.pizzahut.com/deals', notes: 'national tiles' },
  { key: 'little-caesars', brandMatch: ['Little Caesars'], url: 'https://littlecaesars.com/en-us/deals/', notes: 'national promo codes' },
  { key: 'papa-murphys', brandMatch: ["Papa Murphy's"], url: 'https://www.papamurphys.com/pizza-deals/', notes: '$6.99 mix and match' },
  { key: 'popeyes', brandMatch: ['Popeyes', "Popeyes Louisiana Kitchen"], url: 'https://www.popeyes.com/offers', notes: 'national from-prices' },
  { key: 'kfc', brandMatch: ['KFC'], url: 'https://www.kfc.com/menu/deals', notes: 'hero deal only' },
  { key: 'jimmy-johns', brandMatch: ["Jimmy John's"], url: 'https://www.jimmyjohns.com/promos', notes: 'single LTO' },
  { key: 'firehouse-subs', brandMatch: ['Firehouse Subs'], url: 'https://www.firehousesubs.com/offer-terms', notes: 'dated offers on the terms page; expired ones are swept' },
  { key: 'dunkin', brandMatch: ["Dunkin'", 'Dunkin', "Dunkin' Donuts"], url: 'https://www.dunkindonuts.com/', notes: '$6 meal deal tile' },
  { key: 'dairy-queen', brandMatch: ['Dairy Queen', 'DQ Grill & Chill'], url: 'https://www.dairyqueen.com/en-us/menu/food/meal-deals/', notes: '$7 meal deal' },
  { key: 'dairy-queen', brandMatch: ['Dairy Queen', 'DQ Grill & Chill'], url: 'https://www.dairyqueen.com/en-us/menu/food/2-for-5/', notes: '2 for $5' },
  { key: 'dennys', brandMatch: ["Denny's"], url: 'https://dennys.com/meal-deals', notes: 'starting-at prices' },
  { key: 'chilis', brandMatch: ["Chili's", "Chili's Grill & Bar"], url: 'https://www.chilis.com/3-for-me', notes: '3 for Me from $10.99' },
  { key: 'applebees', brandMatch: ["Applebee's", "Applebee's Grill + Bar"], url: 'https://www.applebees.com/en/specials/burgers', notes: 'burger specials sub-page' },
  { key: 'sonic', brandMatch: ['Sonic', 'Sonic Drive-In'], url: 'https://www.sonicdrivein.com/menu/categories/combos/7-big-deal-meal/', notes: '$7 Big Deal Meal' },
  { key: 'buffalo-wild-wings', brandMatch: ['Buffalo Wild Wings'], url: 'https://www.buffalowildwings.com/promos/', notes: 'BOGO wing Tuesdays / boneless Thursdays (no prices, still deals)' },
];
