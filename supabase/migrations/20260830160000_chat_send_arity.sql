-- ===============================================================
-- One canonical signature per send.
-- ===============================================================
--
-- The receipts and media-lifecycle work each grew a wider overload of
-- send_message / send_location / send_media and left the narrower ones
-- in place. Three overloads of one name is not a compatibility layer,
-- it is a resolution hazard:
--
--   * PostgREST resolves an RPC by ARGUMENT NAME, and none of the new
--     overloads declared a default, so a send that omitted an optional
--     key -- a photo with no caption, a GIF with no thumbnail, a
--     location with no label -- matched no overload at all and failed.
--   * the generated TypeScript turns the same overloads into a union,
--     so the client could not describe a call that satisfied it.
--
-- So: one function per send, every optional argument carrying a real
-- default. Positional callers keep working unchanged, a named call may
-- supply any subset, and the generated types collapse back to one
-- honest shape. Bodies are unchanged from the migrations that
-- introduced them, directive included.
-- ===============================================================

drop function if exists public.send_message(uuid, text);
drop function if exists public.send_message(uuid, text, text);
drop function if exists public.send_location(uuid, double precision, double precision, text);
drop function if exists public.send_location(uuid, double precision, double precision, text, text);
drop function if exists public.send_media(uuid, text, text, integer, integer, text);
drop function if exists public.send_media(uuid, text, text, integer, integer, text, text);
drop function if exists public.send_media(uuid, text, text, integer, integer, text, text, text);

create or replace function public.send_message(
  target_conversation_id uuid,
  message_body text,
  client_message_id text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  sender uuid := private.assert_can_send(target_conversation_id);
  trimmed text := btrim(message_body);
  new_id uuid;
begin
  if char_length(trimmed) < 1 or char_length(trimmed) > 2000 then
    raise exception 'message_out_of_range' using errcode = '23514';
  end if;

  if client_message_id is not null and char_length(btrim(client_message_id)) > 0 then
    insert into public.messages (conversation_id, sender_id, body, is_system, client_message_id)
    values (target_conversation_id, sender, trimmed, false, btrim(client_message_id))
    on conflict (conversation_id, sender_id, client_message_id)
    where client_message_id is not null
    do update set body = excluded.body
    returning id into new_id;
  else
    insert into public.messages (conversation_id, sender_id, body, is_system)
    values (target_conversation_id, sender, trimmed, false)
    returning id into new_id;
  end if;

  perform private.seed_message_receipt(new_id, target_conversation_id, sender);
  return new_id;
end;
$$;

create or replace function public.send_location(
  target_conversation_id uuid,
  share_latitude double precision,
  share_longitude double precision,
  label text default null,
  client_message_id text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  sender uuid := private.assert_can_send(target_conversation_id);
  new_id uuid;
  trimmed_label text := nullif(btrim(coalesce(label, '')), '');
begin
  if share_latitude is null or share_longitude is null then
    raise exception 'no_location' using errcode = '23514';
  end if;

  if client_message_id is not null and char_length(btrim(client_message_id)) > 0 then
    insert into public.messages (
      conversation_id, sender_id, body, is_system, latitude, longitude, place_label, client_message_id
    )
    values (
      target_conversation_id, sender, coalesce(trimmed_label, ''), false,
      round(share_latitude::numeric, 4)::double precision,
      round(share_longitude::numeric, 4)::double precision,
      trimmed_label,
      btrim(client_message_id)
    )
    on conflict (conversation_id, sender_id, client_message_id)
    where client_message_id is not null
    do update
      set latitude = excluded.latitude,
          longitude = excluded.longitude,
          place_label = excluded.place_label,
          body = excluded.body
    returning id into new_id;
  else
    insert into public.messages (conversation_id, sender_id, body, is_system, latitude, longitude, place_label)
    values (
      target_conversation_id, sender, coalesce(trimmed_label, ''), false,
      round(share_latitude::numeric, 4)::double precision,
      round(share_longitude::numeric, 4)::double precision,
      trimmed_label
    )
    returning id into new_id;
  end if;

  perform private.seed_message_receipt(new_id, target_conversation_id, sender);
  return new_id;
end;
$$;

create or replace function public.send_media(
  target_conversation_id uuid,
  path text,
  kind text,
  width integer default null,
  height integer default null,
  caption text default null,
  client_message_id text default null,
  thumb_path text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  sender uuid := private.assert_can_send(target_conversation_id);
  new_id uuid;
  trimmed_caption text := coalesce(btrim(caption), '');
  normalized_client_message_id text := nullif(btrim(client_message_id), '');
  normalized_thumb_path text := nullif(btrim(thumb_path), '');
begin
  if kind is null or kind not in ('image', 'gif') then
    raise exception 'unsupported_media_kind' using errcode = '23514';
  end if;
  if path is null or path not like (target_conversation_id::text || '/%') then
    raise exception 'media_path_outside_conversation' using errcode = '42501';
  end if;
  if normalized_thumb_path is not null and normalized_thumb_path not like (target_conversation_id::text || '/%') then
    raise exception 'media_thumb_path_outside_conversation' using errcode = '42501';
  end if;
  if kind = 'gif' and normalized_thumb_path is not null then
    raise exception 'gif_thumb_not_supported' using errcode = '23514';
  end if;
  -- An image always ends up with a thumbnail path. The app uploads a
  -- real one; a caller that supplies none (every positional caller, and
  -- the wrapper overloads this function replaces) stands the full-size
  -- object in, rather than being refused the send.
  if kind = 'image' and normalized_thumb_path is null then
    normalized_thumb_path := path;
  end if;
  if caption is not null and char_length(caption) > 2000 then
    raise exception 'message_out_of_range' using errcode = '23514';
  end if;

  if normalized_client_message_id is not null then
    insert into public.messages
      (
        conversation_id,
        sender_id,
        body,
        is_system,
        media_path,
        media_kind,
        media_thumb_path,
        media_width,
        media_height,
        client_message_id
      )
    values
      (
        target_conversation_id,
        sender,
        trimmed_caption,
        false,
        path,
        kind,
        normalized_thumb_path,
        width,
        height,
        normalized_client_message_id
      )
    on conflict (conversation_id, sender_id, client_message_id)
    where client_message_id is not null
    do update
      set body = excluded.body,
          media_path = excluded.media_path,
          media_kind = excluded.media_kind,
          media_thumb_path = excluded.media_thumb_path,
          media_width = excluded.media_width,
          media_height = excluded.media_height
    returning id into new_id;
  else
    insert into public.messages
      (
        conversation_id,
        sender_id,
        body,
        is_system,
        media_path,
        media_kind,
        media_thumb_path,
        media_width,
        media_height
      )
    values
      (
        target_conversation_id,
        sender,
        trimmed_caption,
        false,
        path,
        kind,
        normalized_thumb_path,
        width,
        height
      )
    returning id into new_id;
  end if;

  perform private.seed_message_receipt(new_id, target_conversation_id, sender);
  return new_id;
end;
$$;

grant execute on function public.send_message(uuid, text, text) to authenticated;
grant execute on function public.send_location(uuid, double precision, double precision, text, text) to authenticated;
grant execute on function public.send_media(uuid, text, text, integer, integer, text, text, text) to authenticated;
