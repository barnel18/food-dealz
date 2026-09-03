-- =============================================================================
-- DEVELOPMENT SEED — SAMPLE DATA ONLY. Never run against production.
-- Businesses are real Madison, WI places with approximate coordinates; every
-- deal below is invented for UI development and is labeled as a sample in
-- `conditions` and `evidence_quote`. Run with: pnpm seed:dev
-- =============================================================================
begin;

-- Remove previous sample deals (idempotent re-seed).
delete from public.deals where evidence_quote = 'SAMPLE DATA';

insert into public.businesses (name, slug, category, chain_key, address, city, state, postal_code, location, phone, website_url)
values
  ('Ian''s Pizza on State',        'ians-pizza-state',      'restaurant', null,     '100 State St',            'Madison', 'WI', '53703', extensions.st_setsrid(extensions.st_makepoint(-89.3893, 43.0745), 4326)::extensions.geography, '(608) 257-9248', 'https://ianspizza.com'),
  ('Glass Nickel Pizza Co.',       'glass-nickel-atwood',   'restaurant', null,     '2916 Atwood Ave',         'Madison', 'WI', '53704', extensions.st_setsrid(extensions.st_makepoint(-89.3387, 43.0929), 4326)::extensions.geography, '(608) 245-0880', 'https://glassnickelpizza.com'),
  ('The Old Fashioned',            'the-old-fashioned',     'restaurant', null,     '23 N Pinckney St',        'Madison', 'WI', '53703', extensions.st_setsrid(extensions.st_makepoint(-89.3830, 43.0757), 4326)::extensions.geography, '(608) 310-4545', 'https://theoldfashioned.com'),
  ('Dotty Dumpling''s Dowry',      'dotty-dumplings-dowry', 'restaurant', null,     '317 N Frances St',        'Madison', 'WI', '53703', extensions.st_setsrid(extensions.st_makepoint(-89.3971, 43.0738), 4326)::extensions.geography, '(608) 259-0000', 'https://dottydumplingsdowry.com'),
  ('Taqueria Guadalajara',         'taqueria-guadalajara',  'restaurant', null,     '1033 S Park St',          'Madison', 'WI', '53715', extensions.st_setsrid(extensions.st_makepoint(-89.4003, 43.0538), 4326)::extensions.geography, '(608) 250-1824', null),
  ('Avenue Club & Bubble Up Bar',  'avenue-club',           'restaurant', null,     '1128 E Washington Ave',   'Madison', 'WI', '53703', extensions.st_setsrid(extensions.st_makepoint(-89.3660, 43.0851), 4326)::extensions.geography, '(608) 257-6877', 'https://avenueclubmadison.com'),
  ('Toby''s Supper Club',          'tobys-supper-club',     'restaurant', null,     '3717 S Dutch Mill Rd',    'Madison', 'WI', '53718', extensions.st_setsrid(extensions.st_makepoint(-89.3080, 43.0289), 4326)::extensions.geography, '(608) 222-6913', null),
  ('Great Dane Pub & Brewing Co.', 'great-dane-downtown',   'restaurant', null,     '123 E Doty St',           'Madison', 'WI', '53703', extensions.st_setsrid(extensions.st_makepoint(-89.3818, 43.0733), 4326)::extensions.geography, '(608) 284-0000', 'https://greatdanepub.com'),
  ('Mickies Dairy Bar',            'mickies-dairy-bar',     'restaurant', null,     '1511 Monroe St',          'Madison', 'WI', '53711', extensions.st_setsrid(extensions.st_makepoint(-89.4125, 43.0670), 4326)::extensions.geography, '(608) 256-9476', null),
  ('Woodman''s Market West',       'woodmans-west',         'grocery',    'woodmans', '711 S Gammon Rd',       'Madison', 'WI', '53719', extensions.st_setsrid(extensions.st_makepoint(-89.5095, 43.0554), 4326)::extensions.geography, '(608) 274-9000', 'https://www.woodmans-food.com'),
  ('Hy-Vee East Washington',       'hyvee-east-wash',       'grocery',    'hyvee',  '3801 E Washington Ave',   'Madison', 'WI', '53704', extensions.st_setsrid(extensions.st_makepoint(-89.3103, 43.1246), 4326)::extensions.geography, '(608) 244-6630', 'https://www.hy-vee.com'),
  ('Pick ''n Save South Park',     'pick-n-save-park-st',   'grocery',    'kroger', '1312 S Park St',          'Madison', 'WI', '53715', extensions.st_setsrid(extensions.st_makepoint(-89.4010, 43.0500), 4326)::extensions.geography, '(608) 257-0776', 'https://www.picknsave.com'),
  ('Willy Street Co-op East',      'willy-street-coop-east','grocery',    'willy',  '1221 Williamson St',      'Madison', 'WI', '53703', extensions.st_setsrid(extensions.st_makepoint(-89.3652, 43.0844), 4326)::extensions.geography, '(608) 251-6776', 'https://www.willystreet.coop'),
  ('Festival Foods East Wash',     'festival-foods-east',   'grocery',    'festival','810 E Washington Ave',   'Madison', 'WI', '53703', extensions.st_setsrid(extensions.st_makepoint(-89.3735, 43.0812), 4326)::extensions.geography, '(608) 284-7500', 'https://www.festfoods.com'),
  ('Metro Market Hilldale',        'metro-market-hilldale', 'grocery',    'kroger', '726 N Midvale Blvd',      'Madison', 'WI', '53705', extensions.st_setsrid(extensions.st_makepoint(-89.4548, 43.0741), 4326)::extensions.geography, '(608) 663-1100', 'https://www.metromarket.net')
on conflict (slug) do update set
  name = excluded.name, category = excluded.category, chain_key = excluded.chain_key, address = excluded.address,
  city = excluded.city, state = excluded.state, postal_code = excluded.postal_code, location = excluded.location,
  phone = excluded.phone, website_url = excluded.website_url, is_active = true;

insert into public.deals (
  business_id, source_type, title, item_name, canonical_item_slug, deal_type, price, regular_price, percent_off,
  quantity, unit, unit_price, conditions, ends_at, days_of_week, time_window, extraction_confidence, evidence_quote,
  status, dedupe_key, is_featured
)
select
  b.id, 'manual', v.title, v.item_name, v.slug, v.deal_type::public.deal_type, v.price, v.regular_price, v.percent_off,
  v.quantity, v.unit::public.unit_kind, v.unit_price,
  'Sample deal for development. Not a real offer.',
  v.ends_at, v.dow, v.time_window, 1.00, 'SAMPLE DATA', 'approved',
  b.id::text || '|' || coalesce(v.slug, lower(v.item_name)) || '|' || v.deal_type || '|' || coalesce(v.price::text, '') || '|' || v.quantity::text || '|' || v.unit,
  v.featured
from (values
  -- Restaurants ------------------------------------------------------------------------------------------------------
  ('ians-pizza-state',       'Mac n'' Cheese slice',                 'Mac n'' Cheese pizza slice',   'pizza_slice',          'fixed_price', 5.25::numeric,  null::numeric, null::numeric, 1::numeric,  'slice',  5.25::numeric,  null::timestamptz, null::smallint[],                 null::text,   true),
  ('ians-pizza-state',       'Two cheese slices for $8',             'Cheese pizza slice',           'pizza_slice',          'bundle',      8.00,           null,          null,          2,           'slice',  4.00,           null,              null,                             null,         false),
  ('glass-nickel-atwood',    'Large one-topping Mondays',            'Large one-topping pizza',      'pizza_large',          'fixed_price', 14.99,          21.99,         null,          1,           'each',   14.99,          null,              array[1]::smallint[],             null,         false),
  ('glass-nickel-atwood',    'Half-price appetizers',                'Appetizers',                   'happy_hour_appetizer', 'percent_off', null,           null,          50,            1,           'each',   null,           null,              array[1,2,3,4,5]::smallint[],     '3–5pm',      false),
  ('the-old-fashioned',      'Brandy Old Fashioned happy hour',      'Brandy old fashioned',         'old_fashioned',        'fixed_price', 6.00,           9.00,          null,          1,           'each',   6.00,           null,              array[1,2,3,4,5]::smallint[],     '3–6pm',      false),
  ('the-old-fashioned',      'Cheese curds basket',                  'Fried cheese curds',           'cheese_curds',         'fixed_price', 7.00,           null,          null,          1,           'each',   7.00,           null,              null,                             null,         false),
  ('the-old-fashioned',      'Friday fish fry',                      'Cod fish fry',                 'fish_fry',             'fixed_price', 16.00,          null,          null,          1,           'each',   16.00,          null,              array[5]::smallint[],             null,         false),
  ('dotty-dumplings-dowry',  'Burger basket Tuesdays',               'Burger with fries',            'burger_combo',         'fixed_price', 11.00,          14.50,         null,          1,           'each',   11.00,          null,              array[2]::smallint[],             null,         false),
  ('dotty-dumplings-dowry',  'Wisconsin craft pints',                'Craft beer pint',              'beer_pint',            'fixed_price', 4.00,           7.00,          null,          1,           'each',   4.00,           null,              array[1,2,3,4]::smallint[],       '4–6pm',      false),
  ('taqueria-guadalajara',   'Taco Tuesday',                         'Street taco',                  'taco',                 'fixed_price', 1.75,           3.25,          null,          1,           'each',   1.75,           null,              array[2]::smallint[],             null,         false),
  ('taqueria-guadalajara',   'Lunch burrito + drink',                'Burrito with drink',           'lunch_special',        'fixed_price', 9.00,           null,          null,          1,           'each',   9.00,           null,              array[1,2,3,4,5]::smallint[],     '11am–2pm',   false),
  ('avenue-club',            'Friday fish fry',                      'Fish fry dinner',              'fish_fry',             'fixed_price', 17.95,          null,          null,          1,           'each',   17.95,          null,              array[5]::smallint[],             null,         false),
  ('avenue-club',            'Wing Wednesday',                       'Chicken wings',                'wings',                'fixed_price', 0.75,           1.25,          null,          1,           'each',   0.75,           null,              array[3]::smallint[],             null,         false),
  ('tobys-supper-club',      'All-you-can-eat fish fry',             'Fish fry, all you can eat',    'fish_fry',             'fixed_price', 18.50,          null,          null,          1,           'each',   18.50,          null,              array[5]::smallint[],             null,         true),
  ('tobys-supper-club',      'Thursday steak night',                 '12 oz ribeye dinner',          'steak_dinner',         'fixed_price', 24.00,          32.00,         null,          1,           'each',   24.00,          null,              array[4]::smallint[],             null,         false),
  ('great-dane-downtown',    'Pint night',                           'House beer pint',              'beer_pint',            'fixed_price', 4.50,           7.00,          null,          1,           'each',   4.50,           null,              array[2]::smallint[],             null,         false),
  ('great-dane-downtown',    'Kids eat free Sundays',                'Kids meal',                    'kids_meal',            'free_item',   null,           null,          null,          1,           'each',   null,           null,              array[0]::smallint[],             null,         false),
  ('great-dane-downtown',    'Half-price pizzas late night',         'Personal pizza',               'pizza_personal',       'percent_off', null,           null,          50,            1,           'each',   null,           null,              array[0,1,2,3,4]::smallint[],     '9pm–close',  false),
  ('mickies-dairy-bar',      'Weekday breakfast special',            'Two eggs, hash browns, toast', 'breakfast_plate',      'fixed_price', 8.50,           null,          null,          1,           'each',   8.50,           null,              array[1,2,3,4,5]::smallint[],     'until 11am', false),
  -- Grocery (weekly ad style: ends in 7 days) --------------------------------------------------------------------------
  ('woodmans-west',          'Ground beef 80/20',                    'Ground beef 80/20',            'ground_beef_lb',       'fixed_price', 3.99,           4.99,          null,          1,           'lb',     3.99,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('woodmans-west',          'Boneless chicken breast',              'Boneless skinless chicken breast', 'chicken_breast_lb','fixed_price', 1.99,           3.49,          null,          1,           'lb',     1.99,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('woodmans-west',          'Large eggs, dozen',                    'Large eggs',                   'eggs_dozen',           'fixed_price', 1.79,           2.49,          null,          1,           'dozen',  1.79,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('woodmans-west',          'Whole milk, gallon',                   'Whole milk',                   'milk_gallon',          'fixed_price', 2.69,           3.29,          null,          1,           'gallon', 2.69,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('woodmans-west',          'Bananas',                              'Bananas',                      'bananas_lb',           'fixed_price', 0.49,           0.59,          null,          1,           'lb',     0.49,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('woodmans-west',          'Jack''s frozen pizza 2 for $6',        'Jack''s original frozen pizza','frozen_pizza',         'bundle',      6.00,           null,          null,          2,           'each',   3.00,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('woodmans-west',          'Johnsonville brats 19 oz',             'Johnsonville bratwurst',       'sausage_lb',           'fixed_price', 3.99,           5.49,          null,          19,          'oz',     3.36,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('hyvee-east-wash',        'Ground beef 85/15',                    'Ground beef 85/15',            'ground_beef_lb',       'fixed_price', 4.49,           5.99,          null,          1,           'lb',     4.49,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('hyvee-east-wash',        'Strawberries 1 lb',                    'Strawberries',                 'strawberries_lb',      'fixed_price', 2.50,           3.99,          null,          1,           'lb',     2.50,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('hyvee-east-wash',        'Rotisserie chicken',                   'Rotisserie chicken',           'rotisserie_chicken',   'fixed_price', 6.99,           8.99,          null,          1,           'each',   6.99,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('hyvee-east-wash',        'Coca-Cola 12-pack',                    'Coca-Cola 12 pk cans',         'soda_can',             'fixed_price', 6.49,           8.99,          null,          12,          'each',   0.54,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('pick-n-save-park-st',    'Chicken thighs, bone-in',              'Bone-in chicken thighs',       'chicken_thighs_lb',    'fixed_price', 1.29,           2.29,          null,          1,           'lb',     1.29,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('pick-n-save-park-st',    'Kraft cheese block 8 oz',              'Kraft cheddar block',          'cheese_block_lb',      'fixed_price', 2.50,           3.99,          null,          8,           'oz',     5.00,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('pick-n-save-park-st',    'Eggs 18 ct',                           'Large eggs 18 count',          'eggs_dozen',           'fixed_price', 3.49,           4.29,          null,          1.5,         'dozen',  2.33,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('pick-n-save-park-st',    'Pork chops, bone-in',                  'Bone-in pork chops',           'pork_chops_lb',        'fixed_price', 2.99,           4.49,          null,          1,           'lb',     2.99,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('willy-street-coop-east', 'Local pasture eggs',                   'Local pasture-raised eggs',    'eggs_dozen',           'fixed_price', 4.99,           5.99,          null,          1,           'dozen',  4.99,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('willy-street-coop-east', 'Fresh cheese curds 12 oz',             'Fresh white cheddar curds',    'fresh_cheese_curds_lb','fixed_price', 4.49,           5.49,          null,          12,          'oz',     5.99,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('willy-street-coop-east', 'Avocados 2 for $3',                    'Hass avocados',                'avocado',              'bundle',      3.00,           null,          null,          2,           'each',   1.50,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('festival-foods-east',    'Ground beef 80/20',                    'Ground beef 80/20',            'ground_beef_lb',       'fixed_price', 3.79,           4.99,          null,          1,           'lb',     3.79,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('festival-foods-east',    'Atlantic salmon fillet',               'Atlantic salmon fillet',       'salmon_lb',            'fixed_price', 8.99,           11.99,         null,          1,           'lb',     8.99,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('festival-foods-east',    'Honeycrisp apples',                    'Honeycrisp apples',            'apples_lb',            'fixed_price', 1.99,           2.99,          null,          1,           'lb',     1.99,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('festival-foods-east',    'Sweet corn 6 for $2',                  'Wisconsin sweet corn',         'sweet_corn',           'bundle',      2.00,           null,          null,          6,           'each',   0.33,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('metro-market-hilldale',  'Ribeye steak',                         'Bone-in ribeye steak',         'steak_ribeye_lb',      'fixed_price', 12.99,          16.99,         null,          1,           'lb',     12.99,          date_trunc('day', now()) + interval '7 days', null, null, false),
  ('metro-market-hilldale',  'Bacon 16 oz',                          'Thick-cut bacon',              'bacon_lb',             'fixed_price', 5.99,           7.99,          null,          16,          'oz',     5.99,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('metro-market-hilldale',  'Butter, 1 lb',                         'Salted butter quarters',       'butter_lb',            'fixed_price', 3.49,           4.99,          null,          1,           'lb',     3.49,           date_trunc('day', now()) + interval '7 days', null, null, false),
  ('metro-market-hilldale',  'Orange juice 52 oz',                   'Orange juice',                 'orange_juice',         'fixed_price', 3.99,           4.99,          null,          52,          'fl_oz',  9.82,           date_trunc('day', now()) + interval '7 days', null, null, false)
) as v(bslug, title, item_name, slug, deal_type, price, regular_price, percent_off, quantity, unit, unit_price, ends_at, dow, time_window, featured)
join public.businesses b on b.slug = v.bslug;

commit;

select count(*) as sample_deals from public.deals where evidence_quote = 'SAMPLE DATA';
