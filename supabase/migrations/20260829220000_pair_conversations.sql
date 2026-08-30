-- ===============================================================
-- One chat per PAIR of people, not per match.
-- ===============================================================
--
-- A conversation was created per accepted response, so two people who
-- matched on two different casts got two separate chats. That is not
-- how people think: you have ONE thread with someone, and the plans you
-- share both live in it.
--
-- This keys a conversation to the unordered pair of people. Accepting a
-- second (or third) plan with someone you already have a chat with
-- reuses that chat and drops a note naming the new plan, instead of
-- opening another window.
--
-- conversations.match_id stays as the FIRST match that opened the chat
-- (kept unique, untouched). matches gain conversation_id so several can
-- point at one conversation. Every party check moves from "join through
-- the match" to "is auth.uid() one of the pair", because a conversation
-- no longer has a single match behind it.
-- ===============================================================

-- 1. identity: the unordered pair -------------------------------
alter table public.conversations
  add column if not exists person_low uuid references public.profiles(id) on delete cascade,
  add column if not exists person_high uuid references public.profiles(id) on delete cascade;

alter table public.matches
  add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;

-- backfill from the existing one-match-per-conversation world
update public.conversations c
set person_low  = least(m.broadcaster_id, m.participant_id),
    person_high = greatest(m.broadcaster_id, m.participant_id)
from public.matches m
where m.id = c.match_id and c.person_low is null;

update public.matches m
set conversation_id = c.id
from public.conversations c
where c.match_id = m.id and m.conversation_id is null;

-- MERGE duplicate-pair conversations before enforcing one-per-pair.
-- Testing created two separate chats between the same two people (one per
-- cast); keep the oldest as the single thread and fold the rest into it,
-- so the unique index below can be created. Idempotent: with no
-- duplicates (a fresh DB) this changes nothing.
do $$
declare
  keeper uuid;
  loser uuid;
begin
  for keeper, loser in
    select first_value(id) over w, id
    from public.conversations
    where person_low is not null
    window w as (partition by person_low, person_high order by created_at, id)
  loop
    if keeper is null or loser = keeper then
      continue;
    end if;
    -- fold the losing chat's plans and messages into the keeper
    update public.matches set conversation_id = keeper where conversation_id = loser;
    update public.messages set conversation_id = keeper where conversation_id = loser;
    -- read state is per (conversation, reader); drop the loser's rather
    -- than risk a primary-key clash on repoint. it re-creates on next open.
    delete from public.conversation_reads where conversation_id = loser;
    delete from public.conversations where id = loser;
  end loop;
end $$;

-- one chat per pair, now that duplicates are merged
create unique index if not exists conversations_pair_uq
  on public.conversations (person_low, person_high);
create index if not exists matches_conversation_idx on public.matches (conversation_id);

-- 2. party check by pair, not by match --------------------------
create or replace function private.is_conversation_party(target_conversation_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.id = target_conversation_id
      and auth.uid() in (c.person_low, c.person_high)
  );
$$;
grant execute on function private.is_conversation_party(uuid) to authenticated;

create or replace function private.assert_can_send(target_conversation_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  sender uuid := auth.uid();
  is_party boolean;
  is_open boolean;
begin
  if sender is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select auth.uid() in (c.person_low, c.person_high),
         c.closed_at is null and c.mode <> 'ended'
    into is_party, is_open
  from public.conversations c
  where c.id = target_conversation_id;
  if is_party is null then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
  if not is_party then raise exception 'not_a_party' using errcode = '42501'; end if;
  if not is_open then raise exception 'conversation_ended' using errcode = '23514'; end if;
  return sender;
end;
$$;

-- 3. accept_response: reuse the pair's chat, or open the first --
create or replace function public.accept_response(
  response_to_accept uuid,
  expected_intent_status public.intent_status
)
returns public.matches
language plpgsql security definer set search_path = '' as $$
declare
  selected_response public.responses;
  selected_intent public.intents;
  accepted_match public.matches;
  seats_taken integer;
  fills_the_cast boolean;
  pair_low uuid;
  pair_high uuid;
  convo_id uuid;
  is_new_convo boolean := false;
begin
  select * into selected_response from public.responses where id = response_to_accept for update;
  if selected_response.id is null then raise exception 'response_not_found' using errcode = 'P0002'; end if;

  select * into selected_intent from public.intents where id = selected_response.intent_id for update;
  if selected_intent.broadcaster_id <> auth.uid() then raise exception 'not_authorized' using errcode = '42501'; end if;

  select * into accepted_match from public.matches where response_id = selected_response.id;
  if accepted_match.id is not null then return accepted_match; end if;

  if selected_intent.status <> expected_intent_status or selected_intent.status <> 'live' then
    raise exception 'stale_intent_state' using errcode = '40001';
  end if;
  if selected_response.status <> 'pending' then raise exception 'response_not_pending' using errcode = '23514'; end if;
  if private.is_blocked(selected_intent.broadcaster_id, selected_response.respondent_id) then
    raise exception 'blocked_relationship' using errcode = '42501';
  end if;

  select count(*) into seats_taken from public.matches
  where intent_id = selected_intent.id and closed_at is null;
  if selected_intent.slots_wanted is not null and seats_taken >= selected_intent.slots_wanted then
    raise exception 'cast_is_full' using errcode = '23514';
  end if;

  insert into public.matches (intent_id, response_id, broadcaster_id, participant_id)
  values (selected_intent.id, selected_response.id, selected_intent.broadcaster_id, selected_response.respondent_id)
  returning * into accepted_match;

  update public.responses set status = 'accepted' where id = selected_response.id;

  fills_the_cast := selected_intent.slots_wanted is not null
    and seats_taken + 1 >= selected_intent.slots_wanted;
  if fills_the_cast then
    update public.intents set status = 'matched', version = version + 1 where id = selected_intent.id;
  end if;

  -- the pair, unordered, is the chat's identity
  pair_low  := least(selected_intent.broadcaster_id, selected_response.respondent_id);
  pair_high := greatest(selected_intent.broadcaster_id, selected_response.respondent_id);

  select id into convo_id from public.conversations
  where person_low = pair_low and person_high = pair_high;

  if convo_id is null then
    insert into public.conversations (match_id, person_low, person_high)
    values (accepted_match.id, pair_low, pair_high)
    returning id into convo_id;
    is_new_convo := true;
  end if;

  update public.matches set conversation_id = convo_id where id = accepted_match.id;

  -- a reused chat gets a note naming the new plan; the first chat does
  -- not need one, the room itself is the announcement.
  if not is_new_convo then
    insert into public.messages (conversation_id, sender_id, body, is_system)
    values (convo_id, auth.uid(), 'you''re now also on: ' || selected_intent.statement, true);
  end if;

  insert into public.intent_events (intent_id, actor_id, event_type, from_status, to_status, metadata)
  values (
    selected_intent.id, auth.uid(), 'response_accepted', 'live',
    case when fills_the_cast then 'matched'::public.intent_status else 'live'::public.intent_status end,
    jsonb_build_object('seats_taken', seats_taken + 1, 'slots_wanted', selected_intent.slots_wanted)
  );

  return accepted_match;
end;
$$;
grant execute on function public.accept_response(uuid, public.intent_status) to authenticated;

-- 4. set_conversation_mode + respond_to_mode_proposal by pair ---
create or replace function public.set_conversation_mode(
  target_conversation_id uuid, next_mode public.conversation_mode
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  is_party boolean;
  current_mode public.conversation_mode;
  next_expiry timestamptz;
  note text;
begin
  if actor is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select auth.uid() in (c.person_low, c.person_high), c.mode into is_party, current_mode
  from public.conversations c where c.id = target_conversation_id;
  if is_party is null then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
  if not is_party then raise exception 'not_a_party' using errcode = '42501'; end if;
  if current_mode = 'ended' then raise exception 'conversation_ended' using errcode = '23514'; end if;

  if next_mode <> 'ended' and private.mode_rank(next_mode) > private.mode_rank(current_mode) then
    update public.conversations
    set proposed_mode = next_mode, proposed_by = actor, proposed_at = now()
    where id = target_conversation_id;
    insert into public.messages (conversation_id, sender_id, body, is_system)
    values (target_conversation_id, actor,
      case next_mode when 'always' then 'this could stay open with no expiry. it takes you both.'
                     else 'this could run 7 days. it takes you both.' end, true);
    return;
  end if;

  next_expiry := case next_mode when 'day' then now() + interval '24 hours'
                                when 'week' then now() + interval '7 days' else null end;
  update public.conversations
  set mode = next_mode,
      expires_at = case when next_mode = 'ended' then expires_at else next_expiry end,
      closed_at = case when next_mode = 'ended' then now() else closed_at end,
      proposed_mode = null, proposed_by = null, proposed_at = null
  where id = target_conversation_id and mode <> 'ended';

  note := case next_mode when 'ended' then 'this chat is closed. nothing more comes through.'
                         when 'week' then 'the window is 7 days now.' else 'the window is 24h now.' end;
  insert into public.messages (conversation_id, sender_id, body, is_system)
  values (target_conversation_id, actor, note, true);
end;
$$;

create or replace function public.respond_to_mode_proposal(
  target_conversation_id uuid, accept boolean
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  is_party boolean;
  proposer uuid;
  wanted public.conversation_mode;
  next_expiry timestamptz;
begin
  if actor is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select auth.uid() in (c.person_low, c.person_high), c.proposed_by, c.proposed_mode
    into is_party, proposer, wanted
  from public.conversations c where c.id = target_conversation_id;
  if is_party is null then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
  if not is_party then raise exception 'not_a_party' using errcode = '42501'; end if;
  if wanted is null then raise exception 'no_open_proposal' using errcode = 'P0002'; end if;
  if accept and proposer = actor then raise exception 'proposer_cannot_accept' using errcode = '42501'; end if;

  if not accept then
    update public.conversations set proposed_mode = null, proposed_by = null, proposed_at = null
    where id = target_conversation_id;
    insert into public.messages (conversation_id, sender_id, body, is_system)
    values (target_conversation_id, actor, 'the window stays as it is.', true);
    return;
  end if;

  next_expiry := case wanted when 'week' then now() + interval '7 days' else null end;
  update public.conversations
  set mode = wanted, expires_at = next_expiry,
      proposed_mode = null, proposed_by = null, proposed_at = null
  where id = target_conversation_id and mode <> 'ended';
  insert into public.messages (conversation_id, sender_id, body, is_system)
  values (target_conversation_id, actor,
    case wanted when 'always' then 'you both said yes. this one stays open.'
                else 'you both said yes. 7 days.' end, true);
end;
$$;

-- 5. conversation_messages + my_conversations by pair -----------
create or replace function public.conversation_messages(target_conversation_id uuid)
returns table (
  id uuid, sender_id uuid, body text, is_system boolean, is_mine boolean,
  latitude double precision, longitude double precision, place_label text,
  media_path text, media_kind text, media_width integer, media_height integer, created_at timestamptz
)
language sql security definer set search_path = '' as $$
  select
    msg.id, msg.sender_id, msg.body, msg.is_system, (msg.sender_id = auth.uid()),
    msg.latitude, msg.longitude, msg.place_label,
    msg.media_path, msg.media_kind, msg.media_width, msg.media_height, msg.created_at
  from public.messages msg
  join public.conversations c on c.id = msg.conversation_id
  where msg.conversation_id = target_conversation_id
    and auth.uid() in (c.person_low, c.person_high)
  order by msg.created_at asc;
$$;
grant execute on function public.conversation_messages(uuid) to authenticated;

drop function if exists public.my_conversations();
create or replace function public.my_conversations()
returns table (
  conversation_id uuid, intent_id uuid, cast_title text, other_id uuid,
  other_first_name text, mode public.conversation_mode, expires_at timestamptz,
  last_message text, last_at timestamptz, unread_count bigint, other_last_read_at timestamptz,
  proposed_mode public.conversation_mode, proposed_by_me boolean, plan_count bigint
)
language sql security definer set search_path = '' as $$
  with mine as (
    select c.*, case when c.person_low = auth.uid() then c.person_high else c.person_low end as other
    from public.conversations c
    where auth.uid() in (c.person_low, c.person_high)
  ),
  latest_match as (
    -- the most recent plan this pair matched on names the row
    select distinct on (m.conversation_id) m.conversation_id, m.intent_id, i.statement, m.created_at
    from public.matches m join public.intents i on i.id = m.intent_id
    where m.conversation_id is not null
    order by m.conversation_id, m.created_at desc
  )
  select
    mine.id,
    lm.intent_id,
    coalesce(lm.statement, ''),
    mine.other,
    split_part(p.display_name, ' ', 1),
    mine.mode,
    mine.expires_at,
    (select case when msg.media_kind = 'gif' then 'GIF'
                 when msg.media_kind = 'image' then 'photo'
                 when msg.latitude is not null and char_length(btrim(msg.body)) = 0 then 'location'
                 else msg.body end
       from public.messages msg where msg.conversation_id = mine.id
       order by msg.created_at desc limit 1),
    coalesce((select created_at from public.messages msg where msg.conversation_id = mine.id
              order by msg.created_at desc limit 1), mine.created_at),
    (select count(*) from public.messages msg
      where msg.conversation_id = mine.id and msg.sender_id <> auth.uid()
        and msg.created_at > coalesce(
          (select r.last_read_at from public.conversation_reads r
            where r.conversation_id = mine.id and r.profile_id = auth.uid()), '-infinity'::timestamptz)),
    (select r.last_read_at from public.conversation_reads r
      where r.conversation_id = mine.id and r.profile_id = mine.other),
    mine.proposed_mode,
    (mine.proposed_by = auth.uid()),
    (select count(*) from public.matches m2 where m2.conversation_id = mine.id)
  from mine
  join public.profiles p on p.id = mine.other
  left join latest_match lm on lm.conversation_id = mine.id
  order by 9 desc;
$$;
grant execute on function public.my_conversations() to authenticated;
