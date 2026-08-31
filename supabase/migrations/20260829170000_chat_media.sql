-- ===============================================================
-- Chat media: photos and GIFs, private to the two people in the room.
-- ===============================================================
--
-- Chat is where a plan gets settled, and settling it needs a picture
-- of the noticeboard, the court, the table you grabbed. Until now the
-- room carried text and an approximate pin and nothing else.
--
-- Privacy shape, unchanged from the rest of chat:
--   - the bucket is PRIVATE. Nothing is served by a guessable public
--     URL; the app asks for a short-lived signed URL per render.
--   - an object lives under `<conversation_id>/…`, and the storage
--     policies let only that conversation's two parties read or write
--     there. A third party cannot list, fetch or upload, even holding
--     the exact path.
--   - the message row stores a PATH, never a URL, so a leaked row is
--     not a leaked photo.
--   - EXIF is stripped on the device before upload (expo-image-picker
--     re-encodes), so a photo does not carry the exact coordinates the
--     rest of the product refuses to store.
--
-- Push and analytics still carry nothing of this: the outbox holds a
-- kind and ids, and a media message is no different.
-- ===============================================================

-- ---------------------------------------------------------------
-- 1. the message columns
-- ---------------------------------------------------------------
alter table public.messages
  add column if not exists media_path text
    check (media_path is null or char_length(media_path) between 3 and 400),
  add column if not exists media_kind text
    check (media_kind is null or media_kind in ('image', 'gif')),
  add column if not exists media_width integer check (media_width is null or media_width between 1 and 20000),
  add column if not exists media_height integer check (media_height is null or media_height between 1 and 20000);

-- a media message may carry no words, exactly as a location share may
alter table public.messages drop constraint if exists messages_body_shape;
alter table public.messages
  add constraint messages_body_shape check (
    char_length(body) <= 2000
    and (char_length(btrim(body)) >= 1 or latitude is not null or media_path is not null)
  );

-- path and kind travel together or not at all
alter table public.messages drop constraint if exists messages_media_shape;
alter table public.messages
  add constraint messages_media_shape check (
    (media_path is null and media_kind is null)
    or (media_path is not null and media_kind is not null)
  );

-- ---------------------------------------------------------------
-- 2. am I one of this conversation's two people?
-- ---------------------------------------------------------------
-- Used by the storage policies, which cannot see `matches` directly
-- under RLS. Definer, and it answers only about the CALLER.
create or replace function private.is_conversation_party(target_conversation_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1
    from public.conversations c
    join public.matches m on m.id = c.match_id
    where c.id = target_conversation_id
      and auth.uid() in (m.broadcaster_id, m.participant_id)
  );
$$;
grant execute on function private.is_conversation_party(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 3. send a photo or a GIF
-- ---------------------------------------------------------------
-- The upload happens first, client-side, into the path this then
-- records. `assert_can_send` is the same guard the text and location
-- paths use, so an ended or foreign conversation is refused here too.
create or replace function public.send_media(
  target_conversation_id uuid,
  path text,
  kind text,
  width integer default null,
  height integer default null,
  caption text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  sender uuid := private.assert_can_send(target_conversation_id);
  new_id uuid;
begin
  if kind is null or kind not in ('image', 'gif') then
    raise exception 'unsupported_media_kind' using errcode = '23514';
  end if;
  -- the path must live under this conversation's folder, or the
  -- storage policies and the message row would disagree about who may
  -- read it.
  if path is null or path not like (target_conversation_id::text || '/%') then
    raise exception 'media_path_outside_conversation' using errcode = '42501';
  end if;
  if caption is not null and char_length(caption) > 2000 then
    raise exception 'message_out_of_range' using errcode = '23514';
  end if;

  insert into public.messages
    (conversation_id, sender_id, body, is_system, media_path, media_kind, media_width, media_height)
  values
    (target_conversation_id, sender, coalesce(btrim(caption), ''), false, path, kind, width, height)
  returning id into new_id;
  return new_id;
end;
$$;
grant execute on function public.send_media(uuid, text, text, integer, integer, text) to authenticated;

-- ---------------------------------------------------------------
-- 4. the readers return the media too
-- ---------------------------------------------------------------
drop function if exists public.conversation_messages(uuid);
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
  media_path text,
  media_kind text,
  media_width integer,
  media_height integer,
  created_at timestamptz
)
language sql security definer set search_path = '' as $$
  select
    msg.id, msg.sender_id, msg.body, msg.is_system,
    (msg.sender_id = auth.uid()),
    msg.latitude, msg.longitude, msg.place_label,
    msg.media_path, msg.media_kind, msg.media_width, msg.media_height,
    msg.created_at
  from public.messages msg
  join public.conversations c on c.id = msg.conversation_id
  join public.matches m on m.id = c.match_id
  where msg.conversation_id = target_conversation_id
    and auth.uid() in (m.broadcaster_id, m.participant_id)
  order by msg.created_at asc;
$$;
grant execute on function public.conversation_messages(uuid) to authenticated;

-- the conversation list preview: a photo is described, never shown, and
-- its caption is not leaked into a row the list renders in the clear.
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
    (select case
              when msg.media_kind = 'gif' then 'GIF'
              when msg.media_kind = 'image' then 'photo'
              when msg.latitude is not null and char_length(btrim(msg.body)) = 0 then 'location'
              else msg.body
            end
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
grant execute on function public.my_conversations() to authenticated;

-- ---------------------------------------------------------------
-- 5. the private bucket and its policies
-- ---------------------------------------------------------------
-- Guarded: the headless local database in scripts/db-local.sh has no
-- storage schema, and a migration that only applied on the hosted
-- project would split the schema in two.
do $$
begin
  if to_regnamespace('storage') is null then
    raise notice 'chat media: no storage schema — skipping bucket and policies';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'chat-media', 'chat-media', false, 10485760,
    array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic']
  )
  on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  execute 'drop policy if exists chat_media_read on storage.objects';
  execute $p$
    create policy chat_media_read on storage.objects for select to authenticated
    using (
      bucket_id = 'chat-media'
      and private.is_conversation_party(((storage.foldername(name))[1])::uuid)
    )
  $p$;

  execute 'drop policy if exists chat_media_write on storage.objects';
  execute $p$
    create policy chat_media_write on storage.objects for insert to authenticated
    with check (
      bucket_id = 'chat-media'
      and owner = auth.uid()
      and private.is_conversation_party(((storage.foldername(name))[1])::uuid)
    )
  $p$;

  -- no update policy: an uploaded photo is not editable in place.
  execute 'drop policy if exists chat_media_delete on storage.objects';
  execute $p$
    create policy chat_media_delete on storage.objects for delete to authenticated
    using (bucket_id = 'chat-media' and owner = auth.uid())
  $p$;

  raise notice 'chat media: bucket and policies in place';
end
$$;
