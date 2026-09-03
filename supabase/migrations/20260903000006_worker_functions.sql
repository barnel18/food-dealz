-- Scheduling, expiry, and maintenance helpers called by the worker (service role) and admin UI.
create index if not exists jobs_type_status on public.jobs (type, status);
create index if not exists deals_source_capture on public.deals (source_capture_id);

-- Queue a crawl for every active source that is due and has no crawl already queued/running.
create or replace function public.enqueue_due_crawls()
returns integer language plpgsql volatile security definer set search_path = public as $$
declare n integer;
begin
  with due as (
    select s.id
    from public.sources s
    join public.businesses b on b.id = s.business_id and b.is_active
    where s.is_active
      and (s.last_crawled_at is null or s.last_crawled_at < now() - make_interval(hours => s.crawl_interval_hours))
      and not exists (
        select 1 from public.jobs j
        where j.type = 'crawl_source' and j.status in ('queued', 'running')
          and (j.payload ->> 'source_id') = s.id::text
      )
  ), ins as (
    insert into public.jobs (type, payload)
    select 'crawl_source', jsonb_build_object('source_id', d.id) from due d
    returning 1
  )
  select count(*) into n from ins;
  return n;
end $$;

-- Queue extraction for captures still pending that have no extract job.
create or replace function public.enqueue_pending_extractions()
returns integer language plpgsql volatile security definer set search_path = public as $$
declare n integer;
begin
  with pend as (
    select c.id from public.raw_captures c
    where c.extraction_status = 'pending'
      and not exists (
        select 1 from public.jobs j
        where j.type = 'extract_capture' and j.status in ('queued', 'running')
          and (j.payload ->> 'capture_id') = c.id::text
      )
    limit 500
  ), ins as (
    insert into public.jobs (type, payload)
    select 'extract_capture', jsonb_build_object('capture_id', p.id) from pend p
    returning 1
  )
  select count(*) into n from ins;
  return n;
end $$;

-- Expire stale deals and apply user reports. Returns counts.
create or replace function public.run_expire_sweep()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  n_ended integer; n_ttl integer; n_reported integer; n_refreshed integer;
begin
  -- 1. Past their stated end.
  with u as (
    update public.deals set status = 'expired'
    where status = 'approved' and ends_at is not null and ends_at < now()
    returning 1)
  select count(*) into n_ended from u;

  -- 2. No stated end: per-source time-to-live, refreshed whenever the deal is seen again.
  with u as (
    update public.deals d set status = 'expired'
    where d.status = 'approved' and d.ends_at is null and (
         (d.source_type = 'instagram' and d.days_of_week is null
            and coalesce((select c.posted_at from public.raw_captures c where c.id = d.source_capture_id), d.first_seen_at) < now() - interval '10 days')
      or (d.source_type = 'instagram' and d.days_of_week is not null and d.last_seen_at < now() - interval '45 days')
      or (d.source_type in ('website', 'facebook', 'google_posts') and d.last_seen_at < now() - interval '45 days')
      or (d.source_type in ('kroger_api', 'flipp') and d.last_seen_at < now() - interval '4 days')
      or (d.source_type in ('manual', 'business_portal') and d.last_seen_at < now() - interval '120 days')
    )
    returning 1)
  select count(*) into n_ttl from u;

  -- 3. Two distinct "expired"/"wrong price" reports in 7 days retire a deal; "still valid" refreshes it.
  with reported as (
    select r.deal_id
    from public.deal_reports r
    where r.reason in ('expired', 'not_a_deal') and r.created_at > now() - interval '7 days'
    group by r.deal_id
    having count(distinct coalesce(r.user_id::text, r.session_id, r.id::text)) >= 2
  ), u as (
    update public.deals d set status = 'expired'
    from reported x where d.id = x.deal_id and d.status = 'approved'
    returning 1)
  select count(*) into n_reported from u;

  with fresh as (
    select distinct r.deal_id from public.deal_reports r
    where r.reason = 'still_valid' and r.created_at > now() - interval '1 day'
  ), u as (
    update public.deals d set last_seen_at = now()
    from fresh f where d.id = f.deal_id and d.status = 'approved'
    returning 1)
  select count(*) into n_refreshed from u;

  return jsonb_build_object('ended', n_ended, 'ttl', n_ttl, 'reported', n_reported, 'refreshed', n_refreshed);
end $$;

-- Admin: put failed jobs back in the queue.
create or replace function public.retry_failed_jobs(p_ids bigint[] default null)
returns integer language plpgsql volatile security definer set search_path = public as $$
declare n integer;
begin
  with u as (
    update public.jobs set status = 'queued', attempts = 0, run_at = now(), locked_at = null, last_error = null
    where status = 'failed' and (p_ids is null or id = any(p_ids))
    returning 1)
  select count(*) into n from u;
  return n;
end $$;

revoke all on function public.enqueue_due_crawls() from public, anon, authenticated;
revoke all on function public.enqueue_pending_extractions() from public, anon, authenticated;
revoke all on function public.run_expire_sweep() from public, anon, authenticated;
revoke all on function public.retry_failed_jobs(bigint[]) from public, anon, authenticated;
