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

-- Deliberately unconstrained beyond NOT NULL. A deadline in the past is a valid
-- state -- it is what a closed room looks like -- and a CHECK such as
-- `expires_at > created_at` would apply to every future UPDATE, blocking the
-- legitimate act of ending a room early by pulling its deadline in after a
-- block or a moderation action. `accept_response` is what guarantees a room
-- opens with a usable window.
alter table public.conversations alter column expires_at set not null;

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

-- Idempotency store ---------------------------------------------------------
-- API Contracts requires a repeated key with the same fingerprint to return the
-- original result, and a repeated key with a different fingerprint to conflict.
-- Only SECURITY DEFINER functions touch this table, so it carries RLS with no
-- policies: authenticated clients can neither read nor write it.

create table public.request_idempotency (
  actor_id uuid not null references public.profiles(id) on delete cascade,
  operation text not null,
  request_key uuid not null,
  fingerprint text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, operation, request_key)
);

alter table public.request_idempotency enable row level security;

-- send-message --------------------------------------------------------------
-- Mirrors the `accept_response` precedent: a server-controlled transaction
-- rather than an Edge Function. Persisting here is what makes the Realtime
-- broadcast safe, because `postgres_changes` only emits after this commits.

create or replace function public.send_message(
  target_conversation uuid,
  message_body text,
  reply_to uuid default null,
  request_key uuid default null
)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  room public.conversations;
  room_match public.matches;
  trimmed text := btrim(message_body);
  request_fingerprint text;
  stored public.request_idempotency;
  created public.messages;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if char_length(trimmed) < 1 or char_length(trimmed) > 2000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  request_fingerprint := encode(
    extensions.digest(
      target_conversation::text || ':' || trimmed || ':' || coalesce(reply_to::text, ''),
      'sha256'
    ),
    'hex'
  );

  if request_key is not null then
    select * into stored
    from public.request_idempotency i
    where i.actor_id = actor
      and i.operation = 'send-message'
      and i.request_key = send_message.request_key;

    if stored.actor_id is not null then
      if stored.fingerprint <> request_fingerprint then
        raise exception 'conflict' using errcode = '23505';
      end if;

      select * into created
      from public.messages
      where id = (stored.result ->> 'id')::uuid;

      return created;
    end if;
  end if;

  select * into room from public.conversations where id = target_conversation;

  if room.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  select * into room_match from public.matches where id = room.match_id;

  if actor not in (room_match.broadcaster_id, room_match.participant_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if room.closed_at is not null or room.expires_at <= now() then
    raise exception 'room_closed' using errcode = '42501';
  end if;

  if private.is_blocked(room_match.broadcaster_id, room_match.participant_id) then
    raise exception 'restricted' using errcode = '42501';
  end if;

  if reply_to is not null then
    perform 1 from public.messages
    where id = reply_to and conversation_id = target_conversation;

    if not found then
      raise exception 'invalid_input' using errcode = '22023';
    end if;
  end if;

  insert into public.messages (conversation_id, sender_id, body, reply_to_id)
  values (target_conversation, actor, trimmed, reply_to)
  returning * into created;

  if request_key is not null then
    insert into public.request_idempotency (
      actor_id, operation, request_key, fingerprint, result
    ) values (
      actor,
      'send-message',
      send_message.request_key,
      request_fingerprint,
      jsonb_build_object('id', created.id, 'created_at', created.created_at)
    );
  end if;

  return created;
end;
$$;

revoke execute on function public.send_message(uuid, text, uuid, uuid) from public, anon;
grant execute on function public.send_message(uuid, text, uuid, uuid) to authenticated;
