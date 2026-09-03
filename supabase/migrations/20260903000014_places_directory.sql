-- Places directory: businesses near a point with live deal counts + Instagram handle, business profile (posts, sources),
-- business photo on feed rows, and a public "media" bucket for mirrored Instagram images.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = true;

-- 1. deals_in_radius gains business_photo_url (return type change → drop + recreate).
drop function if exists public.deals_in_radius(double precision, double precision, integer, public.business_category, text, boolean, integer, integer, integer, text, text[]);
create or replace function public.deals_in_radius(
  p_lat double precision, p_lng double precision, p_radius_m integer,
  p_category public.business_category default null, p_item text default null, p_today_only boolean default false,
  p_limit integer default 60, p_offset integer default 0, p_per_business integer default 3,
  p_query text default null, p_slugs text[] default null
)
returns table (
  deal_id uuid, business_id uuid, business_name text, business_slug text, business_category public.business_category, business_logo_url text,
  address text, lat double precision, lng double precision, distance_m double precision,
  title text, item_name text, canonical_item_slug text, deal_type public.deal_type,
  price numeric, regular_price numeric, percent_off numeric, quantity numeric, unit public.unit_kind, unit_price numeric,
  conditions text, starts_at timestamptz, ends_at timestamptz, days_of_week smallint[], time_window text,
  source_type public.source_type, last_seen_at timestamptz, is_featured boolean, image_url text, business_photo_url text
)
language sql stable security definer set search_path = public, extensions as $$
  with origin as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g),
  live as (
    select d.id as deal_id, b.id as business_id, b.name as business_name, b.slug as business_slug, b.category as business_category, b.logo_url as business_logo_url,
      b.address, st_y(b.location::geometry) as lat, st_x(b.location::geometry) as lng, st_distance(b.location, o.g) as distance_m,
      d.title, d.item_name, d.canonical_item_slug, d.deal_type, d.price, d.regular_price, d.percent_off, d.quantity, d.unit, d.unit_price,
      d.conditions, d.starts_at, d.ends_at, d.days_of_week, d.time_window, d.source_type, d.last_seen_at,
      (d.is_featured or coalesce(b.featured_until > now(), false)) as is_featured, d.image_url, b.photo_url as business_photo_url,
      row_number() over (partition by b.id order by (d.is_featured or coalesce(b.featured_until > now(), false)) desc,
        (d.image_url is not null) desc,
        (d.regular_price is not null and d.price is not null and d.regular_price > d.price) desc, d.unit_price asc nulls last, d.last_seen_at desc) as rn
    from public.deals d join public.businesses b on b.id = d.business_id cross join origin o
    where d.status = 'approved' and b.is_active
      and (d.starts_at is null or d.starts_at <= now()) and (d.ends_at is null or d.ends_at > now())
      and st_dwithin(b.location, o.g, p_radius_m)
      and (p_category is null or b.category = p_category)
      and (p_item is null or d.canonical_item_slug = p_item)
      and (p_query is null or p_query = ''
           or d.title ilike '%' || p_query || '%' or d.item_name ilike '%' || p_query || '%' or b.name ilike '%' || p_query || '%'
           or (p_slugs is not null and d.canonical_item_slug = any (p_slugs)))
      and (not p_today_only or d.days_of_week is null or (extract(dow from (now() at time zone 'America/Chicago')))::smallint = any (d.days_of_week))
  )
  select l.deal_id, l.business_id, l.business_name, l.business_slug, l.business_category, l.business_logo_url,
    l.address, l.lat, l.lng, l.distance_m, l.title, l.item_name, l.canonical_item_slug, l.deal_type, l.price, l.regular_price, l.percent_off,
    l.quantity, l.unit, l.unit_price, l.conditions, l.starts_at, l.ends_at, l.days_of_week, l.time_window, l.source_type, l.last_seen_at, l.is_featured, l.image_url, l.business_photo_url
  from live l
  where p_per_business is null or p_item is not null or (p_query is not null and p_query <> '') or l.rn <= p_per_business
  order by l.is_featured desc, l.distance_m asc, l.rn asc, l.unit_price asc nulls last
  limit p_limit offset p_offset
$$;
grant execute on function public.deals_in_radius(double precision, double precision, integer, public.business_category, text, boolean, integer, integer, integer, text, text[]) to anon, authenticated;

-- 2. Directory of places near a point. Businesses with live deals sort first, then by distance.
create or replace function public.businesses_in_radius(
  p_lat double precision, p_lng double precision, p_radius_m integer,
  p_category public.business_category default null, p_query text default null, p_with_deals boolean default false,
  p_limit integer default 60, p_offset integer default 0
)
returns table (
  business_id uuid, name text, slug text, category public.business_category, address text, phone text, website_url text,
  logo_url text, photo_url text, lat double precision, lng double precision, distance_m double precision,
  deal_count integer, top_deal_title text, top_deal_image text, top_deal_price numeric, instagram_handle text, is_featured boolean, last_seen_at timestamptz
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
  )
  select b.id, b.name, b.slug, b.category, b.address, b.phone, b.website_url, b.logo_url, b.photo_url,
    st_y(b.location::geometry), st_x(b.location::geometry), st_distance(b.location, o.g),
    coalesce(ld.deal_count, 0), ld.top_deal_title, ld.top_deal_image, ld.top_deal_price, ig.handle,
    coalesce(b.featured_until > now(), false), ld.last_seen_at
  from public.businesses b cross join origin o
  left join live_deals ld on ld.business_id = b.id
  left join ig on ig.business_id = b.id
  where b.is_active and not b.is_aggregator and st_dwithin(b.location, o.g, p_radius_m)
    and (p_category is null or b.category = p_category)
    and (p_query is null or p_query = '' or b.name ilike '%' || p_query || '%' or b.address ilike '%' || p_query || '%')
    and (not p_with_deals or coalesce(ld.deal_count, 0) > 0)
  order by coalesce(b.featured_until > now(), false) desc, (coalesce(ld.deal_count, 0) > 0) desc, st_distance(b.location, o.g) asc
  limit p_limit offset p_offset
$$;
grant execute on function public.businesses_in_radius(double precision, double precision, integer, public.business_category, text, boolean, integer, integer) to anon, authenticated;

-- 3. Business profile extras the browser cannot read directly (sources are RLS-hidden): Instagram handle, which
--    source types feed this listing, when it was last checked, and its latest Instagram posts with images.
create or replace function public.business_profile(p_slug text)
returns table (business_id uuid, instagram_handle text, source_types text[], last_checked_at timestamptz, posts jsonb)
language sql stable security definer set search_path = public as $$
  select b.id,
    (select s.handle from public.sources s where s.business_id = b.id and s.type = 'instagram' and s.is_active and s.handle is not null
      order by s.last_crawled_at desc nulls last limit 1),
    (select array_agg(distinct s.type::text) from public.sources s where s.business_id = b.id and s.is_active),
    (select max(s.last_crawled_at) from public.sources s where s.business_id = b.id),
    (select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'image', coalesce(c.payload->>'mirrored_image_url', c.image_urls[1]),
        'caption', left(coalesce(c.content_text, ''), 220),
        'posted_at', c.posted_at,
        'url', c.payload->>'source_url'
      ) order by c.posted_at desc nulls last), '[]'::jsonb)
     from (
       select c.* from public.raw_captures c join public.sources s on s.id = c.source_id
       where s.business_id = b.id and s.type = 'instagram' and c.image_urls is not null and array_length(c.image_urls, 1) > 0
       order by c.posted_at desc nulls last limit 6
     ) c)
  from public.businesses b
  where b.slug = p_slug and b.is_active
$$;
grant execute on function public.business_profile(text) to anon, authenticated;
