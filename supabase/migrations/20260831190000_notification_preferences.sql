-- ---------------------------------------------------------------
-- Notification preferences.
--
-- MUST-083: allow granular notification preferences. The push pipeline was
-- complete apart from this — tokens, outbox, retry with backoff, badges,
-- deep links, an Edge Function sender — and a person had no way to turn any
-- of it off short of revoking permission in iOS Settings, which takes all
-- three kinds at once and cannot be undone from inside the app.
--
-- Absent row means enabled. That makes this a no-op for the members who
-- already exist, with no backfill and no migration risk, and it means a new
-- kind added later is on by default rather than silently off for everyone.
--
-- The three kinds are the ones the outbox already constrains itself to.
-- ---------------------------------------------------------------

create table public.notification_preferences (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('join_request', 'join_accepted', 'chat_message')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (profile_id, kind)
);

alter table public.notification_preferences enable row level security;

-- Your own preferences, and nobody else's. What a person chooses to be
-- notified about is theirs.
create policy notification_preferences_own on public.notification_preferences
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

/**
 * Whether this person still wants this kind.
 *
 * Written as "no row saying otherwise" rather than "a row saying yes", so
 * the default is on and a member who never opened the setting is unaffected.
 */
create or replace function private.wants_notification(recipient uuid, kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.notification_preferences p
    where p.profile_id = recipient
      and p.kind = wants_notification.kind
      and p.enabled = false
  );
$$;

-- ---------------------------------------------------------------
-- The three enqueue triggers, each gated on the recipient's choice.
--
-- These bodies are the live definitions with one guard inserted before the
-- outbox insert, extracted from the database rather than retyped: an
-- earlier attempt at this by hand put the guard on a variable that does not
-- exist in one of them, and named the wrong recipient in another.
--
-- The guard sits last, after every existing condition, so "window open",
-- "not watching this conversation" and "not myself" still apply first.
-- ---------------------------------------------------------------

create or replace function private.enqueue_join_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caster uuid;
begin
  select broadcaster_id into caster from public.intents where id = new.intent_id;
  if caster is not null and caster <> new.respondent_id then
    -- MUST-083: a recipient who switched this kind off is not queued.
    if not private.wants_notification(caster, 'join_request') then
      return new;
    end if;

    insert into public.notification_outbox (recipient_id, kind, intent_id, actor_id)
    values (caster, 'join_request', new.intent_id, new.respondent_id);
  end if;
  return new;
end;
$function$;

create or replace function private.enqueue_join_accepted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caster uuid;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select broadcaster_id into caster from public.intents where id = new.intent_id;
    -- MUST-083: a recipient who switched this kind off is not queued.
    if not private.wants_notification(new.respondent_id, 'join_accepted') then
      return new;
    end if;

    insert into public.notification_outbox (recipient_id, kind, intent_id, actor_id)
    values (new.respondent_id, 'join_accepted', new.intent_id, caster);
  end if;
  return new;
end;
$function$;

create or replace function private.enqueue_chat_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  recipient uuid;
  chat public.conversations;
begin
  if new.is_system or new.sender_id is null then return new; end if;

  select * into chat from public.conversations where id = new.conversation_id;
  if chat.id is null or chat.person_low is null or chat.person_high is null then return new; end if;
  if not private.window_is_open(chat.mode, chat.expires_at, chat.closed_at) then return new; end if;

  recipient := case when chat.person_low = new.sender_id then chat.person_high else chat.person_low end;
  if recipient is null or recipient = new.sender_id then return new; end if;
  if private.is_watching(new.conversation_id, recipient) then return new; end if;

  -- MUST-083: a recipient who switched this kind off is not queued.
  if not private.wants_notification(recipient, 'chat_message') then
    return new;
  end if;

  insert into public.notification_outbox (recipient_id, kind, conversation_id, actor_id)
  values (recipient, 'chat_message', new.conversation_id, new.sender_id)
  on conflict do nothing;

  return new;
end;
$function$;

-- The policy narrows what a grant permits; without the grant the table is
-- unreachable whatever the policy says, and the settings screen reads
-- "permission denied" rather than a preference. Matching the foundation's
-- grant list.
grant select, insert, update, delete on public.notification_preferences to authenticated;

revoke execute on function private.wants_notification(uuid, text) from public, anon;
grant execute on function private.wants_notification(uuid, text) to authenticated;
