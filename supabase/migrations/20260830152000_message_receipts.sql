-- ===============================================================
-- Message receipts and stable client ids for chat.
-- ===============================================================
--
-- Chat already had unread state at the conversation level, but the UI
-- still had to guess message status locally. Add:
--
-- - a client_message_id to reconcile client sends with stored rows
-- - per-recipient delivery/read receipts
-- - additive send and ack functions that keep one-to-one chat private
-- ===============================================================

alter table public.messages
  add column if not exists client_message_id text
    check (client_message_id is null or char_length(client_message_id) between 8 and 120);

create unique index if not exists messages_client_message_id_uq
  on public.messages (conversation_id, sender_id, client_message_id)
  where client_message_id is not null;

create table if not exists public.message_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  primary key (message_id, recipient_id)
);

create index if not exists message_receipts_recipient_read_idx
  on public.message_receipts (recipient_id, read_at, delivered_at);

alter table public.message_receipts enable row level security;

drop policy if exists message_receipts_parties_read on public.message_receipts;
create policy message_receipts_parties_read on public.message_receipts for select to authenticated
using (
  exists (
    select 1
    from public.messages msg
    join public.conversations c on c.id = msg.conversation_id
    where msg.id = message_id
      and auth.uid() in (c.person_low, c.person_high)
  )
);

drop policy if exists message_receipts_recipient_write on public.message_receipts;
create policy message_receipts_recipient_write on public.message_receipts for insert to authenticated
with check (recipient_id = auth.uid());

drop policy if exists message_receipts_recipient_update on public.message_receipts;
create policy message_receipts_recipient_update on public.message_receipts for update to authenticated
using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

grant select, insert, update on public.message_receipts to authenticated;

create or replace function private.other_party_id(target_conversation_id uuid, actor uuid)
returns uuid
language sql security definer stable set search_path = '' as $$
  select case when c.person_low = actor then c.person_high else c.person_low end
  from public.conversations c
  where c.id = target_conversation_id
    and actor in (c.person_low, c.person_high)
$$;
grant execute on function private.other_party_id(uuid, uuid) to authenticated;

create or replace function private.seed_message_receipt(
  target_message_id uuid,
  target_conversation_id uuid,
  sender uuid
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid := private.other_party_id(target_conversation_id, sender);
begin
  if recipient is null then
    return;
  end if;

  insert into public.message_receipts (message_id, recipient_id)
  values (target_message_id, recipient)
  on conflict (message_id, recipient_id) do nothing;
end;
$$;
grant execute on function private.seed_message_receipt(uuid, uuid, uuid) to authenticated;

create or replace function public.send_message(
  target_conversation_id uuid,
  message_body text,
  client_message_id text
)
returns uuid
language plpgsql security definer set search_path = '' as $$
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

create or replace function public.send_message(target_conversation_id uuid, message_body text)
returns uuid
language sql security definer set search_path = '' as $$
  select public.send_message(target_conversation_id, message_body, null)
$$;

create or replace function public.send_location(
  target_conversation_id uuid,
  share_latitude double precision,
  share_longitude double precision,
  label text,
  client_message_id text
)
returns uuid
language plpgsql security definer set search_path = '' as $$
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

create or replace function public.send_location(
  target_conversation_id uuid,
  share_latitude double precision,
  share_longitude double precision,
  label text default null
)
returns uuid
language sql security definer set search_path = '' as $$
  select public.send_location(target_conversation_id, share_latitude, share_longitude, label, null)
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
language plpgsql security definer set search_path = '' as $$
declare
  sender uuid := private.assert_can_send(target_conversation_id);
  new_id uuid;
  trimmed_caption text := coalesce(btrim(caption), '');
begin
  if kind is null or kind not in ('image', 'gif') then
    raise exception 'unsupported_media_kind' using errcode = '23514';
  end if;
  if path is null or path not like (target_conversation_id::text || '/%') then
    raise exception 'media_path_outside_conversation' using errcode = '42501';
  end if;
  if caption is not null and char_length(caption) > 2000 then
    raise exception 'message_out_of_range' using errcode = '23514';
  end if;

  if client_message_id is not null and char_length(btrim(client_message_id)) > 0 then
    insert into public.messages
      (conversation_id, sender_id, body, is_system, media_path, media_kind, media_width, media_height, client_message_id)
    values
      (target_conversation_id, sender, trimmed_caption, false, path, kind, width, height, btrim(client_message_id))
    on conflict (conversation_id, sender_id, client_message_id)
    where client_message_id is not null
    do update
      set body = excluded.body,
          media_path = excluded.media_path,
          media_kind = excluded.media_kind,
          media_width = excluded.media_width,
          media_height = excluded.media_height
    returning id into new_id;
  else
    insert into public.messages
      (conversation_id, sender_id, body, is_system, media_path, media_kind, media_width, media_height)
    values
      (target_conversation_id, sender, trimmed_caption, false, path, kind, width, height)
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
  caption text default null
)
returns uuid
language sql security definer set search_path = '' as $$
  select public.send_media(target_conversation_id, path, kind, width, height, caption, null)
$$;

create or replace function public.mark_conversation_delivered(target_conversation_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  delivered_at_now timestamptz := now();
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.conversations c
    where c.id = target_conversation_id
      and actor in (c.person_low, c.person_high)
  ) then
    raise exception 'not_a_party' using errcode = '42501';
  end if;

  insert into public.message_receipts (message_id, recipient_id, delivered_at)
  select msg.id, actor, delivered_at_now
  from public.messages msg
  where msg.conversation_id = target_conversation_id
    and msg.sender_id is distinct from actor
  on conflict (message_id, recipient_id) do update
    set delivered_at = coalesce(public.message_receipts.delivered_at, excluded.delivered_at);
end;
$$;

create or replace function public.mark_conversation_read(target_conversation_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  reader uuid := auth.uid();
  stamp timestamptz := now();
begin
  if reader is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.conversations c
    where c.id = target_conversation_id
      and reader in (c.person_low, c.person_high)
  ) then
    raise exception 'not_a_party' using errcode = '42501';
  end if;

  perform public.mark_conversation_delivered(target_conversation_id);

  insert into public.conversation_reads (conversation_id, profile_id, last_read_at)
  values (target_conversation_id, reader, stamp)
  on conflict (conversation_id, profile_id) do update
    set last_read_at = greatest(public.conversation_reads.last_read_at, excluded.last_read_at);

  insert into public.message_receipts (message_id, recipient_id, delivered_at, read_at)
  select msg.id, reader, stamp, stamp
  from public.messages msg
  where msg.conversation_id = target_conversation_id
    and msg.sender_id is distinct from reader
  on conflict (message_id, recipient_id) do update
    set delivered_at = coalesce(public.message_receipts.delivered_at, excluded.delivered_at),
        read_at = greatest(coalesce(public.message_receipts.read_at, '-infinity'::timestamptz), excluded.read_at);
end;
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

grant execute on function public.send_message(uuid, text, text) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.send_location(uuid, double precision, double precision, text, text) to authenticated;
grant execute on function public.send_location(uuid, double precision, double precision, text) to authenticated;
grant execute on function public.send_media(uuid, text, text, integer, integer, text, text) to authenticated;
grant execute on function public.send_media(uuid, text, text, integer, integer, text) to authenticated;
grant execute on function public.mark_conversation_delivered(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.conversation_messages(uuid) to authenticated;
grant execute on function public.conversation_messages_page(uuid, timestamptz, uuid, integer) to authenticated;
grant execute on function public.conversation_messages_after(uuid, timestamptz, uuid, integer) to authenticated;
