-- Geographic relevance and delivery ranking (MUST-030 to MUST-036, Doc 05).
--
-- Until now "nearby" meant "same city string", which is the coarsest possible
-- reading of a requirement that names PostGIS. This gives ranking a real
-- geographic signal while keeping the rule that a band is the finest
-- geographic fact anything may expose: no distance, and certainly no
-- coordinate, reaches a client.

alter table public.profile_private
  add column if not exists approximate_geography extensions.geography(point, 4326);

create index if not exists profile_private_geography_idx
  on public.profile_private using gist (approximate_geography);

/**
 * The four bands from Doc 05. Null when either side is unknown — an absent
 * location produces no band rather than a guessed one.
 */
create or replace function private.distance_band(
  here extensions.geography,
  there extensions.geography
)
returns text language sql immutable set search_path = '' as $$
  select case
    when here is null or there is null then null
    when extensions.st_distance(here, there) < 2000 then 'walking'
    when extensions.st_distance(here, there) < 8000 then 'nearby'
    when extensions.st_distance(here, there) < 25000 then 'across_town'
    else 'far'
  end;
$$;

revoke execute on function private.distance_band(extensions.geography, extensions.geography)
  from public, anon, authenticated;

-- Where a delivery placed in its generation run. Stored so an ordering can be
-- explained after the fact, which "ranking without an explainable reason is
-- not permitted" requires.
alter table public.intent_deliveries
  add column if not exists rank_position integer;

/**
 * Generation with the documented ranking applied.
 *
 * Eligibility order is unchanged: lifecycle, reach, geography, blocks,
 * restriction, prior action. What is new is that geography is a real distance
 * band, that a saturated recipient is skipped rather than merely ranked low,
 * and that each row records where it ranked.
 *
 * Signals that vary per recipient are the ones that can rank recipients:
 * trust distance, geographic band, prior successful interaction, and fatigue.
 * Expiry proximity and recency describe the intent, not the recipient, so they
 * order the feed rather than this selection.
 */
create or replace function public.generate_deliveries(target_intent_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  target public.intents;
  current_reach public.intent_reach;
  broadcaster_city text;
  broadcaster_area extensions.geography;
  intent_area extensions.geography;
  origin extensions.geography;
  inserted integer;
begin
  select * into target from public.intents where id = target_intent_id;
  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if actor is not null and actor <> target.broadcaster_id then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if target.status <> 'live' or target.expires_at <= now() then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  select * into current_reach from public.intent_reach where intent_id = target.id;
  if current_reach.intent_id is null or current_reach.level = 'origin_only' then
    return 0;
  end if;

  select city into broadcaster_city from public.profiles where id = target.broadcaster_id;
  select approximate_geography into broadcaster_area
  from public.profile_private where profile_id = target.broadcaster_id;
  select approximate_geography into intent_area
  from public.intent_context where intent_id = target.id;

  -- The intent's own area wins when it has one: an intent can be somewhere its
  -- broadcaster is not.
  origin := coalesce(intent_area, broadcaster_area);

  with candidates as (
    select
      p.id as recipient_id,
      private.has_trust_connection(target.broadcaster_id, p.id) as trusted,
      private.distance_band(origin, pp.approximate_geography) as band,
      pp.approximate_geography is not null and origin is not null as located,
      (select count(*) from public.intent_deliveries d
       where d.recipient_id = p.id and d.delivered_at > now() - interval '24 hours') as delivered_today,
      exists (
        select 1 from public.matches m
        where (m.broadcaster_id = target.broadcaster_id and m.participant_id = p.id)
           or (m.participant_id = target.broadcaster_id and m.broadcaster_id = p.id)
      ) as prior_interaction
    from public.profiles p
    left join public.profile_private pp on pp.profile_id = p.id
    where p.id <> target.broadcaster_id
      and not p.is_restricted
      and p.deleted_at is null
      and not private.is_blocked(target.broadcaster_id, p.id)
  ),
  classified as (
    select
      recipient_id,
      delivered_today,
      prior_interaction,
      band,
      case
        when trusted then 'adjacent_trust_connection'
        -- A real band when both sides are located; the city string only when
        -- geography is missing, so an unlocated member is not stranded.
        when band in ('walking', 'nearby', 'across_town') then 'nearby_interest_match'
        when not located and broadcaster_city is not null
             and exists (select 1 from public.profiles p2
                         where p2.id = candidates.recipient_id and p2.city = broadcaster_city)
          then 'nearby_interest_match'
        else 'broader_approved_match'
      end as reason_code
    from candidates
  ),
  eligible as (
    select
      recipient_id,
      reason_code,
      row_number() over (
        order by
          case reason_code
            when 'adjacent_trust_connection' then 1
            when 'nearby_interest_match' then 2
            else 3
          end,
          case band
            when 'walking' then 1
            when 'nearby' then 2
            when 'across_town' then 3
            when 'far' then 4
            else 5
          end,
          prior_interaction desc,
          delivered_today asc,
          recipient_id
      ) as rank_position
    from classified
    where case reason_code
        when 'adjacent_trust_connection' then private.reach_rank(current_reach.level) >= 2
        when 'nearby_interest_match' then private.reach_rank(current_reach.level) >= 3
        else private.reach_rank(current_reach.level) >= 4
      end
      -- Fatigue is a limit, not a preference: past the daily cap a person is
      -- skipped entirely rather than ranked last and delivered anyway.
      and delivered_today < 10
      and not exists (
        select 1 from public.intent_deliveries d
        where d.intent_id = target.id and d.recipient_id = classified.recipient_id
      )
      and not exists (
        select 1 from public.responses r
        where r.intent_id = target.id and r.respondent_id = classified.recipient_id
      )
    order by rank_position
    limit 50
  )
  insert into public.intent_deliveries
    (intent_id, recipient_id, reason_code, reason_text, rank_position)
  select
    target.id,
    recipient_id,
    reason_code,
    case reason_code
      when 'adjacent_trust_connection' then 'Shared through one trusted connection'
      when 'nearby_interest_match' then 'In your area and relevant to this intent'
      else 'Within the approved broader reach for this intent'
    end,
    rank_position
  from eligible
  on conflict (intent_id, recipient_id) do nothing;

  get diagnostics inserted = row_count;

  if inserted > 0 then
    insert into public.intent_events (intent_id, actor_id, event_type, metadata)
    values (target.id, actor, 'deliveries_generated',
            jsonb_build_object('delivered_count', inserted, 'reach_level', current_reach.level));
  end if;

  return inserted;
end;
$$;

revoke execute on function public.generate_deliveries(uuid) from public, anon;
grant execute on function public.generate_deliveries(uuid) to authenticated;
