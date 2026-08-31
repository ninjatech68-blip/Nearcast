-- ---------------------------------------------------------------
-- Casts on the backend: viewer attributes, and delivery as a stored
-- fact rather than a render-time calculation.
--
-- The product law (AGENTS.md) is that every recommendation carries a
-- STORED, human-readable delivery reason. Until now the reason was
-- computed on the device when a poster rendered and then thrown away,
-- which satisfied the letter of the rule on screen and none of it in
-- the record. `intent_deliveries` already existed for this and nothing
-- wrote to it.
--
-- It is also how visibility works: `private.can_read_intent` grants
-- read on a live cast only to someone holding a delivery row. So the
-- delivery table is both the audit trail and the permission, and
-- writing it correctly is the whole of this migration.
--
-- The rule implemented here is the same one in
-- `src/features/casts/domain/delivery.ts`, restated in SQL because
-- invariants belong in both places. The pgTAP suite mirrors the vitest
-- cases assertion for assertion, so the two drifting apart shows up as
-- a failing test rather than as a feed nobody can explain.
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- 1. what a viewer is, to delivery
-- ---------------------------------------------------------------

/**
 * The neighbourhoods a person counts as theirs. Approximate by
 * construction: a name and the rough centre of the area behind it,
 * never a position. `profile_areas` is the viewer-side mirror of
 * `intent_context.approximate_geography`.
 */
create table public.profile_areas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  centroid extensions.geography(point, 4326),
  created_at timestamptz not null default now(),
  unique (profile_id, name)
);

create index profile_areas_centroid_idx on public.profile_areas using gist (centroid);
create index profile_areas_profile_idx on public.profile_areas (profile_id);

/**
 * Categories the person chose in onboarding or joined into. Their own
 * actions only — nothing inferred from what they read or looked at.
 */
create table public.profile_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category public.cast_category not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, category)
);

-- coarse activity pattern, e.g. {'weekday-evening'}. a small bounded
-- list of the person's own habits, so a column rather than a table.
alter table public.profiles
  add column active_windows text[] not null default '{}'::text[];

-- the cast's own coarse window, computed on the device from the local
-- start time. Deriving it here would mean guessing a timezone the
-- server does not have.
alter table public.intent_context
  add column coarse_window text
    check (coarse_window is null or char_length(btrim(coarse_window)) between 1 and 40);

-- ---------------------------------------------------------------
-- 2. the reason vocabulary, updated for the radius model
-- ---------------------------------------------------------------

-- `origin_recipient` / `adjacent_trust_connection` described rungs of
-- the reach ladder; `broader_approved_match` described a gate that no
-- longer exists. The codes now name the three ways a cast can arrive.
alter table public.intent_deliveries
  drop constraint intent_deliveries_reason_code_check;

alter table public.intent_deliveries
  add constraint intent_deliveries_reason_code_check
    check (reason_code in ('shared_circle', 'one_trusted_link', 'nearby_interest_match'));

alter table public.intent_deliveries
  add column score smallint not null default 0,
  add column signals text[] not null default '{}'::text[];

comment on column public.intent_deliveries.signals is
  'every signal that fired, in the order weighed. reason_text is built from these and can never cite one that did not fire.';

-- ---------------------------------------------------------------
-- 3. trust distance
-- ---------------------------------------------------------------

/**
 * Do these two people share a circle? Owner counts as a member — a
 * circle you own is a circle you are in.
 *
 * Security definer because circles are readable only by their owner,
 * and neither party may learn the other's membership. This answers
 * one boolean and never reveals which circle produced it.
 */
create or replace function private.shares_circle(left_profile uuid, right_profile uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.circles c
    where (c.owner_id = left_profile or exists (
             select 1 from public.circle_members m
             where m.circle_id = c.id and m.member_id = left_profile))
      and (c.owner_id = right_profile or exists (
             select 1 from public.circle_members m
             where m.circle_id = c.id and m.member_id = right_profile))
  );
$$;

/**
 * One trusted link: somebody shares a circle with each of them. The
 * intermediary is never named to either side.
 */
create or replace function private.one_link_away(left_profile uuid, right_profile uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    where p.id <> left_profile
      and p.id <> right_profile
      and private.shares_circle(left_profile, p.id)
      and private.shares_circle(p.id, right_profile)
  );
$$;

-- ---------------------------------------------------------------
-- 4. the gate
-- ---------------------------------------------------------------

create type private.delivery_verdict as (
  deliver boolean,
  score smallint,
  reason_code text,
  reason_text text,
  signals text[]
);

/**
 * DISTRIBUTE BY PLACE AND INTENT, DECIDE BY TRUST.
 *
 * Someone the viewer is connected to reaches them at any distance — a
 * friend's plan across town is still a friend's plan. A stranger
 * reaches them only inside the cast's radius AND with a shared
 * interest: place alone would make the feed a neighbourhood
 * noticeboard.
 *
 * Score and reason are built from one signal list, in one pass, so
 * they cannot diverge and the text can never cite a signal that did
 * not fire.
 */
create or replace function private.delivery_for(viewer_id uuid, intent_row_id uuid)
returns private.delivery_verdict
language plpgsql stable security definer set search_path = '' as $$
declare
  cast_row public.intents;
  context_row public.intent_context;
  radius smallint;
  shared boolean;
  one_link boolean;
  in_range boolean;
  category_match boolean;
  window_match boolean;
  signals text[] := '{}';
  score smallint := 0;
  code text;
  verdict private.delivery_verdict;
begin
  verdict := (false, 0, null, null, '{}')::private.delivery_verdict;

  select * into cast_row from public.intents where id = intent_row_id;
  if cast_row.id is null then return verdict; end if;

  -- your own cast is never delivered to you: the feed is decisions to
  -- make, and yours is not one of them.
  if cast_row.broadcaster_id = viewer_id then return verdict; end if;

  -- blocking beats every other signal, in both directions.
  if private.is_blocked(cast_row.broadcaster_id, viewer_id) then return verdict; end if;

  if cast_row.status not in ('live', 'matched') or cast_row.expires_at <= now() then
    return verdict;
  end if;

  select * into context_row from public.intent_context where intent_id = intent_row_id;
  select r.radius_km into radius from public.intent_reach r where r.intent_id = intent_row_id;
  radius := coalesce(radius, 5);

  shared := private.shares_circle(viewer_id, cast_row.broadcaster_id);
  one_link := not shared and private.one_link_away(viewer_id, cast_row.broadcaster_id);

  -- in range of any area the viewer counts as theirs. when either side
  -- has no centroid we fall back to matching the name, because
  -- treating an unplaceable area as "far" would silently stop
  -- delivering rather than deliver coarsely.
  in_range := exists (
    select 1
    from public.profile_areas a
    where a.profile_id = viewer_id
      and (
        (a.centroid is not null and context_row.approximate_geography is not null
          and extensions.ST_DWithin(a.centroid, context_row.approximate_geography, radius * 1000.0))
        or (
          (a.centroid is null or context_row.approximate_geography is null)
          and lower(btrim(a.name)) = lower(btrim(coalesce(context_row.approximate_place, '')))
        )
      )
  );

  category_match := exists (
    select 1 from public.profile_interests i
    where i.profile_id = viewer_id and i.category = cast_row.category
  );

  window_match := context_row.coarse_window is not null
    and exists (
      select 1 from public.profiles p
      where p.id = viewer_id and context_row.coarse_window = any(p.active_windows)
    );

  -- the gate
  if not (shared or one_link) then
    if not in_range then return verdict; end if;
    if not category_match then return verdict; end if;
  end if;

  if shared then
    score := score + 3;
    signals := signals || 'your circle vouches'::text;
    code := 'shared_circle';
  elsif one_link then
    score := score + 2;
    signals := signals || 'one trusted link away'::text;
    code := 'one_trusted_link';
  else
    code := 'nearby_interest_match';
  end if;

  if in_range then
    score := score + 1;
    signals := signals || ('near you in ' || coalesce(context_row.approximate_place, 'your area'))::text;
  end if;
  if category_match then
    score := score + 1;
    signals := signals || ('you''re into ' || cast_row.category::text)::text;
  end if;
  if window_match then
    score := score + 1;
    signals := signals || ('you''re usually up for ' || replace(context_row.coarse_window, '-', ' ') || 's')::text;
  end if;

  if array_length(signals, 1) is null then return verdict; end if;

  return (
    true,
    score,
    code,
    left(array_to_string(signals[1:2], ' · '), 160),
    signals
  )::private.delivery_verdict;
end;
$$;

-- ---------------------------------------------------------------
-- 5. publishing a cast
-- ---------------------------------------------------------------

/**
 * One call, one live cast. The client never inserts into `intents`
 * directly: publishing has to write four tables consistently and set
 * a status the RLS update policy deliberately forbids the owner from
 * setting by hand.
 *
 * The pin is rounded to three decimal places (~110m) before it is
 * stored. The area picker resolves a real place, and a real place
 * pinned to full precision is an exact location — which a
 * discoverable row must never carry. Rounding here means no client
 * path can put a precise point in the table.
 */
-- the optional arguments come last and default to null, so a caller
-- that could not place the area, or has no start time, simply omits
-- them rather than passing a null the type says is not allowed.
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

-- ---------------------------------------------------------------
-- 6. reading the feed
-- ---------------------------------------------------------------

/**
 * Evaluate every live cast this person has not been delivered yet, and
 * store the ones that pass.
 *
 * Its own function rather than a loop inside `my_feed` because that
 * function's output columns are named `intent_id` and `signals`, which
 * an ON CONFLICT target inside it cannot be told apart from the
 * columns of the same name.
 */
create or replace function private.materialise_deliveries(recipient uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  candidate record;
  verdict private.delivery_verdict;
begin
  for candidate in
    select i.id
    from public.intents i
    where i.status in ('live', 'matched')
      and i.expires_at > now()
      and i.broadcaster_id <> recipient
      and not exists (
        select 1 from public.intent_deliveries d
        where d.intent_id = i.id and d.recipient_id = recipient
      )
  loop
    verdict := private.delivery_for(recipient, candidate.id);
    if verdict.deliver then
      insert into public.intent_deliveries
        (intent_id, recipient_id, reason_code, reason_text, score, signals)
      values
        (candidate.id, recipient, verdict.reason_code, verdict.reason_text, verdict.score, verdict.signals)
      on conflict (intent_id, recipient_id) do nothing;
    end if;
  end loop;
end;
$$;

/**
 * The feed, and the point at which delivery becomes a stored fact.
 *
 * Deliveries are materialised on READ rather than fanned out on
 * publish. A person who signs up tomorrow, or adds an area tonight,
 * must be able to see a cast that went out this morning — a publish
 * time fan-out would have decided their feed before they existed.
 * Evaluating on read also means the stored reason is the reason as of
 * the moment it actually reached them.
 *
 * Fan-out at publish time still has to happen for notifications, and
 * lands with them; it will write the same rows through the same gate.
 */
create or replace function public.my_feed()
returns table (
  intent_id uuid,
  category public.cast_category,
  statement text,
  area text,
  starts_at timestamptz,
  expires_at timestamptz,
  caster_id uuid,
  caster_first_name text,
  reason_text text,
  signals text[],
  score smallint
)
language plpgsql security definer set search_path = '' as $$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  perform private.materialise_deliveries(viewer);

  return query
    select
      i.id,
      i.category,
      i.statement,
      c.approximate_place,
      c.starts_at,
      i.expires_at,
      i.broadcaster_id,
      split_part(p.display_name, ' ', 1),
      d.reason_text,
      d.signals,
      d.score
    from public.intent_deliveries d
    join public.intents i on i.id = d.intent_id
    join public.profiles p on p.id = i.broadcaster_id
    left join public.intent_context c on c.intent_id = i.id
    where d.recipient_id = viewer
      and d.hidden_at is null
      and i.status in ('live', 'matched')
      and i.expires_at > now()
      and not private.is_blocked(i.broadcaster_id, viewer)
    order by d.score desc, i.published_at desc;
end;
$$;

/** the viewer swipes a cast away, or says it was not relevant. */
create or replace function public.hide_cast(target_intent_id uuid, not_relevant boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.intent_deliveries
  set hidden_at = now(),
      feedback = case when not_relevant then 'not_relevant' else feedback end
  where intent_id = target_intent_id and recipient_id = viewer;
end;
$$;

-- ---------------------------------------------------------------
-- 7. row level security
-- ---------------------------------------------------------------

alter table public.profile_areas enable row level security;
alter table public.profile_interests enable row level security;

-- your areas and your interests are yours. nobody reads either — not
-- another user, not a caster deciding who to accept. delivery reads
-- them through a definer function and returns only a verdict.
create policy profile_areas_owner_all on public.profile_areas for all to authenticated
using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy profile_interests_owner_all on public.profile_interests for all to authenticated
using (profile_id = auth.uid()) with check (profile_id = auth.uid());

grant select, insert, update, delete on public.profile_areas to authenticated;
grant select, insert, update, delete on public.profile_interests to authenticated;

revoke execute on function private.shares_circle(uuid, uuid) from public, anon;
revoke execute on function private.one_link_away(uuid, uuid) from public, anon;
revoke execute on function private.delivery_for(uuid, uuid) from public, anon;
revoke execute on function private.materialise_deliveries(uuid) from public, anon;

grant execute on function public.publish_cast(
  public.cast_category, text, text, smallint, timestamptz,
  double precision, double precision, timestamptz, text) to authenticated;
grant execute on function public.my_feed() to authenticated;
grant execute on function public.hide_cast(uuid, boolean) to authenticated;
