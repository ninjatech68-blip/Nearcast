-- ---------------------------------------------------------------
-- Sending a reply, and reading replies and reactions back.
--
-- The three existing read functions — conversation_messages, its paging
-- variant and its after-cursor variant — are deliberately NOT touched. They
-- carry the receipt derivation and the created_at/id tie-breaking that
-- chat_paging.test.sql, chat_paging_ties.test.sql and
-- message_receipt_states.test.sql exist to pin down. Rewriting three tested
-- functions to bolt two columns onto each is the kind of change that passes
-- review and breaks ordering in a way nobody notices for a week.
--
-- Instead the extra per-message facts come from one function beside them, and
-- the client merges by id. A coordination room is short-lived and bounded, so
-- fetching the room's reply-and-reaction map in one go costs nothing.
-- ---------------------------------------------------------------

create or replace function public.conversation_message_meta(target_conversation_id uuid)
returns table (
  message_id uuid,
  reply_to_id uuid,
  reply_body text,
  reply_is_mine boolean,
  reactions jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with convo as (
    select c.id
    from public.conversations c
    where c.id = target_conversation_id
      and auth.uid() in (c.person_low, c.person_high)
  )
  select
    msg.id,
    msg.reply_to_id,
    -- The quoted text, so a bubble can draw its quote without a second
    -- round trip. Safe to include: the composite foreign key guarantees the
    -- quoted message is in this same conversation, and the caller is already
    -- a party to it, so this discloses nothing they cannot read anyway.
    quoted.body,
    (quoted.sender_id = auth.uid()),
    public.reactions_for_message(msg.id)
  from convo
  join public.messages msg on msg.conversation_id = convo.id
  left join public.messages quoted on quoted.id = msg.reply_to_id
  where msg.reply_to_id is not null
     or exists (select 1 from public.message_reactions r where r.message_id = msg.id);
$$;

comment on function public.conversation_message_meta(uuid) is
  'Reply and reaction facts for one room, keyed by message id. Only rows that '
  'have something to say are returned, so a room with neither costs one empty '
  'result rather than a row per message.';

-- ---------------------------------------------------------------
-- Sending, with an optional quote.
--
-- Derived from the existing definition rather than retyped: the idempotency
-- branch on client_message_id, the length guard, the receipt seeding and
-- `assert_can_send` are unchanged. The only additions are the parameter and
-- the guard that a quote must belong to this conversation.
--
-- Adding a defaulted parameter creates a new signature rather than replacing
-- the old one, which would leave two overloads and an ambiguous three-argument
-- call. Dropping first keeps one function; the three-argument call still
-- resolves through the default, so the build already on people's phones keeps
-- working.
-- ---------------------------------------------------------------
drop function if exists public.send_message(uuid, text, text);

create or replace function public.send_message(
  target_conversation_id uuid,
  message_body text,
  client_message_id text default null,
  reply_to_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  sender uuid := private.assert_can_send(target_conversation_id);
  trimmed text := btrim(message_body);
  new_id uuid;
begin
  if char_length(trimmed) < 1 or char_length(trimmed) > 2000 then
    raise exception 'message_out_of_range' using errcode = '23514';
  end if;

  -- The composite foreign key would refuse a cross-room quote anyway, but it
  -- would refuse it as a constraint violation. Checking here means the client
  -- gets an error it can act on instead of a 23503.
  if send_message.reply_to_id is not null and not exists (
    select 1 from public.messages m
    where m.id = send_message.reply_to_id
      and m.conversation_id = target_conversation_id
  ) then
    raise exception 'reply_not_in_conversation' using errcode = '23503';
  end if;

  if client_message_id is not null and char_length(btrim(client_message_id)) > 0 then
    insert into public.messages (conversation_id, sender_id, body, is_system, client_message_id, reply_to_id)
    values (target_conversation_id, sender, trimmed, false, btrim(client_message_id), send_message.reply_to_id)
    on conflict (conversation_id, sender_id, client_message_id)
    where client_message_id is not null
    do update set body = excluded.body
    returning id into new_id;
  else
    insert into public.messages (conversation_id, sender_id, body, is_system, reply_to_id)
    values (target_conversation_id, sender, trimmed, false, send_message.reply_to_id)
    returning id into new_id;
  end if;

  perform private.seed_message_receipt(new_id, target_conversation_id, sender);
  return new_id;
end;
$$;

revoke execute on function public.conversation_message_meta(uuid) from public, anon;
grant execute on function public.conversation_message_meta(uuid) to authenticated;
revoke execute on function public.send_message(uuid, text, text, uuid) from public, anon;
grant execute on function public.send_message(uuid, text, text, uuid) to authenticated;
