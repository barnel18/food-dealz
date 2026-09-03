-- Business logos/photos stored in Supabase Storage (public bucket "logos"), surfaced by the feed RPCs.
alter table public.businesses add column if not exists logo_url text;
alter table public.businesses add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','image/x-icon','image/vnd.microsoft.icon'])
on conflict (id) do update set public = true;

-- Return type changes require drop + recreate.
drop function if exists public.deals_in_radius(double precision, double precision, integer, public.business_category, text, boolean, integer, integer, integer);
create or replace function public.deals_in_radius(
  p_lat double precision, p_lng double precision, p_radius_m integer,
  p_category public.business_category default null, p_item text default null, p_today_only boolean default false,
  p_limit integer default 60, p_offset integer default 0, p_per_business integer default 3
)
returns table (
  deal_id uuid, business_id uuid, business_name text, business_slug text, business_category public.business_category, business_logo_url text,
  address text, lat double precision, lng double precision, distance_m double precision,
  title text, item_name text, canonical_item_slug text, deal_type public.deal_type,
  price numeric, regular_price numeric, percent_off numeric, quantity numeric, unit public.unit_kind, unit_price numeric,
  conditions text, starts_at timestamptz, ends_at timestamptz, days_of_week smallint[], time_window text,
  source_type public.source_type, last_seen_at timestamptz, is_featured boolean
)
language sql stable security definer set search_path = public, extensions as $$
  with origin as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g),
  live as (
    select d.id as deal_id, b.id as business_id, b.name as business_name, b.slug as business_slug, b.category as business_category, b.logo_url as business_logo_url,
      b.address, st_y(b.location::geometry) as lat, st_x(b.location::geometry) as lng, st_distance(b.location, o.g) as distance_m,
      d.title, d.item_name, d.canonical_item_slug, d.deal_type, d.price, d.regular_price, d.percent_off, d.quantity, d.unit, d.unit_price,
      d.conditions, d.starts_at, d.ends_at, d.days_of_week, d.time_window, d.source_type, d.last_seen_at,
      (d.is_featured or coalesce(b.featured_until > now(), false)) as is_featured,
      row_number() over (partition by b.id order by (d.is_featured or coalesce(b.featured_until > now(), false)) desc,
        (d.regular_price is not null and d.price is not null and d.regular_price > d.price) desc, d.unit_price asc nulls last, d.last_seen_at desc) as rn
    from public.deals d join public.businesses b on b.id = d.business_id cross join origin o
    where d.status = 'approved' and b.is_active
      and (d.starts_at is null or d.starts_at <= now()) and (d.ends_at is null or d.ends_at > now())
      and st_dwithin(b.location, o.g, p_radius_m)
      and (p_category is null or b.category = p_category)
      and (p_item is null or d.canonical_item_slug = p_item)
      and (not p_today_only or d.days_of_week is null or (extract(dow from (now() at time zone 'America/Chicago')))::smallint = any (d.days_of_week))
  )
  select l.deal_id, l.business_id, l.business_name, l.business_slug, l.business_category, l.business_logo_url,
    l.address, l.lat, l.lng, l.distance_m, l.title, l.item_name, l.canonical_item_slug, l.deal_type, l.price, l.regular_price, l.percent_off,
    l.quantity, l.unit, l.unit_price, l.conditions, l.starts_at, l.ends_at, l.days_of_week, l.time_window, l.source_type, l.last_seen_at, l.is_featured
  from live l
  where p_per_business is null or p_item is not null or l.rn <= p_per_business
  order by l.is_featured desc, l.distance_m asc, l.rn asc, l.unit_price asc nulls last
  limit p_limit offset p_offset
$$;
grant execute on function public.deals_in_radius(double precision, double precision, integer, public.business_category, text, boolean, integer, integer, integer) to anon, authenticated;

drop function if exists public.cheapest_by_item(double precision, double precision, integer, public.business_category);
create or replace function public.cheapest_by_item(p_lat double precision, p_lng double precision, p_radius_m integer, p_business_category public.business_category default null)
returns table (
  canonical_item_slug text, display_name text, category text, comparable_unit public.unit_kind,
  deal_id uuid, business_id uuid, business_name text, business_slug text, business_logo_url text, title text, price numeric, quantity numeric, unit public.unit_kind,
  unit_price numeric, distance_m double precision, ends_at timestamptz, deal_count bigint
)
language sql stable security definer set search_path = public, extensions as $$
  with origin as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g),
  live as (
    select d.id as deal_id, d.business_id, b.name as business_name, b.slug as business_slug, b.logo_url as business_logo_url, d.title, d.price, d.quantity, d.unit, d.unit_price, d.ends_at,
      d.canonical_item_slug as slug, st_distance(b.location, o.g) as distance_m
    from public.deals d join public.businesses b on b.id = d.business_id cross join origin o
    where d.status = 'approved' and d.unit_price is not null and d.canonical_item_slug is not null and b.is_active
      and (d.starts_at is null or d.starts_at <= now()) and (d.ends_at is null or d.ends_at > now())
      and st_dwithin(b.location, o.g, p_radius_m)
      and (p_business_category is null or b.category = p_business_category)
  ),
  counts as (select l.slug, count(*) as n from live l group by l.slug),
  best as (
    select distinct on (l.slug) l.slug, l.deal_id, l.business_id, l.business_name, l.business_slug, l.business_logo_url, l.title, l.price, l.quantity, l.unit, l.unit_price, l.distance_m, l.ends_at
    from live l order by l.slug, l.unit_price asc, l.distance_m asc
  )
  select ci.slug, ci.display_name, ci.category, ci.comparable_unit, x.deal_id, x.business_id, x.business_name, x.business_slug, x.business_logo_url, x.title, x.price, x.quantity, x.unit, x.unit_price, x.distance_m, x.ends_at, c.n
  from best x join public.canonical_items ci on ci.slug = x.slug join counts c on c.slug = x.slug
  order by ci.business_category, ci.sort_order
$$;
grant execute on function public.cheapest_by_item(double precision, double precision, integer, public.business_category) to anon, authenticated;
