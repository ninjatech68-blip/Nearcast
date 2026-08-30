-- ===============================================================
-- Claim the outbox before sending it.
-- ===============================================================
--
-- The drain reads every pending row, submits it to Expo, and only then
-- marks it. Between the read and the mark the row still looks pending
-- to anybody else, so two overlapping runs both send it. That is not
-- hypothetical: the drain is scheduled every minute, a batch is up to
-- 200 rows each with its own network round-trip, and a run that takes
-- longer than a minute overlaps the next one by construction. The same
-- window also loses a whole batch if the function times out mid-flight
-- — the rows were sent, nothing recorded it, and the next run sends
-- them again.
--
-- A duplicate ping was survivable while the only notifications were
-- "someone wants in". Now that every chat message pings, a duplicate is
-- the same buzz twice for one message, which is how a messaging app
-- teaches people to turn notifications off.
--
-- So: claim first. One statement moves rows out of `pending` and hands
-- them to exactly one caller; a run that dies leaves them claimed, and
-- the next run takes them back once the claim goes stale.
-- ===============================================================

alter table public.notification_outbox drop constraint if exists notification_outbox_delivery_status_check;
alter table public.notification_outbox
  add constraint notification_outbox_delivery_status_check
  check (delivery_status in (
    'pending', 'sending', 'submitted', 'delivered', 'partial', 'failed', 'no_devices'
  ));

-- a claim that outlives this is assumed dead: the run that took it
-- crashed or timed out, and the work has to go to somebody.
create or replace function private.claim_is_stale()
returns interval language sql immutable set search_path = '' as $$ select interval '5 minutes' $$;

create index if not exists notification_outbox_sending
  on public.notification_outbox(last_attempt_at)
  where delivery_status = 'sending';

/**
 * Take a batch of work, exclusively.
 *
 * `for update skip locked` is what makes this safe under concurrency:
 * two runs racing on the same rows do not block each other and do not
 * both win — the second simply skips to rows the first did not take.
 * Rows already marked `sending` come back only when their claim has
 * gone stale, so a crashed run self-heals without anyone rescuing it.
 */
create or replace function public.claim_notification_batch(batch_size integer default 200)
returns table (
  id uuid,
  recipient_id uuid,
  kind text,
  intent_id uuid,
  conversation_id uuid,
  attempt_count integer
)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with claimable as (
    select o.id from public.notification_outbox o
    where o.delivery_status = 'pending'
       or (o.delivery_status = 'sending'
           and o.last_attempt_at is not null
           and o.last_attempt_at < now() - private.claim_is_stale())
    order by o.created_at
    limit greatest(1, least(coalesce(batch_size, 200), 500))
    for update skip locked
  )
  update public.notification_outbox o
  set delivery_status = 'sending',
      last_attempt_at = now(),
      attempt_count = o.attempt_count + 1
  from claimable
  where o.id = claimable.id
  returning o.id, o.recipient_id, o.kind, o.intent_id, o.conversation_id, o.attempt_count;
end;
$$;
revoke execute on function public.claim_notification_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_batch(integer) to service_role;

-- A claimed row is out of `pending`, so the one-ping-per-chat index no
-- longer covers it. That is the behaviour we want: a message arriving
-- while the previous ping is in flight queues a fresh one rather than
-- being swallowed. Widening the index to include 'sending' would drop
-- that message's notification entirely.
