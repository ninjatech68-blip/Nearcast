-- ===============================================================
-- Read your OWN profile back: name, areas (with points), interests.
-- ===============================================================
--
-- Onboarding is a one-time setup, but "done" was only ever a flag on
-- the device. A returning user on a new phone was shown the whole flow
-- again. To route them straight to the feed instead, sign-in reads
-- their existing profile and, if it is complete, restores it locally.
--
-- profiles / profile_areas / profile_interests are already owner-
-- readable under RLS, but the area CENTROID is a geography and the
-- device needs plain lat/lng to keep delivery measuring distance. This
-- returns it decomposed, for the caller only (auth.uid()), so a
-- restored profile carries its points and the next sync does not wipe
-- them.
-- ===============================================================

create or replace function public.my_profile_areas()
returns table (name text, latitude double precision, longitude double precision)
language sql security definer set search_path = '' as $$
  select
    a.name,
    case when a.centroid is null then null else extensions.ST_Y(a.centroid::extensions.geometry) end,
    case when a.centroid is null then null else extensions.ST_X(a.centroid::extensions.geometry) end
  from public.profile_areas a
  where a.profile_id = auth.uid()
  order by a.created_at asc;
$$;
grant execute on function public.my_profile_areas() to authenticated;
