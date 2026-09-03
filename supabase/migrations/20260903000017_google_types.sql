-- Keep Google's raw place types so cuisine chips can be re-derived from code without re-fetching (and re-paying).
alter table public.businesses add column if not exists google_types text[] not null default '{}';
