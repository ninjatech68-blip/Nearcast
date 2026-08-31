-- ---------------------------------------------------------------
-- publish_cast guarantees the caster has a profile row.
--
-- The bug: publishing threw a foreign-key violation
-- (intents_broadcaster_id_fkey) whenever the caster had no row in
-- public.profiles, which the app surfaced as a bare "try again".
--
-- A profile is normally created client-side by profile-sync after
-- onboarding, but that is a background effect: it can lag the first
-- publish, fail silently offline, or simply never have run for an
-- account created before it existed. Publishing must not depend on
-- that ordering.
--
-- publish_cast already runs SECURITY DEFINER, so it can close the gap
-- itself: ensure the profile exists before inserting the cast. The
-- default name is derived from the auth email and is a placeholder
-- only — profile-sync still writes the real display name, and the
-- ON CONFLICT DO NOTHING here never overwrites it.
-- ---------------------------------------------------------------

create or replace function public.publish_cast(
  cast_category public.cast_category,
  cast_statement text,
  area_name text,
  cast_radius_km smallint,
  cast_expires_at timestamptz,
  area_latitude double precision default null,
  area_longitude double precision default null,
  cast_starts_at timestamptz default null,
  cast_coarse_window text default null
)
returns public.intents
language plpgsql security definer set search_path = '' as $$
declare
  caster uuid := auth.uid();
  created public.intents;
begin
  if caster is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if cast_expires_at <= now() then
    raise exception 'expiry_in_the_past' using errcode = '23514';
  end if;
  if cast_radius_km is null or cast_radius_km < 1 or cast_radius_km > 100 then
    raise exception 'radius_out_of_range' using errcode = '23514';
  end if;

  -- the caster must have a profile for the cast's foreign key to hold.
  -- normally profile-sync has already created it with the real name;
  -- this is the safety net, and it never clobbers an existing row.
  insert into public.profiles (id, display_name)
  select caster, coalesce(nullif(split_part(u.email, '@', 1), ''), 'someone')
  from auth.users u
  where u.id = caster
  on conflict (id) do nothing;

  insert into public.intents (broadcaster_id, category, statement, status, expires_at, published_at)
  values (caster, cast_category, cast_statement, 'live', cast_expires_at, now())
  returning * into created;

  insert into public.intent_context (intent_id, approximate_place, approximate_geography, starts_at, coarse_window)
  values (
    created.id,
    area_name,
    case
      when area_latitude is null or area_longitude is null then null
      else extensions.ST_SetSRID(
             extensions.ST_MakePoint(round(area_longitude::numeric, 3)::double precision,
                                     round(area_latitude::numeric, 3)::double precision),
             4326)::extensions.geography
    end,
    cast_starts_at,
    cast_coarse_window
  );

  insert into public.intent_reach (intent_id, radius_km) values (created.id, cast_radius_km);

  insert into public.intent_events (intent_id, actor_id, event_type, from_status, to_status)
  values (created.id, caster, 'intent_published', 'draft', 'live');

  return created;
end;
$$;

grant execute on function public.publish_cast(
  public.cast_category, text, text, smallint, timestamptz,
  double precision, double precision, timestamptz, text) to authenticated;
