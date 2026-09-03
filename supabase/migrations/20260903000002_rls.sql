-- Row level security. The worker and admin scripts use the service role (bypasses RLS).
-- Admin pages can use the user's own session: is_admin() unlocks everything below.

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.sources enable row level security;
alter table public.raw_captures enable row level security;
alter table public.canonical_items enable row level security;
alter table public.deals enable row level security;
alter table public.deal_reports enable row level security;
alter table public.saved_deals enable row level security;
alter table public.deal_clicks enable row level security;
alter table public.business_claims enable row level security;
alter table public.jobs enable row level security;

-- profiles
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- businesses
create policy businesses_read on public.businesses for select to anon, authenticated
  using (is_active or claimed_by = auth.uid() or public.is_admin());
create policy businesses_admin on public.businesses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- canonical_items
create policy canonical_items_read on public.canonical_items for select to anon, authenticated using (true);
create policy canonical_items_admin on public.canonical_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- deals: public sees approved; owners see their own business's deals; admins see all
create policy deals_read on public.deals for select to anon, authenticated
  using (
    status = 'approved'
    or public.is_admin()
    or exists (select 1 from public.businesses b where b.id = deals.business_id and b.claimed_by = auth.uid())
  );
create policy deals_admin on public.deals for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- deal_reports: anyone can file; admins read/update
create policy deal_reports_insert on public.deal_reports for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
create policy deal_reports_admin_read on public.deal_reports for select to authenticated using (public.is_admin());
create policy deal_reports_admin_update on public.deal_reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- saved_deals: own rows only
create policy saved_deals_own on public.saved_deals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- deal_clicks: anyone can log; business owners and admins can read
create policy deal_clicks_insert on public.deal_clicks for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
create policy deal_clicks_read on public.deal_clicks for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.businesses b where b.id = deal_clicks.business_id and b.claimed_by = auth.uid())
  );

-- business_claims
create policy business_claims_read on public.business_claims for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy business_claims_insert on public.business_claims for insert to authenticated
  with check (user_id = auth.uid());
create policy business_claims_admin_update on public.business_claims for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- sources / raw_captures / jobs: admins (and owners read their sources); no anon access
create policy sources_read on public.sources for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.businesses b where b.id = sources.business_id and b.claimed_by = auth.uid())
  );
create policy sources_admin on public.sources for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy raw_captures_admin on public.raw_captures for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy jobs_admin on public.jobs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
