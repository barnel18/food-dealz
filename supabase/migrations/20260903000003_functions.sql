-- Query functions (called via supabase.rpc) and job-queue helpers.

-- Live deals within a radius of a point, featured first, then nearest.
create or replace function public.deals_in_radius(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer,
  p_category public.business_category default null,
  p_item text default null,
  p_today_only boolean default false,
  p_limit integer default 60,
  p_offset integer default 0
)
returns table (
  deal_id uuid,
  business_id uuid,
  business_name text,
  business_slug text,
  business_category public.business_category,
  address text,
  lat double precision,
  lng double precision,
  distance_m double precision,
  title text,
  item_name text,
  canonical_item_slug text,
  deal_type public.deal_type,
  price numeric,
  regular_price numeric,
  percent_off numeric,
  quantity numeric,
  unit public.unit_kind,
  unit_price numeric,
  conditions text,
  starts_at timestamptz,
  ends_at timestamptz,
  days_of_week smallint[],
  time_window text,
  source_type public.source_type,
  last_seen_at timestamptz,
  is_featured boolean
)
language sql stable security definer
set search_path = public, extensions
as $$
  with origin as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g
  )
  select
    d.id,
    b.id,
    b.name,
    b.slug,
    b.category,
    b.address,
    st_y(b.location::geometry),
    st_x(b.location::geometry),
    st_distance(b.location, o.g),
    d.title,
    d.item_name,
    d.canonical_item_slug,
    d.deal_type,
    d.price,
    d.regular_price,
    d.percent_off,
    d.quantity,
    d.unit,
    d.unit_price,
    d.conditions,
    d.starts_at,
    d.ends_at,
    d.days_of_week,
    d.time_window,
    d.source_type,
    d.last_seen_at,
    (d.is_featured or coalesce(b.featured_until > now(), false))
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
  order by
    (d.is_featured or coalesce(b.featured_until > now(), false)) desc,
    st_distance(b.location, o.g) asc,
    d.unit_price asc nulls last
  limit p_limit offset p_offset
$$;

-- Cheapest live deal per canonical item within a radius (the leaderboard).
create or replace function public.cheapest_by_item(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer,
  p_business_category public.business_category default null
)
returns table (
  canonical_item_slug text,
  display_name text,
  category text,
  comparable_unit public.unit_kind,
  deal_id uuid,
  business_id uuid,
  business_name text,
  business_slug text,
  title text,
  price numeric,
  quantity numeric,
  unit public.unit_kind,
  unit_price numeric,
  distance_m double precision,
  ends_at timestamptz,
  deal_count bigint
)
language sql stable security definer
set search_path = public, extensions
as $$
  with origin as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g
  ),
  live as (
    select
      d.id as deal_id,
      d.business_id,
      b.name as business_name,
      b.slug as business_slug,
      d.title,
      d.price,
      d.quantity,
      d.unit,
      d.unit_price,
      d.ends_at,
      d.canonical_item_slug as slug,
      st_distance(b.location, o.g) as distance_m
    from public.deals d
    join public.businesses b on b.id = d.business_id
    cross join origin o
    where d.status = 'approved'
      and d.unit_price is not null
      and d.canonical_item_slug is not null
      and b.is_active
      and (d.starts_at is null or d.starts_at <= now())
      and (d.ends_at is null or d.ends_at > now())
      and st_dwithin(b.location, o.g, p_radius_m)
      and (p_business_category is null or b.category = p_business_category)
  ),
  counts as (
    select l.slug, count(*) as n from live l group by l.slug
  ),
  best as (
    select distinct on (l.slug)
      l.slug, l.deal_id, l.business_id, l.business_name, l.business_slug, l.title,
      l.price, l.quantity, l.unit, l.unit_price, l.distance_m, l.ends_at
    from live l
    order by l.slug, l.unit_price asc, l.distance_m asc
  )
  select
    ci.slug,
    ci.display_name,
    ci.category,
    ci.comparable_unit,
    x.deal_id,
    x.business_id,
    x.business_name,
    x.business_slug,
    x.title,
    x.price,
    x.quantity,
    x.unit,
    x.unit_price,
    x.distance_m,
    x.ends_at,
    c.n
  from best x
  join public.canonical_items ci on ci.slug = x.slug
  join counts c on c.slug = x.slug
  order by ci.business_category, ci.sort_order
$$;

grant execute on function public.deals_in_radius(double precision, double precision, integer, public.business_category, text, boolean, integer, integer)
  to anon, authenticated;
grant execute on function public.cheapest_by_item(double precision, double precision, integer, public.business_category)
  to anon, authenticated;

-- Job queue --------------------------------------------------------------
create or replace function public.enqueue_job(
  p_type text,
  p_payload jsonb default '{}',
  p_run_at timestamptz default now(),
  p_max_attempts integer default 3
)
returns bigint language sql volatile security definer set search_path = public as $$
  insert into public.jobs (type, payload, run_at, max_attempts)
  values (p_type, coalesce(p_payload, '{}'::jsonb), coalesce(p_run_at, now()), p_max_attempts)
  returning id
$$;

-- Atomically claim up to p_limit due jobs (FOR UPDATE SKIP LOCKED).
create or replace function public.claim_jobs(p_limit integer default 5)
returns setof public.jobs language sql volatile security definer set search_path = public as $$
  with picked as (
    select j.id
    from public.jobs j
    where j.status = 'queued' and j.run_at <= now()
    order by j.run_at
    for update skip locked
    limit p_limit
  )
  update public.jobs j
  set status = 'running', locked_at = now(), attempts = j.attempts + 1
  from picked
  where j.id = picked.id
  returning j.*
$$;

-- Mark a job done, or schedule a retry with exponential backoff / fail it.
create or replace function public.complete_job(p_id bigint, p_ok boolean, p_error text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  j public.jobs;
begin
  select * into j from public.jobs where id = p_id for update;
  if not found then return; end if;
  if p_ok then
    update public.jobs set status = 'done', finished_at = now(), locked_at = null, last_error = null where id = p_id;
  elsif j.attempts >= j.max_attempts then
    update public.jobs set status = 'failed', finished_at = now(), locked_at = null, last_error = p_error where id = p_id;
  else
    update public.jobs
    set status = 'queued', locked_at = null, last_error = p_error,
        run_at = now() + (power(2, j.attempts) * interval '1 minute')
    where id = p_id;
  end if;
end $$;

-- Requeue jobs whose worker died mid-run.
create or replace function public.requeue_stale_jobs(p_timeout interval default interval '15 minutes')
returns integer language plpgsql volatile security definer set search_path = public as $$
declare
  n integer;
begin
  with stale as (
    update public.jobs
    set status = case when attempts >= max_attempts then 'failed'::public.job_status else 'queued'::public.job_status end,
        locked_at = null,
        last_error = coalesce(last_error, 'requeued: worker timeout')
    where status = 'running' and locked_at < now() - p_timeout
    returning 1
  )
  select count(*) into n from stale;
  return n;
end $$;

-- Queue functions are for the worker (service role) only.
revoke all on function public.enqueue_job(text, jsonb, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.claim_jobs(integer) from public, anon, authenticated;
revoke all on function public.complete_job(bigint, boolean, text) from public, anon, authenticated;
revoke all on function public.requeue_stale_jobs(interval) from public, anon, authenticated;
