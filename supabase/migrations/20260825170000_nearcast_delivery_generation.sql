-- Nearcast Phase 2 start: explainable delivery generation.
--
-- Design decision (recorded in the Doc 00 decision log): the schema has no
-- circles or social-graph table yet, so trust adjacency is derived from stored
-- evidence — a person who confirmed one of your intents, or completed a match
-- with you, is a trusted connection. When a circles model arrives this helper
-- widens; the delivery contract does not change.

create or replace function private.has_trust_connection(person_a uuid, person_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.intent_confirmations c
    join public.intents i on i.id = c.intent_id
    where (i.broadcaster_id = person_a and c.confirmer_id = person_b)
       or (i.broadcaster_id = person_b and c.confirmer_id = person_a)
  ) or exists (
    select 1 from public.matches m
    where (m.broadcaster_id = person_a and m.participant_id = person_b)
       or (m.broadcaster_id = person_b and m.participant_id = person_a)
  );
$$;

-- Generates recipient-specific deliveries for one live intent at its stored
-- reach level. Eligibility is applied in the documented order: lifecycle,
-- reach, blocks, restriction, prior action. Every inserted row carries an
-- approved reason code and a human-readable reason, which the table refuses
-- to store without. Reruns are idempotent; hidden deliveries are never
-- recreated. Origin-only reach generates nothing: it travels only through the
-- share link, never by automated delivery.
create or replace function public.generate_deliveries(target_intent_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  target public.intents;
  current_reach public.intent_reach;
  broadcaster_city text;
  inserted integer;
begin
  select * into target from public.intents where id = target_intent_id;
  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  -- A null actor is a trusted server context (scheduler or seed); any
  -- authenticated caller must be the broadcaster.
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

  with candidates as (
    select
      p.id as recipient_id,
      case
        when private.has_trust_connection(target.broadcaster_id, p.id)
          then 'adjacent_trust_connection'
        when broadcaster_city is not null and p.city = broadcaster_city
          then 'nearby_interest_match'
        else 'broader_approved_match'
      end as reason_code
    from public.profiles p
    where p.id <> target.broadcaster_id
      and not p.is_restricted
      and not private.is_blocked(target.broadcaster_id, p.id)
  ),
  eligible as (
    select recipient_id, reason_code
    from candidates
    where case reason_code
        when 'adjacent_trust_connection' then private.reach_rank(current_reach.level) >= 2
        when 'nearby_interest_match' then private.reach_rank(current_reach.level) >= 3
        else private.reach_rank(current_reach.level) >= 4
      end
      and not exists (
        select 1 from public.intent_deliveries d
        where d.intent_id = target.id and d.recipient_id = candidates.recipient_id
      )
      and not exists (
        select 1 from public.responses r
        where r.intent_id = target.id and r.respondent_id = candidates.recipient_id
      )
    -- Most-trusted first; the cap keeps each generation run finite by design.
    order by case reason_code
        when 'adjacent_trust_connection' then 1
        when 'nearby_interest_match' then 2
        else 3
      end
    limit 50
  )
  insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text)
  select
    target.id,
    recipient_id,
    reason_code,
    case reason_code
      when 'adjacent_trust_connection' then 'Shared through one trusted connection'
      when 'nearby_interest_match' then 'In your area and relevant to this intent'
      else 'Within the approved broader reach for this intent'
    end
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

revoke execute on function private.has_trust_connection(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.generate_deliveries(uuid) from public, anon;
grant execute on function public.generate_deliveries(uuid) to authenticated;
