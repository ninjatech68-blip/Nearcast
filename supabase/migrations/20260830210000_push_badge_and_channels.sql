-- ===============================================================
-- The badge, the channel, and not arriving stale.
-- ===============================================================
--
-- Three things every mature push stack does that ours did not. None of
-- them change what gets sent or to whom — only what the notification
-- carries alongside it.
--
-- 1. THE BADGE NEVER APPEARED. The client sets `shouldSetBadge: true`,
--    which grants permission to show one, but no notification ever
--    carried a number — so the icon badge stayed empty however much was
--    waiting. The count already exists; it was simply never sent.
--
-- 2. ONE ANDROID CHANNEL FOR EVERYTHING. A single 'default' channel
--    means someone who wants join requests quieter than messages has to
--    silence both. Splitting them hands that control to the OS, which
--    is where per-category notification preferences belong — and is the
--    honest substitute for the app-level quiet hours that chat messages
--    are deliberately exempt from.
--
-- 3. A PING COULD ARRIVE LONG AFTER IT MATTERED. Nothing set a
--    time-to-live, so a notification undeliverable at send — phone off,
--    no signal — could be handed over an hour later, about a message
--    the person read on their laptop forty minutes ago. The retry
--    budget already caps at half an hour on our side; this makes the
--    provider agree.
-- ===============================================================

-- ---------------------------------------------------------------
-- 1. what the badge should read
-- ---------------------------------------------------------------
/**
 * Everything waiting for one person, across every chat they are in.
 *
 * The badge is a whole-app number, not a per-conversation one, so this
 * deliberately does not care which conversation the ping came from.
 * Closed and expired chats are excluded — a badge that counts messages
 * you can no longer reply to is a badge that cannot be cleared.
 */
create or replace function private.unread_badge(reader uuid)
returns integer language sql stable set search_path = '' as $$
  select coalesce(sum(unread.tally), 0)::integer
  from public.conversations c
  left join public.conversation_reads r
    on r.conversation_id = c.id and r.profile_id = reader
  cross join lateral (
    select count(*) as tally
    from public.messages m
    where m.conversation_id = c.id
      and m.sender_id <> reader
      and not m.is_system
      and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
  ) unread
  where reader in (c.person_low, c.person_high)
    and private.window_is_open(c.mode, c.expires_at, c.closed_at);
$$;

-- ---------------------------------------------------------------
-- 2. the claim hands the sender everything it needs
-- ---------------------------------------------------------------
-- The badge is computed HERE, once per claimed row, rather than by the
-- sender making a second round trip per recipient. Same reason the
-- retry policy lives in SQL: the Edge Function should be doing HTTP,
-- not arithmetic it would have to re-ask the database for anyway.
-- the shape widens by a column, which `create or replace` cannot do
drop function if exists public.claim_notification_batch(integer);
create or replace function public.claim_notification_batch(batch_size integer default 200)
returns table (
  id uuid,
  recipient_id uuid,
  kind text,
  intent_id uuid,
  conversation_id uuid,
  attempt_count integer,
  badge integer
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
    returning o.id, o.recipient_id, o.kind, o.intent_id, o.conversation_id, o.attempt_count
  )
  select taken.id, taken.recipient_id, taken.kind, taken.intent_id,
         taken.conversation_id, taken.attempt_count,
         private.unread_badge(taken.recipient_id)
  from taken;
end;
$$;
revoke execute on function public.claim_notification_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_batch(integer) to service_role;

-- ---------------------------------------------------------------
-- 3. the badge the app itself should be showing
-- ---------------------------------------------------------------
/**
 * The same number, for the app to read directly.
 *
 * A push sets the badge on arrival, but the badge also has to come DOWN
 * when someone reads a chat — and that happens with no notification
 * involved at all. The app asks for this whenever it syncs.
 */
create or replace function public.my_unread_badge()
returns integer language sql security definer set search_path = '' as $$
  select private.unread_badge(auth.uid());
$$;
grant execute on function public.my_unread_badge() to authenticated;
