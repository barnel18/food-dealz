-- Food Dealz core schema
-- Extensions live in the `extensions` schema on Supabase.
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Enums ------------------------------------------------------------------
create type public.business_category as enum ('restaurant', 'grocery');
create type public.source_type as enum (
  'website', 'instagram', 'facebook', 'google_posts', 'kroger_api', 'flipp', 'manual', 'business_portal'
);
create type public.deal_type as enum ('fixed_price', 'percent_off', 'amount_off', 'bogo', 'bundle', 'free_item');
create type public.deal_status as enum ('pending', 'approved', 'rejected', 'expired');
create type public.unit_kind as enum ('each', 'slice', 'lb', 'oz', 'kg', 'g', 'dozen', 'pack', 'gallon', 'liter', 'fl_oz');
create type public.report_reason as enum ('still_valid', 'expired', 'wrong_price', 'not_a_deal', 'other');
create type public.claim_status as enum ('pending', 'approved', 'rejected');
create type public.extraction_status as enum ('pending', 'done', 'failed', 'skipped');
create type public.job_status as enum ('queued', 'running', 'done', 'failed');

-- Helpers ----------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Profiles (1:1 with auth.users) ----------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'business', 'admin')),
  display_name text,
  home_lat double precision,
  home_lng double precision,
  radius_km numeric(5,1) not null default 5,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- True when the current JWT belongs to an admin profile.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
$$;

-- Prevent users from promoting themselves. Admins, service role, and direct postgres sessions may change roles.
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and not (public.is_admin() or auth.role() = 'service_role' or current_user = 'postgres') then
    raise exception 'not allowed to change role';
  end if;
  return new;
end $$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Businesses -------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category public.business_category not null,
  chain_key text,                                   -- e.g. 'kroger', 'aldi', 'hyvee'; null = independent
  is_aggregator boolean not null default false,     -- pseudo-business for local deal-aggregator accounts
  address text,
  city text,
  state text,
  postal_code text,
  location extensions.geography(Point, 4326) not null,
  phone text,
  website_url text,
  google_place_id text unique,
  hours jsonb,
  claimed_by uuid references auth.users(id) on delete set null,
  featured_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index businesses_location_gix on public.businesses using gist (location);
create index businesses_name_trgm on public.businesses using gin (name extensions.gin_trgm_ops);
create index businesses_claimed_by on public.businesses (claimed_by) where claimed_by is not null;
create trigger businesses_set_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

-- Sources (where we look for deals per business) -------------------------
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  type public.source_type not null,
  url text,
  handle text,
  external_id text,                                 -- Kroger locationId, Flipp merchant id, etc.
  crawl_interval_hours integer not null default 24,
  last_crawled_at timestamptz,
  last_changed_at timestamptz,
  consecutive_failures integer not null default 0,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
create unique index sources_uniq on public.sources (business_id, type, coalesce(url, handle, external_id));
create index sources_due on public.sources (last_crawled_at) where is_active;

-- Raw captures (one row per scraped post/page/listing, deduped by hash) --
create table public.raw_captures (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  external_id text,
  content_hash text not null,
  content_text text,
  image_urls text[] not null default '{}',
  payload jsonb not null default '{}',
  posted_at timestamptz,
  captured_at timestamptz not null default now(),
  extraction_status public.extraction_status not null default 'pending',
  extraction_error text,
  extraction_model text,
  extraction_tokens integer,
  unique (source_id, content_hash)
);
create index raw_captures_pending on public.raw_captures (captured_at) where extraction_status = 'pending';
create index raw_captures_business on public.raw_captures (business_id, captured_at desc);

-- Canonical item taxonomy (seeded from src/lib/taxonomy/canonical-items.ts)
create table public.canonical_items (
  slug text primary key,
  display_name text not null,
  category text not null,
  business_category public.business_category not null,
  comparable_unit public.unit_kind not null,
  aliases text[] not null default '{}',
  sort_order integer not null default 0
);

-- Deals ------------------------------------------------------------------
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_capture_id uuid references public.raw_captures(id) on delete set null,
  source_type public.source_type not null,
  title text not null,
  item_name text not null,
  canonical_item_slug text references public.canonical_items(slug),
  deal_type public.deal_type not null,
  price numeric(10,2),
  regular_price numeric(10,2),
  percent_off numeric(5,2),
  quantity numeric(10,3) not null default 1,
  unit public.unit_kind not null default 'each',
  unit_price numeric(10,4),                         -- per canonical comparable_unit; null when not computable
  conditions text,
  starts_at timestamptz,
  ends_at timestamptz,
  days_of_week smallint[],                          -- 0=Sun..6=Sat; null = every day
  time_window text,
  extraction_confidence numeric(3,2),
  evidence_quote text,
  status public.deal_status not null default 'pending',
  is_featured boolean not null default false,
  dedupe_key text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deals_live on public.deals (canonical_item_slug, unit_price) where status = 'approved';
create index deals_status_ends on public.deals (status, ends_at);
create index deals_business on public.deals (business_id, status);
create index deals_dedupe on public.deals (dedupe_key);
create index deals_pending_review on public.deals (extraction_confidence desc) where status = 'pending';
create trigger deals_set_updated_at before update on public.deals
  for each row execute function public.set_updated_at();

-- User interactions ------------------------------------------------------
create table public.deal_reports (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  reason public.report_reason not null,
  note text,
  created_at timestamptz not null default now()
);
create index deal_reports_deal on public.deal_reports (deal_id, created_at desc);

create table public.saved_deals (
  user_id uuid not null references auth.users(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, deal_id)
);

create table public.deal_clicks (
  id bigint generated always as identity primary key,
  deal_id uuid not null references public.deals(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null check (kind in ('view', 'site', 'maps', 'save', 'phone')),
  user_id uuid,
  session_id text,
  created_at timestamptz not null default now()
);
create index deal_clicks_biz_time on public.deal_clicks (business_id, created_at);
create index deal_clicks_deal_time on public.deal_clicks (deal_id, created_at);

-- Business claims --------------------------------------------------------
create table public.business_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_email text not null,
  contact_phone text,
  evidence text,
  status public.claim_status not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index business_claims_pending on public.business_claims (created_at) where status = 'pending';

-- Job queue (worker polls this) -----------------------------------------
create table public.jobs (
  id bigint generated always as identity primary key,
  type text not null,
  payload jsonb not null default '{}',
  run_at timestamptz not null default now(),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  status public.job_status not null default 'queued',
  locked_at timestamptz,
  finished_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index jobs_ready on public.jobs (run_at) where status = 'queued';
create index jobs_running on public.jobs (locked_at) where status = 'running';
