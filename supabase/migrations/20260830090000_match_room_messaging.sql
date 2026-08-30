-- Match room messaging: bounded-lifetime coordination rooms.
-- A room is writable only while it is open AND unexpired. Expiry is enforced by
-- time in the insert policy so it does not depend on the sweeper having run.
-- Read access deliberately survives expiry: the transcript stays visible to the
-- two match parties after the room stops accepting messages.

-- Room lifetime ------------------------------------------------------------

alter table public.conversations add column expires_at timestamptz;

update public.conversations
set expires_at = created_at + interval '24 hours'
where expires_at is null;

alter table public.conversations
  alter column expires_at set not null,
  add constraint conversations_expiry_after_creation check (expires_at > created_at);

create index conversations_open_expiry_idx
  on public.conversations (expires_at)
  where closed_at is null;

-- Reply-to, constrained to the same conversation ---------------------------

alter table public.messages add constraint messages_id_conversation_key
  unique (id, conversation_id);

alter table public.messages
  add column reply_to_id uuid,
  add constraint messages_reply_not_self
    check (reply_to_id is null or reply_to_id <> id),
  add constraint messages_reply_same_conversation
    foreign key (reply_to_id, conversation_id)
    references public.messages (id, conversation_id)
    on delete set null (reply_to_id);

-- Write access: open, unexpired, party, unblocked --------------------------

drop policy messages_insert_parties on public.messages;

create policy messages_insert_parties on public.messages for insert to authenticated
with check (
  sender_id = auth.uid() and not is_system
  and exists (
    select 1
    from public.conversations c
    join public.matches m on m.id = c.match_id
    where c.id = conversation_id
      and c.closed_at is null
      and c.expires_at > now()
      and auth.uid() in (m.broadcaster_id, m.participant_id)
      and not private.is_blocked(m.broadcaster_id, m.participant_id)
  )
);

-- Idempotent expiry sweep --------------------------------------------------

create or replace function public.close_expired_conversations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  closed_count integer;
begin
  with closed as (
    update public.conversations
    set closed_at = now()
    where closed_at is null and expires_at <= now()
    returning id
  ), noted as (
    insert into public.messages (conversation_id, sender_id, body, is_system)
    select closed.id, null, 'This coordination room has closed.', true
    from closed
    returning 1
  )
  select count(*) into closed_count from noted;

  return closed_count;
end;
$$;

revoke execute on function public.close_expired_conversations() from public, anon, authenticated;

-- Acceptance now opens a room with an explicit deadline ---------------------
-- The room outlives the intent by one day so parties can still coordinate and
-- confirm the outcome after the intent itself lapses, with a floor of one day
-- from acceptance when the intent is already close to expiry.

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

  insert into public.matches (
    intent_id, response_id, broadcaster_id, participant_id
  ) values (
    selected_intent.id, selected_response.id, selected_intent.broadcaster_id, selected_response.respondent_id
  ) returning * into accepted_match;

  update public.responses set status = 'accepted'
  where id = selected_response.id;

  update public.intents set status = 'matched', version = version + 1
  where id = selected_intent.id;

  insert into public.conversations (match_id, expires_at)
  values (
    accepted_match.id,
    greatest(selected_intent.expires_at, now()) + interval '24 hours'
  );

  insert into public.intent_events (
    intent_id, actor_id, event_type, from_status, to_status
  ) values (
    selected_intent.id, auth.uid(), 'response_accepted', 'live', 'matched'
  );

  return accepted_match;
end;
$$;

revoke execute on function public.accept_response(uuid, public.intent_status) from public, anon;
grant execute on function public.accept_response(uuid, public.intent_status) to authenticated;
