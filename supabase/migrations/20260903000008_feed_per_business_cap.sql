-- Feed query v2: cap rows per business so a grocery store with 140 sale prices doesn't
-- drown the feed. p_per_business = null means no cap (used on business pages / item pages).
drop function if exists public.deals_in_radius(double precision, double precision, integer, public.business_category, text, boolean, integer, integer);

create or replace function public.deals_in_radius(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer,
  p_category public.business_category default null,
  p_item text default null,
  p_today_only boolean default false,
  p_limit integer default 60,
  p_offset integer default 0,
  p_per_business integer default 3
)
returns table (
  deal_id uuid, business_id uuid, business_name text, business_slug text, business_category public.business_category,
  address text, lat double precision, lng double precision, distance_m double precision,
  title text, item_name text, canonical_item_slug text, deal_type public.deal_type,
  price numeric, regular_price numeric, percent_off numeric, quantity numeric, unit public.unit_kind, unit_price numeric,
  conditions text, starts_at timestamptz, ends_at timestamptz, days_of_week smallint[], time_window text,
  source_type public.source_type, last_seen_at timestamptz, is_featured boolean
)
language sql stable security definer
set search_path = public, extensions
as $$
  with origin as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g
  ),
  live as (
    select
      d.id as deal_id, b.id as business_id, b.name as business_name, b.slug as business_slug, b.category as business_category,
      b.address, st_y(b.location::geometry) as lat, st_x(b.location::geometry) as lng,
      st_distance(b.location, o.g) as distance_m,
      d.title, d.item_name, d.canonical_item_slug, d.deal_type, d.price, d.regular_price, d.percent_off, d.quantity, d.unit, d.unit_price,
      d.conditions, d.starts_at, d.ends_at, d.days_of_week, d.time_window, d.source_type, d.last_seen_at,
      (d.is_featured or coalesce(b.featured_until > now(), false)) as is_featured,
      row_number() over (
        partition by b.id
        order by (d.is_featured or coalesce(b.featured_until > now(), false)) desc,
                 (d.regular_price is not null and d.price is not null and d.regular_price > d.price) desc,
                 d.unit_price asc nulls last, d.last_seen_at desc
      ) as rn
    from public.deals d
    join public.businesses b on b.id = d.business_id
    cross join origin o
    where d.status = 'approved'
      and b.is_active
      and (d.starts_at is null or d.starts_at <= now())
      and (d.ends_at is null or d.ends_at > now())
      and st_dwithin(b.location, o.g, p_radius_m)
      and (p_category is null or b.category = p_category)
      and (p_item is null or d.canonical_item_slug = p_item)
      and (
        not p_today_only
        or d.days_of_week is null
        or (extract(dow from (now() at time zone 'America/Chicago')))::smallint = any (d.days_of_week)
      )
  )
  select
    l.deal_id, l.business_id, l.business_name, l.business_slug, l.business_category,
    l.address, l.lat, l.lng, l.distance_m,
    l.title, l.item_name, l.canonical_item_slug, l.deal_type, l.price, l.regular_price, l.percent_off, l.quantity, l.unit, l.unit_price,
    l.conditions, l.starts_at, l.ends_at, l.days_of_week, l.time_window, l.source_type, l.last_seen_at, l.is_featured
  from live l
  where p_per_business is null or p_item is not null or l.rn <= p_per_business
  order by l.is_featured desc, l.distance_m asc, l.rn asc, l.unit_price asc nulls last
  limit p_limit offset p_offset
$$;

grant execute on function public.deals_in_radius(double precision, double precision, integer, public.business_category, text, boolean, integer, integer, integer)
  to anon, authenticated;
