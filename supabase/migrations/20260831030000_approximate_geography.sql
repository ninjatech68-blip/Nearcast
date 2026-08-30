-- Approximate geography for discovery.
--
-- Discovery needs somewhere to measure from, and profiles carried only a city
-- name. This adds an approximate home point, deliberately approximate: it is
-- what a person is willing to be found near, not where they live. Exact
-- coordinates stay in `intent_private.exact_geography` and never enter a
-- discovery result.
--
-- Distance is reported as a coarse band rather than a number. A metre value is
-- a coordinate in disguise: repeated readings from different intents would
-- trilaterate a home address, which is exactly what the approximate point is
-- meant to prevent.

alter table public.profiles
  add column approximate_home extensions.geography(point, 4326);

create index profiles_approximate_home_idx
  on public.profiles using gist (approximate_home);

create or replace function public.distance_band(meters double precision)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when meters is null then 'unknown'
    when meters < 1000 then 'walking_distance'
    when meters < 3000 then 'nearby'
    when meters < 10000 then 'short_trip'
    else 'further_out'
  end;
$$;

-- Discovery candidates.
--
-- Eligibility is applied before anything else, in the order the plan sets out:
-- lifecycle, reach, time, geography, blocks, restriction. Ranking is a separate
-- concern and deliberately not done here.
--
-- The result carries a band and never a coordinate, a distance in metres, an
-- exact address or a private contact. A caller cannot ask for what is not in
-- the return type.

create or replace function public.discover_intents(
  max_distance_meters double precision default 10000
)
returns table (
  intent_id uuid,
  primitive public.intent_primitive,
  statement text,
  response_action text,
  expires_at timestamptz,
  approximate_place text,
  distance_band text,
  broadcaster_first_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.id,
    i.primitive,
    i.statement,
    i.response_action,
    i.expires_at,
    c.approximate_place,
    public.distance_band(
      extensions.st_distance(c.approximate_geography, viewer.approximate_home)
    ),
    split_part(p.display_name, ' ', 1)
  from public.intents i
  join public.intent_context c on c.intent_id = i.id
  join public.intent_reach r on r.intent_id = i.id
  join public.profiles p on p.id = i.broadcaster_id
  cross join (
    select approximate_home, id from public.profiles where id = auth.uid()
  ) as viewer
  where
    -- Lifecycle
    i.status = 'live'
    -- Time
    and i.expires_at > now()
    -- Never your own intent
    and i.broadcaster_id <> viewer.id
    -- Reach: origin-only intents are not discoverable at all
    and r.level <> 'origin_only'
    -- Restriction, on either side
    and not p.is_restricted
    and not exists (
      select 1 from public.profiles me where me.id = viewer.id and me.is_restricted
    )
    -- Blocks, in either direction
    and not private.is_blocked(i.broadcaster_id, viewer.id)
    -- Geography: an intent with no approximate point, or a viewer with no
    -- home, is not placed rather than guessed at.
    and c.approximate_geography is not null
    and viewer.approximate_home is not null
    and extensions.st_dwithin(
      c.approximate_geography, viewer.approximate_home, max_distance_meters
    );
$$;

revoke execute on function public.discover_intents(double precision) from public, anon;
grant execute on function public.discover_intents(double precision) to authenticated;
revoke execute on function public.distance_band(double precision) from public, anon;
grant execute on function public.distance_band(double precision) to authenticated;
