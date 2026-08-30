-- ===============================================================
-- Chat paging and incremental sync.
-- ===============================================================
--
-- Full-thread re-reads are acceptable for a tiny MVP, but they do not
-- scale once chats accumulate real history and media. Add two additive
-- readers:
--
-- - conversation_messages_page: recent-first paging, returned in ASC
-- - conversation_messages_after: append-only catch-up after a cursor
--
-- Both keep the same privacy rule as the existing chat reader: only
-- the two people in the conversation may read the rows.
-- ===============================================================

create index if not exists messages_conversation_created_id_idx
  on public.messages (conversation_id, created_at desc, id desc);

create or replace function public.conversation_messages_page(
  target_conversation_id uuid,
  before_created_at timestamptz default null,
  before_id uuid default null,
  page_size integer default 40
)
returns table (
  id uuid,
  sender_id uuid,
  body text,
  is_system boolean,
  is_mine boolean,
  latitude double precision,
  longitude double precision,
  place_label text,
  media_path text,
  media_kind text,
  media_width integer,
  media_height integer,
  created_at timestamptz
)
language sql security definer set search_path = '' as $$
  with slice as (
    select
      msg.id, msg.sender_id, msg.body, msg.is_system, (msg.sender_id = auth.uid()) as is_mine,
      msg.latitude, msg.longitude, msg.place_label,
      msg.media_path, msg.media_kind, msg.media_width, msg.media_height, msg.created_at
    from public.messages msg
    join public.conversations c on c.id = msg.conversation_id
    where msg.conversation_id = target_conversation_id
      and auth.uid() in (c.person_low, c.person_high)
      and (
        before_created_at is null
        or msg.created_at < before_created_at
        or (msg.created_at = before_created_at and before_id is not null and msg.id < before_id)
      )
    order by msg.created_at desc, msg.id desc
    limit greatest(1, least(coalesce(page_size, 40), 100))
  )
  select *
  from slice
  order by created_at asc, id asc;
$$;
grant execute on function public.conversation_messages_page(uuid, timestamptz, uuid, integer) to authenticated;

create or replace function public.conversation_messages_after(
  target_conversation_id uuid,
  after_created_at timestamptz,
  after_id uuid default null,
  page_size integer default 100
)
returns table (
  id uuid,
  sender_id uuid,
  body text,
  is_system boolean,
  is_mine boolean,
  latitude double precision,
  longitude double precision,
  place_label text,
  media_path text,
  media_kind text,
  media_width integer,
  media_height integer,
  created_at timestamptz
)
language sql security definer set search_path = '' as $$
  select
    msg.id, msg.sender_id, msg.body, msg.is_system, (msg.sender_id = auth.uid()) as is_mine,
    msg.latitude, msg.longitude, msg.place_label,
    msg.media_path, msg.media_kind, msg.media_width, msg.media_height, msg.created_at
  from public.messages msg
  join public.conversations c on c.id = msg.conversation_id
  where msg.conversation_id = target_conversation_id
    and auth.uid() in (c.person_low, c.person_high)
    and (
      msg.created_at > after_created_at
      or (msg.created_at = after_created_at and after_id is not null and msg.id > after_id)
    )
  order by msg.created_at asc, msg.id asc
  limit greatest(1, least(coalesce(page_size, 100), 200));
$$;
grant execute on function public.conversation_messages_after(uuid, timestamptz, uuid, integer) to authenticated;
