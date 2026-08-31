-- ---------------------------------------------------------------
-- Casting radius replaces the reach ladder, and slots become optional.
--
-- Two product changes, one migration, because they are the same
-- change: reducing the friction of casting.
--
-- 1. REACH LADDER -> RADIUS. The ladder's usable default was
--    "adjacent_network" — friends of your circles. That quietly
--    rebuilt the group chat this app exists to get past: everyone it
--    reached was already reachable. So distribution is now a distance
--    the caster picks, and trust moved to where it does more good —
--    the caster deciding who to let in. `intent_reach.level` stays
--    for the link/name flags that live beside it, but it no longer
--    gates who a cast reaches.
--
-- 2. SLOTS BECOME OPTIONAL. Asking "how many people?" up front was
--    friction with nothing behind it, so nothing in the app asks any
--    more. A cast with no answer must therefore have NO ceiling: a
--    hidden default of 2 would silently refuse the third yes, which
--    is worse than the question we removed. Null now means uncapped,
--    and every enforcement path below reads it that way. A cast that
--    does carry a cap is still enforced exactly as before.
-- ---------------------------------------------------------------

alter table public.intent_reach
  add column radius_km smallint not null default 5
    check (radius_km between 1 and 100);

comment on column public.intent_reach.radius_km is
  'how far from the cast''s approximate area it travels. distribution is by place and intent; trust decides admission, not delivery.';

comment on column public.intent_reach.level is
  'legacy reach ladder. no longer gates distribution — see radius_km.';

alter table public.intents
  alter column slots_wanted drop not null,
  alter column slots_wanted drop default;

comment on column public.intents.slots_wanted is
  'optional ceiling on accepted joiners. null = uncapped, which is what every cast made in the app now is.';

-- ---------------------------------------------------------------
-- enforcement: null means no ceiling, everywhere
-- ---------------------------------------------------------------

/**
 * Slots are still a hard invariant when a cast carries one —
 * accepting past a stated limit would put someone in a plan the
 * caster never agreed to make room for. What changed is that a cast
 * may now state no limit at all, and this must not invent one.
 */
create or replace function private.enforce_slot_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  wanted smallint;
  taken integer;
begin
  select slots_wanted into wanted from public.intents where id = new.intent_id;

  -- no stated ceiling, nothing to enforce
  if wanted is null then
    return new;
  end if;

  select count(*) into taken
  from public.matches
  where intent_id = new.intent_id and closed_at is null;

  if taken >= wanted then
    raise exception 'cast_is_full' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.accept_response(
  response_to_accept uuid,
  expected_intent_status public.intent_status
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_response public.responses;
  selected_intent public.intents;
  accepted_match public.matches;
  seats_taken integer;
  fills_the_cast boolean;
begin
  select * into selected_response
  from public.responses
  where id = response_to_accept
  for update;

  if selected_response.id is null then
    raise exception 'response_not_found' using errcode = 'P0002';
  end if;

  select * into selected_intent
  from public.intents
  where id = selected_response.intent_id
  for update;

  if selected_intent.broadcaster_id <> auth.uid() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  -- idempotent: accepting twice returns the seat already given
  select * into accepted_match
  from public.matches
  where response_id = selected_response.id;

  if accepted_match.id is not null then
    return accepted_match;
  end if;

  if selected_intent.status <> expected_intent_status or selected_intent.status <> 'live' then
    raise exception 'stale_intent_state' using errcode = '40001';
  end if;

  if selected_response.status <> 'pending' then
    raise exception 'response_not_pending' using errcode = '23514';
  end if;

  if private.is_blocked(selected_intent.broadcaster_id, selected_response.respondent_id) then
    raise exception 'blocked_relationship' using errcode = '42501';
  end if;

  -- the trigger enforces the ceiling too; checking here produces a
  -- named error the client can act on instead of a raw trigger fault.
  select count(*) into seats_taken
  from public.matches
  where intent_id = selected_intent.id and closed_at is null;

  if selected_intent.slots_wanted is not null
     and seats_taken >= selected_intent.slots_wanted then
    raise exception 'cast_is_full' using errcode = '23514';
  end if;

  insert into public.matches (
    intent_id, response_id, broadcaster_id, participant_id
  ) values (
    selected_intent.id, selected_response.id, selected_intent.broadcaster_id, selected_response.respondent_id
  ) returning * into accepted_match;

  update public.responses set status = 'accepted'
  where id = selected_response.id;

  -- an uncapped cast is never closed by an accept: it stays live
  -- until it expires or the caster takes it down.
  fills_the_cast := selected_intent.slots_wanted is not null
    and seats_taken + 1 >= selected_intent.slots_wanted;

  if fills_the_cast then
    update public.intents set status = 'matched', version = version + 1
    where id = selected_intent.id;
  end if;

  insert into public.conversations (match_id) values (accepted_match.id);
  insert into public.intent_events (
    intent_id, actor_id, event_type, from_status, to_status, metadata
  ) values (
    selected_intent.id, auth.uid(), 'response_accepted', 'live',
    case when fills_the_cast then 'matched'::public.intent_status else 'live'::public.intent_status end,
    jsonb_build_object('seats_taken', seats_taken + 1, 'slots_wanted', selected_intent.slots_wanted)
  );

  return accepted_match;
end;
$$;

grant execute on function public.accept_response(uuid, public.intent_status) to authenticated;
