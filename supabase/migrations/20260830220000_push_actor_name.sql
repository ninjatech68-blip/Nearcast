-- ===============================================================
-- A notification says who it is about.
-- ===============================================================
--
-- The copy read "someone wants in" and "they left you a line". Both
-- break the Content Design Guide on their own terms: Nearcast must not
-- sound "mysterious" (who wants in?) or "overly familiar" ("they left
-- you a line"), and a notification is supposed to "name the real state
-- change". A ping you cannot place is one you either open or ignore at
-- random.
--
-- The outbox carries ids and nothing else, so the sender had no idea
-- who had acted — hence the pronouns. It now carries the ACTOR, and the
-- claim resolves their first name at send time.
--
-- What this does NOT add, deliberately. `08 - Writing and Content
-- Guide.md` rules out "exact locations, prices, message excerpts, and
-- private-group references" on a lock screen, and AGENTS.md rules out
-- intent text and messages in a push payload. So no message preview and
-- no plan title. A first name is neither: the same guide already states
-- "People can see your first name and approximate area" as the standing
-- privacy position, and these two people have matched.
--
-- The name is resolved at SEND time, never stored on the row, so the
-- outbox stays a table of kinds and ids exactly as before.
-- ===============================================================

alter table public.notification_outbox
  add column if not exists actor_id uuid references public.profiles(id) on delete set null;

-- ---------------------------------------------------------------
-- 1. every enqueue records who did the thing
-- ---------------------------------------------------------------

-- someone asked to join your cast → ping the caster, name the joiner
create or replace function private.enqueue_join_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  caster uuid;
begin
  select broadcaster_id into caster from public.intents where id = new.intent_id;
  if caster is not null and caster <> new.respondent_id then
    insert into public.notification_outbox (recipient_id, kind, intent_id, actor_id)
    values (caster, 'join_request', new.intent_id, new.respondent_id);
  end if;
  return new;
end;
$$;

-- the caster said yes → ping the joiner, name the caster
create or replace function private.enqueue_join_accepted()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  caster uuid;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select broadcaster_id into caster from public.intents where id = new.intent_id;
    insert into public.notification_outbox (recipient_id, kind, intent_id, actor_id)
    values (new.respondent_id, 'join_accepted', new.intent_id, caster);
  end if;
  return new;
end;
$$;

-- a message → ping the other party, name the sender
create or replace function private.enqueue_chat_message()
returns trigger language plpgsql security definer set search_path = '' as $$
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

  insert into public.notification_outbox (recipient_id, kind, conversation_id, actor_id)
  values (recipient, 'chat_message', new.conversation_id, new.sender_id)
  on conflict do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------
-- 2. the claim resolves the name
-- ---------------------------------------------------------------
/**
 * The actor's first name, as they wrote it.
 *
 * Case is preserved deliberately. The app speaks in lowercase, but a
 * lock screen sits among every other app's notifications, and a name
 * rendered "riya" there reads as a defect rather than a style. The
 * guide agrees from the other direction: do not encode meaning in
 * capitalization.
 *
 * Falls back to "Someone" rather than to an empty string, so a missing
 * profile degrades to the old, vaguer copy instead of "  wants to join".
 */
create or replace function private.actor_first_name(actor uuid)
returns text language sql stable set search_path = '' as $$
  select coalesce(
    nullif(btrim(split_part(p.display_name, ' ', 1)), ''),
    'Someone')
  from public.profiles p where p.id = actor;
$$;

drop function if exists public.claim_notification_batch(integer);
create or replace function public.claim_notification_batch(batch_size integer default 200)
returns table (
  id uuid,
  recipient_id uuid,
  kind text,
  intent_id uuid,
  conversation_id uuid,
  attempt_count integer,
  badge integer,
  actor_name text
)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with claimable as (
    select o.id from public.notification_outbox o
    where (
            o.delivery_status = 'pending'
            and (o.next_attempt_at is null or o.next_attempt_at <= now())
          )
       or (o.delivery_status = 'sending'
           and o.last_attempt_at is not null
           and o.last_attempt_at < now() - private.claim_is_stale())
    order by o.created_at
    limit greatest(1, least(coalesce(batch_size, 200), 500))
    for update skip locked
  ),
  taken as (
    update public.notification_outbox o
    set delivery_status = 'sending',
        last_attempt_at = now(),
        attempt_count = o.attempt_count + 1
    from claimable
    where o.id = claimable.id
    returning o.id, o.recipient_id, o.kind, o.intent_id, o.conversation_id,
              o.attempt_count, o.actor_id
  )
  select taken.id, taken.recipient_id, taken.kind, taken.intent_id,
         taken.conversation_id, taken.attempt_count,
         private.unread_badge(taken.recipient_id),
         coalesce(private.actor_first_name(taken.actor_id), 'Someone')
  from taken;
end;
$$;
revoke execute on function public.claim_notification_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_batch(integer) to service_role;
