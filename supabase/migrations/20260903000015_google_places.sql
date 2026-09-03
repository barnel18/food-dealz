-- "Yelp layer": ratings, review counts, price level, cuisines, opening hours, photos and reviews for every place
-- (sourced from Google Places, refreshed monthly by `pnpm google:sync`), plus open-now filtering and richer sorting.

alter table public.businesses
  add column if not exists rating numeric(2,1),
  add column if not exists review_count integer,
  add column if not exists price_level smallint,            -- 1..4 ($ .. $$$$)
  add column if not exists cuisines text[] not null default '{}',
  add column if not exists primary_type text,
  add column if not exists photos jsonb not null default '[]'::jsonb,  -- [{url, width, height, attribution, attribution_uri}]
  add column if not exists editorial_summary text,
  add column if not exists google_maps_uri text,
  add column if not exists google_synced_at timestamptz;
-- `hours` (jsonb, already present) now holds Google regularOpeningHours: { periods: [...], weekdayDescriptions: [...] }.
create index if not exists businesses_rating_idx on public.businesses (rating desc nulls last);
create index if not exists businesses_cuisines_gin on public.businesses using gin (cuisines);

create table if not exists public.business_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source text not null default 'google',
  external_id text,
  author_name text,
  author_uri text,
  author_photo text,
  rating smallint,
  text text,
  published_at timestamptz,
  relative_time text,
  created_at timestamptz not null default now(),
  unique (business_id, source, external_id)
);
create index if not exists business_reviews_biz on public.business_reviews (business_id, published_at desc);
alter table public.business_reviews enable row level security;
drop policy if exists "reviews public read" on public.business_reviews;
create policy "reviews public read" on public.business_reviews for select using (true);

-- Is a place open right now, given Google-style periods ({open:{day,hour,minute}, close:{...}}; day 0 = Sunday)?
-- Returns null when hours are unknown, true for places listed as open 24/7 (a period with no close).
create or replace function public.is_open_now(p_hours jsonb, p_tz text default 'America/Chicago')
returns boolean language plpgsql stable as $$
declare
  ts timestamp := (now() at time zone p_tz);
  cur int := extract(dow from ts)::int * 1440 + extract(hour from ts)::int * 60 + extract(minute from ts)::int;
  p jsonb; start_m int; end_m int;
begin
  if p_hours is null or jsonb_typeof(p_hours->'periods') <> 'array' then return null; end if;
  for p in select * from jsonb_array_elements(p_hours->'periods') loop
    if p->'close' is null then return true; end if;
    start_m := coalesce((p->'open'->>'day')::int, 0) * 1440 + coalesce((p->'open'->>'hour')::int, 0) * 60 + coalesce((p->'open'->>'minute')::int, 0);
    end_m := coalesce((p->'close'->>'day')::int, 0) * 1440 + coalesce((p->'close'->>'hour')::int, 0) * 60 + coalesce((p->'close'->>'minute')::int, 0);
    if end_m <= start_m then end_m := end_m + 7 * 1440; end if;
    if cur >= start_m and cur < end_m then return true; end if;
    if cur + 7 * 1440 >= start_m and cur + 7 * 1440 < end_m then return true; end if;
  end loop;
  return false;
end $$;
grant execute on function public.is_open_now(jsonb, text) to anon, authenticated;

-- Directory RPC v2: rating/price/cuisine/hours on every row, cuisine + open-now filters, sort modes.
drop function if exists public.businesses_in_radius(double precision, double precision, integer, public.business_category, text, boolean, integer, integer);
create or replace function public.businesses_in_radius(
  p_lat double precision, p_lng double precision, p_radius_m integer,
  p_category public.business_category default null, p_query text default null, p_with_deals boolean default false,
  p_limit integer default 60, p_offset integer default 0,
  p_cuisine text default null, p_open_now boolean default false, p_sort text default 'best'
)
returns table (
  business_id uuid, name text, slug text, category public.business_category, address text, phone text, website_url text,
  logo_url text, photo_url text, lat double precision, lng double precision, distance_m double precision,
  deal_count integer, top_deal_title text, top_deal_image text, top_deal_price numeric, instagram_handle text, is_featured boolean, last_seen_at timestamptz,
  rating numeric, review_count integer, price_level smallint, cuisines text[], primary_type text, hours jsonb, open_now boolean, photo_count integer
)
language sql stable security definer set search_path = public, extensions as $$
  with origin as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g),
  live_deals as (
    select d.business_id, count(*)::int as deal_count, max(d.last_seen_at) as last_seen_at,
      (array_agg(d.title order by (d.image_url is not null) desc, d.unit_price asc nulls last, d.last_seen_at desc))[1] as top_deal_title,
      (array_agg(d.image_url order by (d.image_url is not null) desc, d.unit_price asc nulls last, d.last_seen_at desc))[1] as top_deal_image,
      (array_agg(d.price order by (d.image_url is not null) desc, d.unit_price asc nulls last, d.last_seen_at desc))[1] as top_deal_price
    from public.deals d
    where d.status = 'approved' and (d.starts_at is null or d.starts_at <= now()) and (d.ends_at is null or d.ends_at > now())
    group by d.business_id
  ),
  ig as (
    select distinct on (s.business_id) s.business_id, s.handle
    from public.sources s where s.type = 'instagram' and s.is_active and s.handle is not null
    order by s.business_id, s.last_crawled_at desc nulls last
  ),
  rows as (
    select b.id as business_id, b.name, b.slug, b.category, b.address, b.phone, b.website_url, b.logo_url, b.photo_url,
      st_y(b.location::geometry) as lat, st_x(b.location::geometry) as lng, st_distance(b.location, o.g) as distance_m,
      coalesce(ld.deal_count, 0) as deal_count, ld.top_deal_title, ld.top_deal_image, ld.top_deal_price, ig.handle as instagram_handle,
      coalesce(b.featured_until > now(), false) as is_featured, ld.last_seen_at,
      b.rating, b.review_count, b.price_level, b.cuisines, b.primary_type, b.hours, public.is_open_now(b.hours) as open_now,
      coalesce(jsonb_array_length(b.photos), 0) as photo_count
    from public.businesses b cross join origin o
    left join live_deals ld on ld.business_id = b.id
    left join ig on ig.business_id = b.id
    where b.is_active and not b.is_aggregator and st_dwithin(b.location, o.g, p_radius_m)
      and (p_category is null or b.category = p_category)
      and (p_query is null or p_query = '' or b.name ilike '%' || p_query || '%' or b.address ilike '%' || p_query || '%'
           or exists (select 1 from unnest(b.cuisines) c where c ilike '%' || p_query || '%'))
      and (p_cuisine is null or p_cuisine = any (b.cuisines))
      and (not p_with_deals or coalesce(ld.deal_count, 0) > 0)
  )
  select r.business_id, r.name, r.slug, r.category, r.address, r.phone, r.website_url, r.logo_url, r.photo_url, r.lat, r.lng, r.distance_m,
    r.deal_count, r.top_deal_title, r.top_deal_image, r.top_deal_price, r.instagram_handle, r.is_featured, r.last_seen_at,
    r.rating, r.review_count, r.price_level, r.cuisines, r.primary_type, r.hours, r.open_now, r.photo_count
  from rows r
  where (not p_open_now or r.open_now is true)
  order by
    r.is_featured desc,
    case when p_sort = 'distance' then r.distance_m end asc,
    case when p_sort = 'rating' then coalesce(r.rating, 0) end desc,
    case when p_sort = 'rating' then coalesce(r.review_count, 0) end desc,
    case when p_sort = 'deals' then r.deal_count end desc,
    case when p_sort not in ('distance', 'rating', 'deals') then (r.deal_count > 0) end desc,
    case when p_sort not in ('distance', 'rating', 'deals') then coalesce(r.rating, 0) * ln(coalesce(r.review_count, 0) + 1) end desc,
    r.distance_m asc
  limit p_limit offset p_offset
$$;
grant execute on function public.businesses_in_radius(double precision, double precision, integer, public.business_category, text, boolean, integer, integer, text, boolean, text) to anon, authenticated;
