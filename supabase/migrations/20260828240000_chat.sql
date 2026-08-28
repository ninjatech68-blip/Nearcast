-- ---------------------------------------------------------------
-- Chat on the backend: the private conversation a match opens.
--
-- accept_response already creates one conversations row per match.
-- This makes it a working 1-to-1 chat: list my conversations with
-- unread counts, read a conversation, send text or an approximate
-- location, mark it read, and change the window (extend / end).
--
-- Free tier only: Supabase Auth + PostgreSQL + Realtime. No Storage —
-- emojis are just text, and a shared location is two numbers and a
-- label, not a file. Realtime is enabled by adding `messages` to the
-- supabase_realtime publication (guarded so a plain local Postgres,
-- which has no such publication, still applies this migration).
--
-- Keyed by CONVERSATION id: one cast can accept several joiners, so it
-- has several conversations, one per pair. Each is private to its two
-- parties — enforced by the base-table RLS, which Realtime also honours
-- so a subscriber only ever receives rows from their own chats.
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- 1. messages carry a kind, and a location share carries a pin
-- ---------------------------------------------------------------
-- A shared pin is rounded to ~11m (4 dp): enough to find a café,
-- never a person's exact position. Chat is private, not a
-- discoverable row, but the app's approximate-by-default stance holds
-- even here.
alter table public.messages
  add column latitude double precision,
  add column longitude double precision,
  add column place_label text check (place_label is null or char_length(place_label) <= 120);

-- body may be empty for a pure location share, so relax the length
-- floor to allow a location message with no words.
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages
  add constraint messages_body_shape check (
    char_length(body) <= 2000
    and (char_length(btrim(body)) >= 1 or latitude is not null)
  );

-- ---------------------------------------------------------------
-- 2. read tracking: one row per (conversation, reader)
-- ---------------------------------------------------------------
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

alter table public.conversation_reads enable row level security;
create policy reads_owner_all on public.conversation_reads for all to authenticated
using (profile_id = auth.uid()) with check (profile_id = auth.uid());
grant select, insert, update, delete on public.conversation_reads to authenticated;

-- ---------------------------------------------------------------
-- 3. realtime — guarded for the local harness
-- ---------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end $$;

-- ---------------------------------------------------------------
-- 4. functions
-- ---------------------------------------------------------------

/** conversations I'm in, most-recently-active first, with unread count. */
create or replace function public.my_conversations()
returns table (
  conversation_id uuid,
  intent_id uuid,
  cast_title text,
  other_id uuid,
  other_first_name text,
  mode public.conversation_mode,
  expires_at timestamptz,
  last_message text,
  last_at timestamptz,
  unread_count bigint,
  other_last_read_at timestamptz
)
language sql security definer set search_path = '' as $$
  select
    c.id,
    i.id,
    i.statement,
    case when m.broadcaster_id = auth.uid() then m.participant_id else m.broadcaster_id end,
    split_part(p.display_name, ' ', 1),
    c.mode,
    c.expires_at,
    (select case when msg.latitude is not null and char_length(btrim(msg.body)) = 0
                 then '📍 location'
                 else msg.body end
       from public.messages msg where msg.conversation_id = c.id
       order by msg.created_at desc limit 1),
    coalesce(
      (select created_at from public.messages msg where msg.conversation_id = c.id order by msg.created_at desc limit 1),
      c.created_at
    ),
    (select count(*) from public.messages msg
      where msg.conversation_id = c.id
        and msg.sender_id <> auth.uid()
        and msg.created_at > coalesce(
          (select r.last_read_at from public.conversation_reads r
            where r.conversation_id = c.id and r.profile_id = auth.uid()),
          '-infinity'::timestamptz)),
    (select r.last_read_at from public.conversation_reads r
      where r.conversation_id = c.id
        and r.profile_id = case when m.broadcaster_id = auth.uid() then m.participant_id else m.broadcaster_id end)
  from public.conversations c
  join public.matches m on m.id = c.match_id
  join public.intents i on i.id = m.intent_id
  join public.profiles p
    on p.id = case when m.broadcaster_id = auth.uid() then m.participant_id else m.broadcaster_id end
  where auth.uid() in (m.broadcaster_id, m.participant_id)
  order by 9 desc;
$$;

/** the messages in one conversation, oldest first. */
create or replace function public.conversation_messages(target_conversation_id uuid)
returns table (
  id uuid,
  sender_id uuid,
  body text,
  is_system boolean,
  is_mine boolean,
  latitude double precision,
  longitude double precision,
  place_label text,
  created_at timestamptz
)
language sql security definer set search_path = '' as $$
  select
    msg.id, msg.sender_id, msg.body, msg.is_system,
    (msg.sender_id = auth.uid()),
    msg.latitude, msg.longitude, msg.place_label, msg.created_at
  from public.messages msg
  join public.conversations c on c.id = msg.conversation_id
  join public.matches m on m.id = c.match_id
  where msg.conversation_id = target_conversation_id
    and auth.uid() in (m.broadcaster_id, m.participant_id)
  order by msg.created_at asc;
$$;

/** guard shared by both send paths. returns the sender or raises. */
create or replace function private.assert_can_send(target_conversation_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  sender uuid := auth.uid();
  is_party boolean;
  is_open boolean;
begin
  if sender is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select auth.uid() in (m.broadcaster_id, m.participant_id),
         c.closed_at is null and c.mode <> 'ended'
    into is_party, is_open
  from public.conversations c join public.matches m on m.id = c.match_id
  where c.id = target_conversation_id;
  if is_party is null then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
  if not is_party then raise exception 'not_a_party' using errcode = '42501'; end if;
  if not is_open then raise exception 'conversation_ended' using errcode = '23514'; end if;
  return sender;
end;
$$;

/** send a text message (emojis are just text). */
create or replace function public.send_message(target_conversation_id uuid, message_body text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  sender uuid := private.assert_can_send(target_conversation_id);
  new_id uuid;
begin
  if char_length(btrim(message_body)) < 1 or char_length(btrim(message_body)) > 2000 then
    raise exception 'message_out_of_range' using errcode = '23514';
  end if;
  insert into public.messages (conversation_id, sender_id, body, is_system)
  values (target_conversation_id, sender, btrim(message_body), false)
  returning id into new_id;
  return new_id;
end;
$$;

/** share an approximate location. rounded to ~11m before it is stored. */
create or replace function public.send_location(
  target_conversation_id uuid,
  share_latitude double precision,
  share_longitude double precision,
  label text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  sender uuid := private.assert_can_send(target_conversation_id);
  new_id uuid;
begin
  if share_latitude is null or share_longitude is null then
    raise exception 'no_location' using errcode = '23514';
  end if;
  insert into public.messages (conversation_id, sender_id, body, is_system, latitude, longitude, place_label)
  values (
    target_conversation_id, sender, coalesce(btrim(label), ''), false,
    round(share_latitude::numeric, 4)::double precision,
    round(share_longitude::numeric, 4)::double precision,
    nullif(btrim(coalesce(label, '')), '')
  )
  returning id into new_id;
  return new_id;
end;
$$;

/** mark everything up to now as read for me in this conversation. */
create or replace function public.mark_conversation_read(target_conversation_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  reader uuid := auth.uid();
begin
  if reader is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.conversations c join public.matches m on m.id = c.match_id
    where c.id = target_conversation_id and auth.uid() in (m.broadcaster_id, m.participant_id)
  ) then
    raise exception 'not_a_party' using errcode = '42501';
  end if;
  insert into public.conversation_reads (conversation_id, profile_id, last_read_at)
  values (target_conversation_id, reader, now())
  on conflict (conversation_id, profile_id) do update set last_read_at = now();
end;
$$;

/** change the chat window: extend (day/week/always) or end it. */
create or replace function public.set_conversation_mode(
  target_conversation_id uuid,
  next_mode public.conversation_mode
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  is_party boolean;
  next_expiry timestamptz;
  note text;
begin
  if actor is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select auth.uid() in (m.broadcaster_id, m.participant_id) into is_party
  from public.conversations c join public.matches m on m.id = c.match_id
  where c.id = target_conversation_id;
  if is_party is null then raise exception 'conversation_not_found' using errcode = 'P0002'; end if;
  if not is_party then raise exception 'not_a_party' using errcode = '42501'; end if;

  next_expiry := case next_mode
    when 'day' then now() + interval '24 hours'
    when 'week' then now() + interval '7 days'
    else null
  end;
  update public.conversations
  set mode = next_mode,
      expires_at = case when next_mode = 'ended' then expires_at else next_expiry end,
      closed_at = case when next_mode = 'ended' then now() else closed_at end
  where id = target_conversation_id and mode <> 'ended';

  note := case next_mode
    when 'ended' then 'this chat is ended. no new messages.'
    when 'always' then 'you both agreed to keep this chat open. no expiry now.'
    when 'week' then 'chat window reset to 7 days.'
    else 'chat window reset to 24h.'
  end;
  insert into public.messages (conversation_id, sender_id, body, is_system)
  values (target_conversation_id, actor, note, true);
end;
$$;

grant execute on function public.my_conversations() to authenticated;
grant execute on function public.conversation_messages(uuid) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.send_location(uuid, double precision, double precision, text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.set_conversation_mode(uuid, public.conversation_mode) to authenticated;
revoke execute on function private.assert_can_send(uuid) from public, anon;
