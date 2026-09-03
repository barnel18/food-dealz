-- Admin utility: fold a duplicate business row into the one we keep (moves deals, captures, sources, reviews, clicks;
-- fills missing enrichment fields from the duplicate; deletes the duplicate). Service-role only.
create or replace function public.merge_business(p_keep uuid, p_drop uuid)
returns void language plpgsql security definer set search_path = public as $$
declare k public.businesses%rowtype; d public.businesses%rowtype;
begin
  if p_keep = p_drop then raise exception 'keep and drop are the same row'; end if;
  select * into k from public.businesses where id = p_keep; if not found then raise exception 'keep % not found', p_keep; end if;
  select * into d from public.businesses where id = p_drop; if not found then raise exception 'drop % not found', p_drop; end if;
  -- Free the unique ids before copying them over.
  update public.businesses set google_place_id = null, osm_id = null where id = p_drop;
  update public.businesses set
    google_place_id = coalesce(k.google_place_id, d.google_place_id),
    rating = coalesce(k.rating, d.rating), review_count = coalesce(k.review_count, d.review_count), price_level = coalesce(k.price_level, d.price_level),
    cuisines = case when cardinality(k.cuisines) > 0 then k.cuisines else d.cuisines end,
    google_types = case when cardinality(k.google_types) > 0 then k.google_types else d.google_types end,
    primary_type = coalesce(k.primary_type, d.primary_type), hours = coalesce(k.hours, d.hours),
    photos = case when jsonb_array_length(k.photos) > 0 then k.photos else d.photos end,
    editorial_summary = coalesce(k.editorial_summary, d.editorial_summary), google_maps_uri = coalesce(k.google_maps_uri, d.google_maps_uri),
    google_synced_at = coalesce(k.google_synced_at, d.google_synced_at),
    photo_url = coalesce(k.photo_url, d.photo_url), logo_url = coalesce(k.logo_url, d.logo_url),
    phone = coalesce(k.phone, d.phone), website_url = coalesce(k.website_url, d.website_url), address = coalesce(k.address, d.address),
    postal_code = coalesce(k.postal_code, d.postal_code), osm_id = coalesce(k.osm_id, d.osm_id), brand = coalesce(k.brand, d.brand),
    chain_key = coalesce(k.chain_key, d.chain_key)
  where id = p_keep;
  update public.deals set business_id = p_keep where business_id = p_drop;
  update public.raw_captures set business_id = p_keep where business_id = p_drop;
  update public.deal_clicks set business_id = p_keep where business_id = p_drop;
  update public.business_claims set business_id = p_keep where business_id = p_drop;
  -- Sources: move unless the kept row already has the same one.
  update public.sources s set business_id = p_keep where s.business_id = p_drop
    and not exists (select 1 from public.sources t where t.business_id = p_keep and t.type = s.type and coalesce(t.url, t.handle, t.external_id) = coalesce(s.url, s.handle, s.external_id));
  delete from public.sources where business_id = p_drop;
  update public.business_reviews r set business_id = p_keep where r.business_id = p_drop
    and not exists (select 1 from public.business_reviews t where t.business_id = p_keep and t.source = r.source and t.external_id = r.external_id);
  delete from public.business_reviews where business_id = p_drop;
  delete from public.businesses where id = p_drop;
end $$;
revoke all on function public.merge_business(uuid, uuid) from public, anon, authenticated;
