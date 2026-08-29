-- ===============================================================
-- Push notifications: device tokens + a content-free outbox.
-- ===============================================================
--
-- Two halves:
--   1. device_push_tokens — where to reach a person, registered by the
--      device through a definer RPC. RLS: a person sees only their own.
--   2. notification_outbox — WHAT to send, enqueued by triggers on the
--      events worth a ping. By product law a push carries no intent
--      text, message, coordinate, contact detail or private-group name,
--      so the outbox stores only a kind and ids; the branded copy is
--      composed at send time in supabase/functions/send-push, and the
--      app resolves the id to the real screen once opened.
-- ===============================================================

-- 1. device tokens ------------------------------------------------
create table if not exists public.device_push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null default 'unknown',
  updated_at timestamptz not null default now()
);
create index if not exists device_push_tokens_user on public.device_push_tokens(user_id);

alter table public.device_push_tokens enable row level security;

-- a person may see their own tokens; writes go through the definer RPC only.
drop policy if exists push_tokens_owner_read on public.device_push_tokens;
create policy push_tokens_owner_read on public.device_push_tokens
  for select to authenticated using (user_id = auth.uid());

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
  insert into public.device_push_tokens (token, user_id, platform, updated_at)
  values (btrim(token), uid, coalesce(nullif(btrim(platform), ''), 'unknown'), now())
  on conflict on constraint device_push_tokens_pkey do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;
grant execute on function public.register_push_token(text, text) to authenticated;

-- 2. content-free outbox -----------------------------------------
create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('join_request', 'join_accepted')),
  intent_id uuid references public.intents(id) on delete cascade,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists notification_outbox_unsent
  on public.notification_outbox(created_at) where sent_at is null;

-- only the service role (the send-push function) touches this table.
-- RLS on with no policies = no authenticated access; the service key bypasses RLS.
alter table public.notification_outbox enable row level security;

-- someone asked to join your cast → ping the caster
create or replace function private.enqueue_join_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  caster uuid;
begin
  select broadcaster_id into caster from public.intents where id = new.intent_id;
  if caster is not null and caster <> new.respondent_id then
    insert into public.notification_outbox (recipient_id, kind, intent_id)
    values (caster, 'join_request', new.intent_id);
  end if;
  return new;
end;
$$;

-- the caster said yes → ping the joiner
create or replace function private.enqueue_join_accepted()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into public.notification_outbox (recipient_id, kind, intent_id)
    values (new.respondent_id, 'join_accepted', new.intent_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enqueue_join_request on public.responses;
create trigger trg_enqueue_join_request
  after insert on public.responses
  for each row execute function private.enqueue_join_request();

drop trigger if exists trg_enqueue_join_accepted on public.responses;
create trigger trg_enqueue_join_accepted
  after update of status on public.responses
  for each row execute function private.enqueue_join_accepted();
