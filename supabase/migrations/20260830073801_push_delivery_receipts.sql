-- ===============================================================
-- Push delivery hardening: track per-device tickets and receipts.
-- ===============================================================
--
-- The first cut proved that the app, Expo, APNs and the scheduled
-- sender can all talk to each other. It was not robust enough for
-- production operations:
--
-- - the sender marked rows sent without reading Expo's response
-- - invalid tokens stayed active forever
-- - there was no receipt tracking, so "queued to Expo" and "accepted by
--   Apple / Google" looked the same
--
-- Keep the existing content-free outbox, but add:
--   1. delivery state on the outbox row itself
--   2. per-device delivery rows with Expo ticket ids and receipts
--   3. invalidation state on device tokens so dead tokens stop getting hit
-- ===============================================================

alter table public.device_push_tokens
  add column if not exists invalidated_at timestamptz,
  add column if not exists last_error text;

create index if not exists device_push_tokens_active_user
  on public.device_push_tokens(user_id, updated_at desc)
  where invalidated_at is null;

create or replace function public.register_push_token(token text, platform text)
returns void language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if token is null or char_length(btrim(token)) = 0 then
    return;
  end if;

  insert into public.device_push_tokens (token, user_id, platform, updated_at, invalidated_at, last_error)
  values (
    btrim(token),
    uid,
    coalesce(nullif(btrim(platform), ''), 'unknown'),
    now(),
    null,
    null
  )
  on conflict on constraint device_push_tokens_pkey do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now(),
        invalidated_at = null,
        last_error = null;
end;
$$;

create or replace function public.register_push_token(
  token text,
  platform text,
  device_label text,
  device_model text,
  app_build text
)
returns void language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if token is null or char_length(btrim(token)) = 0 then
    return;
  end if;

  insert into public.device_push_tokens (
    token,
    user_id,
    platform,
    device_label,
    device_model,
    app_build,
    updated_at,
    invalidated_at,
    last_error
  )
  values (
    btrim(token),
    uid,
    coalesce(nullif(btrim(platform), ''), 'unknown'),
    nullif(btrim(device_label), ''),
    nullif(btrim(device_model), ''),
    nullif(btrim(app_build), ''),
    now(),
    null,
    null
  )
  on conflict on constraint device_push_tokens_pkey do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        device_label = excluded.device_label,
        device_model = excluded.device_model,
        app_build = excluded.app_build,
        updated_at = now(),
        invalidated_at = null,
        last_error = null;
end;
$$;

alter table public.notification_outbox
  add column if not exists delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'submitted', 'delivered', 'partial', 'failed', 'no_devices')),
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists last_error text,
  add column if not exists resolved_at timestamptz;

create index if not exists notification_outbox_pending
  on public.notification_outbox(created_at)
  where delivery_status = 'pending';

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references public.notification_outbox(id) on delete cascade,
  token text not null references public.device_push_tokens(token) on delete cascade,
  ticket_status text not null default 'pending'
    check (ticket_status in ('pending', 'ok', 'error')),
  expo_ticket_id text,
  receipt_status text
    check (receipt_status in ('ok', 'error')),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  receipt_checked_at timestamptz,
  resolved_at timestamptz
);

create index if not exists notification_deliveries_outbox
  on public.notification_deliveries(outbox_id, created_at desc);
create index if not exists notification_deliveries_open_receipts
  on public.notification_deliveries(submitted_at)
  where expo_ticket_id is not null and receipt_status is null;
create index if not exists notification_deliveries_ticket
  on public.notification_deliveries(expo_ticket_id)
  where expo_ticket_id is not null;

alter table public.notification_deliveries enable row level security;
