-- ===============================================================
-- Chat media lifecycle: persisted thumbnails for images, plus a
-- conservative orphan cleanup path for uploads that never became rows.
-- ===============================================================

alter table public.messages
  add column if not exists media_thumb_path text
    check (media_thumb_path is null or char_length(media_thumb_path) between 3 and 400);

alter table public.messages drop constraint if exists messages_media_shape;
alter table public.messages
  add constraint messages_media_shape check (
    (
      media_path is null
      and media_kind is null
      and media_thumb_path is null
    )
    or (
      media_path is not null
      and media_kind is not null
      and (
        media_thumb_path is null
        or media_thumb_path like (split_part(media_path, '/', 1) || '/%')
      )
    )
  );

create or replace function public.send_media(
  target_conversation_id uuid,
  path text,
  kind text,
  width integer,
  height integer,
  caption text,
  client_message_id text,
  thumb_path text
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
  if kind = 'image' and normalized_thumb_path is null then
    raise exception 'image_thumb_required' using errcode = '23514';
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

create or replace function public.send_media(
  target_conversation_id uuid,
  path text,
  kind text,
  width integer,
  height integer,
  caption text,
  client_message_id text
)
returns uuid
language sql security definer set search_path = '' as $$
  select public.send_media(
    target_conversation_id,
    path,
    kind,
    width,
    height,
    caption,
    client_message_id,
    case when kind = 'image' then path else null end
  )
$$;

create or replace function public.send_media(
  target_conversation_id uuid,
  path text,
  kind text,
  width integer default null,
  height integer default null,
  caption text default null
)
returns uuid
language sql security definer set search_path = '' as $$
  select public.send_media(
    target_conversation_id,
    path,
    kind,
    width,
    height,
    caption,
    null,
    case when kind = 'image' then path else null end
  )
$$;

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
  media_thumb_path text,
  media_kind text,
  media_width integer,
  media_height integer,
  created_at timestamptz,
  client_message_id text,
  remote_status text
)
language sql security definer set search_path = '' as $$
  with convo as (
    select c.id, c.person_low, c.person_high
    from public.conversations c
    where c.id = target_conversation_id
      and auth.uid() in (c.person_low, c.person_high)
  )
  select
    msg.id,
    msg.sender_id,
    msg.body,
    msg.is_system,
    (msg.sender_id = auth.uid()),
    msg.latitude,
    msg.longitude,
    msg.place_label,
    msg.media_path,
    msg.media_thumb_path,
    msg.media_kind,
    msg.media_width,
    msg.media_height,
    msg.created_at,
    msg.client_message_id,
    case
      when msg.sender_id = auth.uid() and receipt.read_at is not null then 'read'
      when msg.sender_id = auth.uid() and receipt.delivered_at is not null then 'delivered'
      when msg.sender_id = auth.uid() then 'sent'
      else null
    end
  from convo
  join public.messages msg on msg.conversation_id = convo.id
  left join public.message_receipts receipt
    on receipt.message_id = msg.id
   and receipt.recipient_id = case when msg.sender_id = convo.person_low then convo.person_high else convo.person_low end
  order by msg.created_at asc, msg.id asc;
$$;

drop function if exists public.conversation_messages_page(uuid, timestamptz, uuid, integer);
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
  media_thumb_path text,
  media_kind text,
  media_width integer,
  media_height integer,
  created_at timestamptz,
  client_message_id text,
  remote_status text
)
language sql security definer set search_path = '' as $$
  with convo as (
    select c.id, c.person_low, c.person_high
    from public.conversations c
    where c.id = target_conversation_id
      and auth.uid() in (c.person_low, c.person_high)
  ),
  slice as (
    select
      msg.id,
      msg.sender_id,
      msg.body,
      msg.is_system,
      (msg.sender_id = auth.uid()) as is_mine,
      msg.latitude,
      msg.longitude,
      msg.place_label,
      msg.media_path,
      msg.media_thumb_path,
      msg.media_kind,
      msg.media_width,
      msg.media_height,
      msg.created_at,
      msg.client_message_id,
      case
        when msg.sender_id = auth.uid() and receipt.read_at is not null then 'read'
        when msg.sender_id = auth.uid() and receipt.delivered_at is not null then 'delivered'
        when msg.sender_id = auth.uid() then 'sent'
        else null
      end as remote_status
    from convo
    join public.messages msg on msg.conversation_id = convo.id
    left join public.message_receipts receipt
      on receipt.message_id = msg.id
     and receipt.recipient_id = case when msg.sender_id = convo.person_low then convo.person_high else convo.person_low end
    where (
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

drop function if exists public.conversation_messages_after(uuid, timestamptz, uuid, integer);
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
  media_thumb_path text,
  media_kind text,
  media_width integer,
  media_height integer,
  created_at timestamptz,
  client_message_id text,
  remote_status text
)
language sql security definer set search_path = '' as $$
  with convo as (
    select c.id, c.person_low, c.person_high
    from public.conversations c
    where c.id = target_conversation_id
      and auth.uid() in (c.person_low, c.person_high)
  )
  select
    msg.id,
    msg.sender_id,
    msg.body,
    msg.is_system,
    (msg.sender_id = auth.uid()) as is_mine,
    msg.latitude,
    msg.longitude,
    msg.place_label,
    msg.media_path,
    msg.media_thumb_path,
    msg.media_kind,
    msg.media_width,
    msg.media_height,
    msg.created_at,
    msg.client_message_id,
    case
      when msg.sender_id = auth.uid() and receipt.read_at is not null then 'read'
      when msg.sender_id = auth.uid() and receipt.delivered_at is not null then 'delivered'
      when msg.sender_id = auth.uid() then 'sent'
      else null
    end as remote_status
  from convo
  join public.messages msg on msg.conversation_id = convo.id
  left join public.message_receipts receipt
    on receipt.message_id = msg.id
   and receipt.recipient_id = case when msg.sender_id = convo.person_low then convo.person_high else convo.person_low end
  where (
    msg.created_at > after_created_at
    or (msg.created_at = after_created_at and after_id is not null and msg.id > after_id)
  )
  order by msg.created_at asc, msg.id asc
  limit greatest(1, least(coalesce(page_size, 100), 200));
$$;

create or replace function public.list_chat_media_orphans(
  older_than interval default interval '1 day',
  max_objects integer default 200
)
returns table (path text)
language plpgsql security definer set search_path = '' as $$
begin
  if to_regnamespace('storage') is null then
    return;
  end if;

  return query
    select o.name
    from storage.objects o
    where o.bucket_id = 'chat-media'
      and o.created_at < now() - coalesce(older_than, interval '1 day')
      and not exists (
        select 1
        from public.messages msg
        where msg.media_path = o.name
           or msg.media_thumb_path = o.name
      )
    order by o.created_at asc
    limit greatest(1, least(coalesce(max_objects, 200), 1000));
end;
$$;

revoke all on function public.list_chat_media_orphans(interval, integer) from public;
grant execute on function public.list_chat_media_orphans(interval, integer) to service_role;

do $$
begin
  if to_regnamespace('cron') is null or to_regnamespace('net') is null then
    raise notice 'chat media lifecycle: no cron/net schema — skipping schedule';
    return;
  end if;
  if to_regnamespace('vault') is null then
    raise notice 'chat media lifecycle: no vault schema — skipping schedule';
    return;
  end if;

  begin
    if not exists (select 1 from vault.decrypted_secrets where name = 'send_push_url')
       or not exists (select 1 from vault.decrypted_secrets where name = 'send_push_service_key') then
      raise notice 'chat media lifecycle: send_push_url/send_push_service_key missing — skipping schedule';
      return;
    end if;
  exception
    when others then
      raise notice 'chat media lifecycle: vault unreadable — skipping schedule';
      return;
  end;

  if exists (select 1 from cron.job where jobname = 'prune-chat-media-orphans') then
    perform cron.unschedule('prune-chat-media-orphans');
  end if;
  perform cron.schedule(
    'prune-chat-media-orphans',
    '17 * * * *',
    $cron$
      select net.http_post(
        url := regexp_replace(
          (select decrypted_secret from vault.decrypted_secrets where name = 'send_push_url'),
          '/send-push$',
          '/prune-chat-media'
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'send_push_service_key')
        ),
        body := '{"older_than":"1 day","max_objects":200}'::jsonb
      );
    $cron$
  );
end
$$;

grant execute on function public.send_media(uuid, text, text, integer, integer, text, text, text) to authenticated;
grant execute on function public.send_media(uuid, text, text, integer, integer, text, text) to authenticated;
grant execute on function public.send_media(uuid, text, text, integer, integer, text) to authenticated;
