/**
 * Canonical item taxonomy — the single source of truth.
 *
 * - Seeded into `public.canonical_items` by `scripts/gen-taxonomy-migration.ts`.
 * - Injected as the `canonical_item_slug` enum in the Claude extraction schema.
 * - `comparableUnit` is the unit that `deals.unit_price` is expressed in for that item.
 *
 * After editing, run `pnpm taxonomy:gen` to regenerate the seed migration.
 */

export type UnitKind =
  | 'each' | 'slice' | 'lb' | 'oz' | 'kg' | 'g' | 'dozen' | 'pack' | 'gallon' | 'liter' | 'fl_oz';

export type BusinessCategory = 'restaurant' | 'grocery';

export interface CanonicalItem {
  slug: string;
  displayName: string;
  /** Display grouping, e.g. "pizza", "meat". */
  category: string;
  businessCategory: BusinessCategory;
  comparableUnit: UnitKind;
  /** Lowercase phrases that commonly refer to this item; used for trigram fallback matching. */
  aliases: string[];
  /** Product names containing these words are NOT this item (e.g. "banana nectar" is not bananas). */
  excludes?: string[];
  /** Plausible price per comparableUnit [min, max]; used to pick package readings and quarantine outliers. */
  unitPriceRange?: readonly [number, number];
}

const R = 'restaurant' as const;
const G = 'grocery' as const;

export const CANONICAL_ITEMS: readonly CanonicalItem[] = [
  // ---------------------------------------------------------------- pizza
  { slug: 'pizza_slice', displayName: 'Pizza slice', category: 'pizza', businessCategory: R, comparableUnit: 'slice',
    aliases: ['slice', 'slice of pizza', 'pizza by the slice', 'cheese slice', 'pepperoni slice', 'mac and cheese slice'] },
  { slug: 'pizza_personal', displayName: 'Personal pizza', category: 'pizza', businessCategory: R, comparableUnit: 'each',
    aliases: ['personal pizza', 'small pizza', '10 inch pizza', '10" pizza', 'individual pizza'] },
  { slug: 'pizza_medium', displayName: 'Medium pizza', category: 'pizza', businessCategory: R, comparableUnit: 'each',
    aliases: ['medium pizza', '12 inch pizza', '12" pizza'] },
  { slug: 'pizza_large', displayName: 'Large pizza', category: 'pizza', businessCategory: R, comparableUnit: 'each',
    aliases: ['large pizza', '14 inch pizza', '16 inch pizza', 'xl pizza', 'extra large pizza', 'large one topping'] },

  // -------------------------------------------------------------- burgers
  { slug: 'burger', displayName: 'Burger', category: 'burgers', businessCategory: R, comparableUnit: 'each',
    aliases: ['hamburger', 'cheeseburger', 'smash burger', 'double burger', 'burger night', 'butter burger'] },
  { slug: 'burger_combo', displayName: 'Burger combo', category: 'burgers', businessCategory: R, comparableUnit: 'each',
    aliases: ['burger meal', 'burger combo', 'burger fries and drink', 'burger basket', 'burger and fries'] },

  // -------------------------------------------------------------- chicken
  { slug: 'chicken_sandwich', displayName: 'Chicken sandwich', category: 'chicken', businessCategory: R, comparableUnit: 'each',
    aliases: ['chicken sandwich', 'crispy chicken sandwich', 'spicy chicken sandwich', 'grilled chicken sandwich'] },
  { slug: 'chicken_sandwich_combo', displayName: 'Chicken sandwich combo', category: 'chicken', businessCategory: R, comparableUnit: 'each',
    aliases: ['chicken sandwich meal', 'chicken sandwich combo'] },
  { slug: 'fried_chicken_piece', displayName: 'Fried chicken (per piece)', category: 'chicken', businessCategory: R, comparableUnit: 'each',
    aliases: ['fried chicken', 'chicken tenders', 'tenders', 'chicken strips', 'broasted chicken', '8 piece chicken'] },
  { slug: 'wings', displayName: 'Wings (per wing)', category: 'chicken', businessCategory: R, comparableUnit: 'each',
    aliases: ['wings', 'chicken wings', 'boneless wings', 'wing night', 'wing wednesday', '10 wings', '20 wings'] },

  // ---------------------------------------------------------------- tacos
  { slug: 'taco', displayName: 'Taco', category: 'tacos', businessCategory: R, comparableUnit: 'each',
    aliases: ['tacos', 'street taco', 'taco tuesday', 'dollar tacos', 'fish taco'] },
  { slug: 'taco_plate', displayName: 'Taco plate', category: 'tacos', businessCategory: R, comparableUnit: 'each',
    aliases: ['taco plate', 'taco dinner', 'taco combo', '3 tacos rice and beans'] },
  { slug: 'burrito', displayName: 'Burrito', category: 'tacos', businessCategory: R, comparableUnit: 'each',
    aliases: ['burrito', 'breakfast burrito', 'burrito special'] },
  { slug: 'bowl', displayName: 'Bowl', category: 'entrees', businessCategory: R, comparableUnit: 'each',
    aliases: ['burrito bowl', 'rice bowl', 'poke bowl', 'grain bowl', 'bowl'] },

  // ----------------------------------------------------------- sandwiches
  { slug: 'sandwich', displayName: 'Sandwich', category: 'sandwiches', businessCategory: R, comparableUnit: 'each',
    aliases: ['sandwich', 'deli sandwich', 'panini', 'wrap', 'grilled cheese', 'blt', 'club sandwich'] },
  { slug: 'sub_6in', displayName: '6-inch sub', category: 'sandwiches', businessCategory: R, comparableUnit: 'each',
    aliases: ['6 inch sub', '6" sub', 'half sub', 'six inch'] },
  { slug: 'sub_footlong', displayName: 'Footlong sub', category: 'sandwiches', businessCategory: R, comparableUnit: 'each',
    aliases: ['footlong', 'foot long', '12 inch sub', 'whole sub'] },
  { slug: 'hot_dog', displayName: 'Hot dog', category: 'sandwiches', businessCategory: R, comparableUnit: 'each',
    aliases: ['hot dog', 'chicago dog', 'hot dogs', 'chili dog'] },
  { slug: 'bratwurst', displayName: 'Bratwurst', category: 'sandwiches', businessCategory: R, comparableUnit: 'each',
    aliases: ['brat', 'brats', 'bratwurst', 'brat fry', 'brat special'] },

  // --------------------------------------------------- wisconsin classics
  { slug: 'fish_fry', displayName: 'Friday fish fry', category: 'entrees', businessCategory: R, comparableUnit: 'each',
    aliases: ['fish fry', 'friday fish fry', 'cod dinner', 'perch dinner', 'walleye dinner', 'fish dinner', 'all you can eat fish', 'bluegill'] },
  { slug: 'cheese_curds', displayName: 'Cheese curds', category: 'appetizers', businessCategory: R, comparableUnit: 'each',
    aliases: ['curds', 'fried cheese curds', 'cheese curds', 'curd basket'] },
  { slug: 'nachos', displayName: 'Nachos', category: 'appetizers', businessCategory: R, comparableUnit: 'each',
    aliases: ['nachos', 'nacho', 'loaded nachos', 'nacho night'] },
  { slug: 'old_fashioned', displayName: 'Old fashioned', category: 'drinks', businessCategory: R, comparableUnit: 'each',
    aliases: ['old fashioned', 'brandy old fashioned', 'old fashioned sweet', 'old fashioned sour'] },

  // ------------------------------------------------------------- entrees
  { slug: 'salad_entree', displayName: 'Entrée salad', category: 'entrees', businessCategory: R, comparableUnit: 'each',
    aliases: ['salad', 'entree salad', 'caesar salad', 'cobb salad', 'chopped salad'] },
  { slug: 'pasta_entree', displayName: 'Pasta entrée', category: 'entrees', businessCategory: R, comparableUnit: 'each',
    aliases: ['pasta', 'spaghetti', 'lasagna', 'fettuccine', 'pasta night', 'all you can eat pasta'] },
  { slug: 'sushi_roll', displayName: 'Sushi roll', category: 'entrees', businessCategory: R, comparableUnit: 'each',
    aliases: ['roll', 'maki', 'sushi roll', 'half price sushi', 'half off rolls', 'sushi'] },
  { slug: 'ramen', displayName: 'Ramen', category: 'entrees', businessCategory: R, comparableUnit: 'each',
    aliases: ['ramen', 'ramen bowl', 'tonkotsu', 'miso ramen'] },
  { slug: 'pho', displayName: 'Pho', category: 'entrees', businessCategory: R, comparableUnit: 'each',
    aliases: ['pho', 'pho bowl', 'noodle soup'] },
  { slug: 'curry_entree', displayName: 'Curry entrée', category: 'entrees', businessCategory: R, comparableUnit: 'each',
    aliases: ['curry', 'tikka masala', 'butter chicken', 'pad thai', 'thai curry', 'lunch buffet'] },
  { slug: 'steak_dinner', displayName: 'Steak dinner', category: 'entrees', businessCategory: R, comparableUnit: 'each',
    aliases: ['steak dinner', 'steak night', 'sirloin dinner', 'ribeye dinner', 'prime rib', 'supper club steak'] },

  // ------------------------------------------------------------- specials
  { slug: 'happy_hour_appetizer', displayName: 'Happy hour appetizer', category: 'appetizers', businessCategory: R, comparableUnit: 'each',
    aliases: ['apps', 'appetizer', 'happy hour app', 'half price apps', 'half off appetizers', 'appetizer special'] },
  { slug: 'family_meal', displayName: 'Family meal', category: 'specials', businessCategory: R, comparableUnit: 'each',
    aliases: ['family pack', 'family bundle', 'feeds 4', 'family deal', 'family meal', 'feeds a family'] },
  { slug: 'kids_meal', displayName: 'Kids meal', category: 'specials', businessCategory: R, comparableUnit: 'each',
    aliases: ['kids eat free', "kid's meal", 'kids meal', "children's meal", 'kids night'] },
  { slug: 'lunch_special', displayName: 'Lunch special', category: 'specials', businessCategory: R, comparableUnit: 'each',
    aliases: ['lunch deal', 'lunch combo', 'lunch special', 'lunch plate', 'weekday lunch'] },
  { slug: 'dinner_special', displayName: 'Dinner special', category: 'specials', businessCategory: R, comparableUnit: 'each',
    aliases: ['dinner deal', 'dinner special', 'nightly special', 'daily special', 'date night special'] },

  // ------------------------------------------------------ breakfast/dessert
  { slug: 'breakfast_sandwich', displayName: 'Breakfast sandwich', category: 'breakfast', businessCategory: R, comparableUnit: 'each',
    aliases: ['breakfast sandwich', 'egg sandwich', 'bacon egg and cheese', 'breakfast biscuit'] },
  { slug: 'breakfast_plate', displayName: 'Breakfast plate', category: 'breakfast', businessCategory: R, comparableUnit: 'each',
    aliases: ['breakfast special', 'two eggs any style', 'pancakes', 'omelette', 'breakfast plate', 'brunch special'] },
  { slug: 'dessert', displayName: 'Dessert', category: 'desserts', businessCategory: R, comparableUnit: 'each',
    aliases: ['dessert', 'slice of cake', 'pie slice', 'ice cream', 'custard', 'frozen custard', 'sundae', 'scoop', 'cone'] },
  { slug: 'donut', displayName: 'Donut / pastry', category: 'desserts', businessCategory: R, comparableUnit: 'each',
    aliases: ['donut', 'doughnut', 'dozen donuts', 'pastry', 'croissant', 'kringle', 'cookie'] },

  // --------------------------------------------------------------- drinks
  { slug: 'coffee_drip', displayName: 'Drip coffee', category: 'drinks', businessCategory: R, comparableUnit: 'each',
    aliases: ['coffee', 'drip coffee', 'cup of coffee', 'cold brew', 'iced coffee'] },
  { slug: 'latte', displayName: 'Latte / espresso drink', category: 'drinks', businessCategory: R, comparableUnit: 'each',
    aliases: ['latte', 'cappuccino', 'mocha', 'espresso drink', 'chai latte'] },
  { slug: 'beer_pint', displayName: 'Beer (pint)', category: 'drinks', businessCategory: R, comparableUnit: 'each',
    aliases: ['pint', 'draft beer', 'tap beer', 'pints', 'draft special', 'spotted cow pint', 'tall boy', 'glass of beer'] },
  { slug: 'cocktail', displayName: 'Cocktail', category: 'drinks', businessCategory: R, comparableUnit: 'each',
    aliases: ['cocktail', 'margarita', 'mixed drink', 'well drinks', 'rail drinks', 'mimosa', 'bloody mary'] },
  { slug: 'beer_bottle', displayName: 'Beer bottle / can', category: 'drinks', businessCategory: R, comparableUnit: 'each',
    aliases: ['bottle', 'bottles', 'domestic bottles', 'cans', 'tall boys', 'bottle special', 'bucket of beer'] },
  { slug: 'beer_pitcher', displayName: 'Beer pitcher', category: 'drinks', businessCategory: R, comparableUnit: 'each',
    aliases: ['pitcher', 'pitchers', 'beer pitcher', 'pitcher of beer', 'pitcher special'] },
  { slug: 'beer_to_go', displayName: 'Growler / crowler', category: 'drinks', businessCategory: R, comparableUnit: 'each',
    aliases: ['growler', 'crowler', 'growler fill', 'beer to go', '4-pack to go', 'six pack to go'] },
  { slug: 'wine_glass', displayName: 'Wine (glass)', category: 'drinks', businessCategory: R, comparableUnit: 'each',
    aliases: ['glass of wine', 'wine glass', 'house wine', 'half price wine'] },

  // ================================================================= GROCERY
  // ----------------------------------------------------------------- meat
  { slug: 'ground_beef_lb', displayName: 'Ground beef', category: 'meat', businessCategory: G, comparableUnit: 'lb',
    aliases: ['ground beef', 'hamburger meat', 'ground chuck', '80/20', '85/15', '93/7', 'ground round', 'lean ground beef'] , unitPriceRange: [1.5, 15], excludes: ['jerky', 'seasoning', 'broth', 'dog', 'cat', 'bouillon', 'stick'] },
  { slug: 'ground_turkey_lb', displayName: 'Ground turkey', category: 'meat', businessCategory: G, comparableUnit: 'lb',
    aliases: ['ground turkey', 'ground chicken', 'lean ground turkey'] , unitPriceRange: [1.5, 12], excludes: ['jerky', 'seasoning', 'broth', 'dog', 'cat'] },
  { slug: 'chicken_breast_lb', displayName: 'Chicken breast', category: 'meat', businessCategory: G, comparableUnit: 'lb',
    aliases: ['boneless skinless chicken breast', 'chicken breasts', 'chicken breast', 'chicken breast family pack'] , unitPriceRange: [1, 12], excludes: ['nugget', 'pattie', 'seasoning', 'broth', 'soup', 'dog', 'cat', 'deli', 'lunchmeat', 'jerky', 'canned', 'strips breaded'] },
  { slug: 'chicken_thighs_lb', displayName: 'Chicken thighs', category: 'meat', businessCategory: G, comparableUnit: 'lb',
    aliases: ['chicken thighs', 'boneless thighs', 'chicken drumsticks', 'chicken leg quarters', 'chicken wings raw'] , unitPriceRange: [0.8, 10], excludes: ['seasoning', 'broth', 'dog', 'cat'] },
  { slug: 'whole_chicken_lb', displayName: 'Whole chicken', category: 'meat', businessCategory: G, comparableUnit: 'lb',
    aliases: ['whole chicken', 'whole fryer', 'roaster chicken', 'young chicken'] , unitPriceRange: [0.8, 8], excludes: ['broth', 'soup'] },
  { slug: 'pork_chops_lb', displayName: 'Pork chops', category: 'meat', businessCategory: G, comparableUnit: 'lb',
    aliases: ['pork chops', 'bone-in pork chops', 'boneless pork chops', 'pork loin', 'pork tenderloin'] , unitPriceRange: [1, 15], excludes: ['seasoning', 'rind', 'jerky'] },
  { slug: 'pork_shoulder_lb', displayName: 'Pork shoulder / ribs', category: 'meat', businessCategory: G, comparableUnit: 'lb',
    aliases: ['pork shoulder', 'pork butt', 'boston butt', 'baby back ribs', 'spare ribs', 'pork ribs'] , unitPriceRange: [1, 15], excludes: ['seasoning', 'rind', 'jerky', 'sauce'] },
  { slug: 'bacon_lb', displayName: 'Bacon', category: 'meat', businessCategory: G, comparableUnit: 'lb',
    aliases: ['bacon', 'thick cut bacon', 'sliced bacon', 'nueske'] , unitPriceRange: [2, 25], excludes: ['bits', 'seasoning', 'dog', 'cat', 'jerky', 'flavored chips'] },
  { slug: 'sausage_lb', displayName: 'Sausage & brats', category: 'meat', businessCategory: G, comparableUnit: 'lb',
    aliases: ['brats', 'bratwurst', 'italian sausage', 'kielbasa', 'johnsonville', 'breakfast sausage', 'sausage links'] , unitPriceRange: [1.5, 20], excludes: ['seasoning', 'pizza', 'biscuit', 'gravy'] },
  { slug: 'steak_ribeye_lb', displayName: 'Ribeye steak', category: 'meat', businessCategory: G, comparableUnit: 'lb',
    aliases: ['ribeye', 'rib eye', 'ribeye steak', 'delmonico'] , unitPriceRange: [6, 45], excludes: ['seasoning', 'sauce', 'jerky'] },
  { slug: 'steak_sirloin_lb', displayName: 'Sirloin / strip steak', category: 'meat', businessCategory: G, comparableUnit: 'lb',
    aliases: ['sirloin', 'top sirloin', 'strip steak', 'new york strip', 't-bone', 'porterhouse', 'flank steak', 'skirt steak'] , unitPriceRange: [4, 35], excludes: ['seasoning', 'sauce', 'jerky', 'tips seasoning'] },
  { slug: 'beef_roast_lb', displayName: 'Beef roast', category: 'meat', businessCategory: G, comparableUnit: 'lb',
    aliases: ['chuck roast', 'pot roast', 'beef roast', 'rump roast', 'brisket', 'stew meat'] , unitPriceRange: [3, 25], excludes: ['seasoning', 'gravy', 'jerky'] },
  { slug: 'deli_meat_lb', displayName: 'Deli meat', category: 'meat', businessCategory: G, comparableUnit: 'lb',
    aliases: ['deli ham', 'deli turkey', 'sliced turkey', "boar's head", 'lunch meat', 'deli meat', 'roast beef deli'] , unitPriceRange: [3, 25], excludes: ['dog', 'cat'] },

  // -------------------------------------------------------------- seafood
  { slug: 'salmon_lb', displayName: 'Salmon', category: 'seafood', businessCategory: G, comparableUnit: 'lb',
    aliases: ['salmon', 'atlantic salmon', 'salmon fillet', 'sockeye'] , unitPriceRange: [4, 40], excludes: ['dog', 'cat', 'jerky', 'seasoning'] },
  { slug: 'shrimp_lb', displayName: 'Shrimp', category: 'seafood', businessCategory: G, comparableUnit: 'lb',
    aliases: ['shrimp', 'raw shrimp', 'cooked shrimp', 'jumbo shrimp', 'shrimp ring'] , unitPriceRange: [4, 40], excludes: ['seasoning', 'sauce', 'chips', 'flavored', 'breaded', 'crunchy', 'popcorn', 'tempura', 'battered', 'scampi', 'dumpling', 'egg roll', 'fried rice', 'ramen'] },
  { slug: 'whitefish_lb', displayName: 'White fish (cod, tilapia, walleye)', category: 'seafood', businessCategory: G, comparableUnit: 'lb',
    aliases: ['cod', 'cod fillet', 'tilapia', 'white fish', 'haddock', 'walleye', 'perch', 'fish fillets'] , unitPriceRange: [3, 30], excludes: ['dog', 'cat', 'sticks breaded', 'seasoning'] },

  // ------------------------------------------------------------ dairy/eggs
  { slug: 'eggs_dozen', displayName: 'Eggs', category: 'dairy_eggs', businessCategory: G, comparableUnit: 'dozen',
    aliases: ['eggs', 'large eggs', 'dozen eggs', '18 count eggs', 'egg', 'cage free eggs'] , unitPriceRange: [1, 15], excludes: ['roll', 'noodle', 'substitute', 'liquid', 'bites', 'chocolate', 'candy', 'easter'] },
  { slug: 'milk_gallon', displayName: 'Milk', category: 'dairy_eggs', businessCategory: G, comparableUnit: 'gallon',
    aliases: ['milk', 'gallon of milk', 'whole milk', '2% milk', 'skim milk', 'half gallon milk'] , unitPriceRange: [1.5, 20], excludes: ['almond', 'oat', 'soy', 'coconut', 'cashew', 'powder', 'creamer', 'evaporated', 'condensed', 'chocolate', 'magnesia', 'shake', 'protein drink'] },
  { slug: 'butter_lb', displayName: 'Butter', category: 'dairy_eggs', businessCategory: G, comparableUnit: 'lb',
    aliases: ['butter', 'salted butter', 'unsalted butter', 'butter quarters'] , unitPriceRange: [1.5, 15], excludes: ['peanut', 'almond', 'cookie', 'popcorn', 'cocoa', 'body', 'apple'] },
  { slug: 'cheese_block_lb', displayName: 'Cheese', category: 'dairy_eggs', businessCategory: G, comparableUnit: 'lb',
    aliases: ['cheese', 'cheddar', 'block cheese', 'shredded cheese', 'mozzarella', 'colby jack', 'sliced cheese', 'string cheese'] , unitPriceRange: [2, 30], excludes: ['cheesecake', 'mac', 'cracker', 'puff', 'cheez', 'sauce', 'dip', 'ball', 'cake', 'curl', 'powder'] },
  { slug: 'fresh_cheese_curds_lb', displayName: 'Fresh cheese curds', category: 'dairy_eggs', businessCategory: G, comparableUnit: 'lb',
    aliases: ['fresh curds', 'cheese curds', 'squeaky curds', 'white cheddar curds'] , unitPriceRange: [3, 25], excludes: ['fried', 'breaded'] },
  { slug: 'yogurt', displayName: 'Yogurt', category: 'dairy_eggs', businessCategory: G, comparableUnit: 'oz',
    aliases: ['yogurt', 'greek yogurt', 'yogurt cup', 'chobani', 'oikos'] , unitPriceRange: [0.05, 0.6], excludes: ['drink', 'covered', 'pretzel', 'chips', 'frozen'] },
  { slug: 'ice_cream_carton', displayName: 'Ice cream', category: 'dairy_eggs', businessCategory: G, comparableUnit: 'fl_oz',
    aliases: ['ice cream', 'pint of ice cream', 'ice cream carton', 'frozen custard', 'ben and jerrys', 'chocolate shoppe'] , unitPriceRange: [0.02, 0.4], excludes: ['cone', 'sandwich', 'bar', 'cake', 'topping', 'syrup'] },

  // -------------------------------------------------------------- produce
  { slug: 'bananas_lb', displayName: 'Bananas', category: 'produce', businessCategory: G, comparableUnit: 'lb',
    aliases: ['bananas', 'banana'] , unitPriceRange: [0.2, 2.5], excludes: ['nectar', 'juice', 'chips', 'bread', 'pudding', 'smoothie', 'flavored', 'baby', 'dried'] },
  { slug: 'apples_lb', displayName: 'Apples', category: 'produce', businessCategory: G, comparableUnit: 'lb',
    aliases: ['apples', 'honeycrisp', 'gala apples', 'fuji apples', 'bag of apples', '3 lb apples'] , unitPriceRange: [0.5, 6], excludes: ['juice', 'sauce', 'cider', 'pie', 'chips', 'butter', 'vinegar', 'snack'] },
  { slug: 'avocado', displayName: 'Avocado', category: 'produce', businessCategory: G, comparableUnit: 'each',
    aliases: ['avocado', 'avocados', 'hass avocado'] , unitPriceRange: [0.3, 4], excludes: ['oil', 'dip', 'guacamole', 'toast', 'salad', 'ranch', 'kit', 'dressing', 'mayo', 'hummus'] },
  { slug: 'strawberries_lb', displayName: 'Strawberries', category: 'produce', businessCategory: G, comparableUnit: 'lb',
    aliases: ['strawberries', 'strawberry', '1 lb strawberries', '2 lb strawberries'] , unitPriceRange: [1, 10], excludes: ['jam', 'preserve', 'jelly', 'syrup', 'yogurt', 'frozen', 'ice cream', 'banana'] },
  { slug: 'berries_lb', displayName: 'Blueberries / raspberries', category: 'produce', businessCategory: G, comparableUnit: 'lb',
    aliases: ['blueberries', 'raspberries', 'blackberries', 'pint of blueberries', 'berries'] , unitPriceRange: [2, 25], excludes: ['jam', 'preserve', 'juice', 'syrup', 'yogurt', 'cereal', 'muffin', 'chocolate', 'covered', 'frozen', 'bar', 'granola', 'smoothie'] },
  { slug: 'grapes_lb', displayName: 'Grapes', category: 'produce', businessCategory: G, comparableUnit: 'lb',
    aliases: ['grapes', 'red grapes', 'green grapes', 'seedless grapes'] , unitPriceRange: [0.8, 8], excludes: ['juice', 'jelly', 'jam', 'soda'] },
  { slug: 'tomatoes_lb', displayName: 'Tomatoes', category: 'produce', businessCategory: G, comparableUnit: 'lb',
    aliases: ['tomatoes', 'roma tomatoes', 'tomatoes on the vine', 'cherry tomatoes'] , unitPriceRange: [0.5, 8], excludes: ['sauce', 'paste', 'soup', 'canned', 'ketchup', 'diced', 'crushed', 'juice'] },
  { slug: 'potatoes_lb', displayName: 'Potatoes', category: 'produce', businessCategory: G, comparableUnit: 'lb',
    aliases: ['potatoes', 'russet potatoes', '5 lb potatoes', '10 lb potatoes', 'red potatoes', 'yukon gold'] , unitPriceRange: [0.3, 4], excludes: ['chips', 'fries', 'tots', 'hash', 'mashed', 'salad', 'soup', 'sweet potato fries'] },
  { slug: 'onions_lb', displayName: 'Onions', category: 'produce', businessCategory: G, comparableUnit: 'lb',
    aliases: ['onions', 'yellow onions', 'sweet onions', '3 lb onions'] , unitPriceRange: [0.3, 4], excludes: ['rings', 'powder', 'soup', 'dip', 'fried'] },
  { slug: 'lettuce_head', displayName: 'Lettuce / salad', category: 'produce', businessCategory: G, comparableUnit: 'each',
    aliases: ['lettuce', 'romaine', 'iceberg', 'head of lettuce', 'salad mix', 'salad kit', 'spinach'] , unitPriceRange: [0.5, 6] },
  { slug: 'sweet_corn', displayName: 'Sweet corn (per ear)', category: 'produce', businessCategory: G, comparableUnit: 'each',
    aliases: ['sweet corn', 'corn on the cob', 'ears of corn', 'corn'] , unitPriceRange: [0.15, 2], excludes: ['chips', 'flakes', 'dog', 'popcorn', 'syrup', 'canned', 'tortilla'] },
  { slug: 'peppers_each', displayName: 'Bell peppers', category: 'produce', businessCategory: G, comparableUnit: 'each',
    aliases: ['bell peppers', 'peppers', 'green peppers', 'red peppers', 'pepper'] , unitPriceRange: [0.3, 4], excludes: ['sauce', 'flakes', 'jelly', 'stuffed', 'seasoning'] },

  // --------------------------------------------------------------- pantry
  { slug: 'bread_loaf', displayName: 'Bread', category: 'pantry', businessCategory: G, comparableUnit: 'each',
    aliases: ['bread', 'loaf', 'sandwich bread', 'sourdough', 'buns', 'hamburger buns', 'bagels'] , unitPriceRange: [1, 10], excludes: ['crumbs', 'pudding', 'stuffing', 'bowl', 'dog'] },
  { slug: 'rice_lb', displayName: 'Rice', category: 'pantry', businessCategory: G, comparableUnit: 'lb',
    aliases: ['rice', 'jasmine rice', 'basmati', 'white rice', 'brown rice', '20 lb rice'] , unitPriceRange: [0.5, 6], excludes: ['cake', 'krispies', 'pudding', 'noodle', 'vinegar', 'milk', 'chex', 'cereal'] },
  { slug: 'pasta_lb', displayName: 'Pasta', category: 'pantry', businessCategory: G, comparableUnit: 'lb',
    aliases: ['pasta', 'spaghetti', 'penne', 'box of pasta', 'barilla', 'macaroni'] , unitPriceRange: [0.6, 8], excludes: ['sauce', 'salad', 'canned', 'ravioli', 'frozen'] },
  { slug: 'cereal_box', displayName: 'Cereal', category: 'pantry', businessCategory: G, comparableUnit: 'oz',
    aliases: ['cereal', 'cheerios', 'box of cereal', 'oatmeal', 'granola'] , unitPriceRange: [0.1, 0.8], excludes: ['bar'] },
  { slug: 'peanut_butter_jar', displayName: 'Peanut butter', category: 'pantry', businessCategory: G, comparableUnit: 'oz',
    aliases: ['peanut butter', 'jif', 'skippy', 'nut butter'] , unitPriceRange: [0.08, 0.6], excludes: ['cup', 'cookie', 'candy', 'pretzel', 'cereal', 'chocolate'] },
  { slug: 'coffee_lb', displayName: 'Coffee (bag)', category: 'pantry', businessCategory: G, comparableUnit: 'lb',
    aliases: ['coffee', 'ground coffee', 'coffee beans', 'bag of coffee', 'folgers', 'colectivo'] , unitPriceRange: [4, 40], excludes: ['creamer', 'k-cup', 'pod', 'cake', 'mug', 'filter', 'ice cream', 'drink'] },
  { slug: 'olive_oil_liter', displayName: 'Olive oil', category: 'pantry', businessCategory: G, comparableUnit: 'liter',
    aliases: ['olive oil', 'extra virgin olive oil', 'cooking oil', 'vegetable oil', 'canola oil'] , unitPriceRange: [4, 45], excludes: ['spray'] },
  { slug: 'flour_lb', displayName: 'Flour', category: 'pantry', businessCategory: G, comparableUnit: 'lb',
    aliases: ['flour', '5 lb flour', 'all purpose flour', 'bread flour'] , unitPriceRange: [0.3, 4], excludes: ['tortilla', 'sack'] },
  { slug: 'sugar_lb', displayName: 'Sugar', category: 'pantry', businessCategory: G, comparableUnit: 'lb',
    aliases: ['sugar', '4 lb sugar', 'granulated sugar', 'brown sugar'] , unitPriceRange: [0.4, 4], excludes: ['brown sugar cinnamon', 'cookie', 'free'] },
  { slug: 'canned_goods', displayName: 'Canned goods (per can)', category: 'pantry', businessCategory: G, comparableUnit: 'each',
    aliases: ['canned beans', 'canned tomatoes', 'canned soup', 'canned vegetables', 'canned corn', 'can of', 'campbells'] , unitPriceRange: [0.4, 6] },
  { slug: 'chips_bag', displayName: 'Chips', category: 'snacks', businessCategory: G, comparableUnit: 'oz',
    aliases: ['chips', 'doritos', 'lays', 'bag of chips', 'family size chips', 'tortilla chips', 'pretzels'] , unitPriceRange: [0.15, 1.2], excludes: ['dip', 'salsa', 'chocolate', 'banana', 'apple'] },

  // ------------------------------------------------------------- prepared
  { slug: 'rotisserie_chicken', displayName: 'Rotisserie chicken', category: 'prepared', businessCategory: G, comparableUnit: 'each',
    aliases: ['rotisserie chicken', 'rotisserie', 'hot deli chicken'] , unitPriceRange: [4, 15] },
  { slug: 'frozen_pizza', displayName: 'Frozen pizza', category: 'prepared', businessCategory: G, comparableUnit: 'each',
    aliases: ['frozen pizza', 'tombstone', "jack's pizza", 'digiorno', 'red baron', 'totinos'] , unitPriceRange: [2, 15], excludes: ['roll', 'bites', 'bagel', 'sauce', 'crust only'] },
  { slug: 'deli_hot_meal', displayName: 'Deli hot meal', category: 'prepared', businessCategory: G, comparableUnit: 'each',
    aliases: ['deli meal', 'hot deli', 'meal deal', 'fried chicken deli', '8 piece deli chicken', 'sushi deli'] , unitPriceRange: [3, 25] },

  // ------------------------------------------------------------ beverages
  { slug: 'orange_juice', displayName: 'Orange juice', category: 'beverages', businessCategory: G, comparableUnit: 'gallon',
    aliases: ['orange juice', 'oj', 'tropicana', 'simply orange', 'juice'] , unitPriceRange: [3, 25], excludes: ['soda', 'candy', 'chicken'] },
  { slug: 'soda_can', displayName: 'Soda (per can/bottle)', category: 'beverages', businessCategory: G, comparableUnit: 'each',
    aliases: ['12 pack', '12-pack', 'coke 12 pack', 'pepsi 12 pack', 'soda', 'pop', '2 liter', 'mountain dew', 'sparkling water'] , unitPriceRange: [0.2, 2.5] },
  { slug: 'water_bottle', displayName: 'Bottled water (per bottle)', category: 'beverages', businessCategory: G, comparableUnit: 'each',
    aliases: ['case of water', '24 pack water', 'bottled water', 'water'] , unitPriceRange: [0.05, 1.5], excludes: ['flavored drops', 'filter'] },
  { slug: 'beer_can', displayName: 'Beer (per can/bottle, grocery)', category: 'beverages', businessCategory: G, comparableUnit: 'each',
    aliases: ['12 pack beer', '24 pack beer', 'case of beer', 'spotted cow', 'miller lite', 'busch light', '30 pack', 'beer'] , unitPriceRange: [0.5, 4.5], excludes: ['non-alcoholic cheese', 'bread', 'brat'] },
  { slug: 'wine_bottle', displayName: 'Wine (bottle)', category: 'beverages', businessCategory: G, comparableUnit: 'each',
    aliases: ['wine', 'bottle of wine', '750ml wine', 'wine sale'] , unitPriceRange: [3, 40], excludes: ['glass', 'opener', 'vinegar', 'cooler'] },
];

export const CANONICAL_SLUGS: readonly string[] = CANONICAL_ITEMS.map((i) => i.slug);

export const CANONICAL_ITEM_BY_SLUG: ReadonlyMap<string, CanonicalItem> = new Map(
  CANONICAL_ITEMS.map((i) => [i.slug, i]),
);

/** Slugs valid for a given business category (used to narrow the extraction enum). */
export function slugsFor(category: BusinessCategory): string[] {
  return CANONICAL_ITEMS.filter((i) => i.businessCategory === category).map((i) => i.slug);
}

/** One-line-per-item listing injected into the extraction system prompt. */
export function taxonomyPromptBlock(category?: BusinessCategory): string {
  return CANONICAL_ITEMS
    .filter((i) => !category || i.businessCategory === category)
    .map((i) => `${i.slug}: ${i.displayName} [${i.comparableUnit}]`)
    .join('\n');
}

// Sanity: slugs must be unique.
{
  const seen = new Set<string>();
  for (const item of CANONICAL_ITEMS) {
    if (seen.has(item.slug)) throw new Error(`duplicate canonical slug: ${item.slug}`);
    seen.add(item.slug);
  }
}
