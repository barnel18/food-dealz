-- PostgREST computed columns so clients can `select('*, lat, lng')` on businesses
-- without dealing with the raw geography type.
create or replace function public.lat(b public.businesses)
returns double precision language sql stable
set search_path = public, extensions
as $$ select st_y(b.location::geometry) $$;

create or replace function public.lng(b public.businesses)
returns double precision language sql stable
set search_path = public, extensions
as $$ select st_x(b.location::geometry) $$;

grant execute on function public.lat(public.businesses) to anon, authenticated;
grant execute on function public.lng(public.businesses) to anon, authenticated;
