-- ---------------------------------------------------------------
-- Replying to a message, and reacting to one.
--
-- Two things people take for granted in a messenger and notice the absence
-- of immediately. The chat UI already renders both — the library models
-- `replyMessage` and `reactions` on its message type — so this is the half
-- that has to be true on the server: what is stored, who may store it, and
-- who may see it.
-- ---------------------------------------------------------------

-- A reply points at another message, and must not point outside its own
-- conversation. A plain FK to messages(id) would allow exactly that: quote a
-- message from a room you are no longer in and its text would render inside
-- one you are. The composite FK makes it structurally impossible rather than
-- checked, which needs a unique key on the pair to reference.
alter table public.messages
  add constraint messages_id_conversation_key unique (id, conversation_id);

alter table public.messages
  add column reply_to_id uuid,
  add constraint messages_reply_same_conversation
    foreign key (reply_to_id, conversation_id)
    references public.messages (id, conversation_id)
    -- The column list is not optional here. A composite `on delete set null`
    -- nulls EVERY referencing column, and `conversation_id` is NOT NULL, so
    -- without naming `reply_to_id` deleting a quoted message fails outright.
    -- Postgres 15 added this form; the suite proves it by deleting one.
    on delete set null (reply_to_id);

comment on column public.messages.reply_to_id is
  'The message this one quotes, always within the same conversation. Set null '
  'rather than cascading when the quoted message goes, so the reply survives '
  'and simply stops quoting.';

create index messages_reply_to_idx on public.messages (reply_to_id)
  where reply_to_id is not null;

-- ---------------------------------------------------------------
-- Reactions.
--
-- The primary key is the whole rule: one of each emoji, per person, per
-- message. A count is therefore people, not taps — the same property that
-- makes a confirmation count honest.
-- ---------------------------------------------------------------
create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  reactor_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (message_id, reactor_id, emoji)
);

create index message_reactions_message_idx on public.message_reactions (message_id);

-- Not client-readable and not client-writable. RLS on with no policies, and no
-- grant, denies every authenticated path outright — which is stronger than a
-- policy, and honest about how this table is actually used: every read goes
-- through `reactions_for_message` and every write through
-- `toggle_message_reaction`, both definers.
--
-- Policies were written here first and then removed. They looked like access
-- control and were dead code: without a table grant RLS is never consulted, so
-- they would have implied a client path that does not exist.
alter table public.message_reactions enable row level security;

-- ---------------------------------------------------------------
-- Toggling, as one round trip.
--
-- A function rather than an insert and a delete, because the client needs the
-- resulting set back to redraw the pills, and because "tap to add, tap again
-- to remove" is one intention and should not be two statements that can half
-- apply.
-- ---------------------------------------------------------------
create or replace function public.toggle_message_reaction(
  target_message_id uuid,
  reaction_emoji text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  trimmed text := btrim(reaction_emoji);
  room uuid;
  removed integer;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if char_length(trimmed) < 1 or char_length(trimmed) > 8 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  select m.conversation_id into room
  from public.messages m
  where m.id = target_message_id;

  if room is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if not private.is_conversation_party(room) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  -- A closed room is read-only, the same rule messages follow: coordination
  -- that has ended should not keep accumulating.
  if exists (
    select 1 from public.conversations c
    where c.id = room and (c.closed_at is not null or c.expires_at <= now())
  ) then
    raise exception 'conversation_closed' using errcode = '40001';
  end if;

  delete from public.message_reactions r
  where r.message_id = target_message_id
    and r.reactor_id = actor
    and r.emoji = trimmed;

  get diagnostics removed = row_count;

  if removed = 0 then
    insert into public.message_reactions (message_id, reactor_id, emoji)
    values (target_message_id, actor, trimmed);
  end if;

  return public.reactions_for_message(target_message_id);
end;
$$;

-- ---------------------------------------------------------------
-- The shape the chat UI wants: one row per emoji, with who reacted.
--
--   [{ "emoji": "👍", "userIds": ["me"] }, ...]
--
-- Reactor ids are mapped to 'me' or 'them' rather than passed through. The
-- library only needs to know whether the current viewer is among them, to
-- draw the pill as active; the actual account ids are of no use to it and
-- every id that leaves the server is one that can be correlated.
-- ---------------------------------------------------------------
create or replace function public.reactions_for_message(target_message_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object('emoji', r.emoji, 'userIds', r.who)
      order by r.first_at
    ),
    '[]'::jsonb
  )
  from (
    select
      x.emoji,
      min(x.created_at) as first_at,
      jsonb_agg(distinct case when x.reactor_id = auth.uid() then 'me' else 'them' end) as who
    from public.message_reactions x
    where x.message_id = target_message_id
    group by x.emoji
  ) r;
$$;

-- Realtime, so a reaction appears on the other phone without a poll. Guarded
-- the way the existing chat migration guards it, so a plain local Postgres
-- with no Supabase publication still applies this file.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'message_reactions'
    ) then
      execute 'alter publication supabase_realtime add table public.message_reactions';
    end if;
  end if;
end $$;

revoke execute on function public.toggle_message_reaction(uuid, text) from public, anon;
grant execute on function public.toggle_message_reaction(uuid, text) to authenticated;
revoke execute on function public.reactions_for_message(uuid) from public, anon;
grant execute on function public.reactions_for_message(uuid) to authenticated;
