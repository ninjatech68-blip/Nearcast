-- ===============================================================
-- A notification that failed once is not a notification that failed.
-- ===============================================================
--
-- The sender submits a batch to Expo and writes down what happened.
-- What it never did was try again. `claim_notification_batch` only ever
-- took `pending` rows, and nothing anywhere put a row back into
-- `pending` — so `failed` was terminal, whatever the reason.
--
-- That is a data-loss bug, not a rough edge. Expo returns a 5xx, or the
-- network blips for the second the drain happened to run, and the whole
-- claimed batch — up to two hundred notifications — is marked failed and
-- never sent. Nobody is told. `attempt_count` was already being
-- incremented on every claim and then read by nothing.
--
-- It also read exactly one Expo error code. `DeviceNotRegistered`
-- correctly killed the token. Everything else was the same generic
-- failure, including `MessageRateExceeded`, whose entire meaning is
-- "slow down and try this again", and `InvalidCredentials`, which means
-- the push setup itself is wrong and somebody needs to know.
--
-- So: classify the failure, and let the claim decide when a retryable
-- one comes back. The policy lives HERE rather than in the sender
-- because this is where it can be tested — the Edge Function has no
-- test harness, and untested backoff is how you write a loop that
-- hammers a provider that is already asking you to stop.
-- ===============================================================

-- ---------------------------------------------------------------
-- 1. when a row becomes claimable again
-- ---------------------------------------------------------------
alter table public.notification_outbox
  add column if not exists next_attempt_at timestamptz;

-- Give up eventually. A push is about something that just happened; a
-- notification that finally lands an hour late is worse than one that
-- never lands, because the person has already opened the app.
create or replace function private.push_max_attempts()
returns integer language sql immutable set search_path = '' as $$ select 5 $$;

/**
 * How long to wait before attempt N+1.
 *
 * Exponential, and capped: 30s, 2m, 8m, 30m. The cap matters more than
 * the curve — past half an hour the notification has lost its point, and
 * the attempt budget runs out around there anyway.
 */
create or replace function private.push_backoff(attempts integer)
returns interval language sql immutable set search_path = '' as $$
  -- clamp the EXPONENT, not just the result: interval multiplication
  -- overflows long before least() gets a chance to cap it.
  select least(
    interval '30 seconds' * power(4, least(greatest(coalesce(attempts, 1), 1), 6) - 1),
    interval '30 minutes'
  );
$$;

/**
 * Is this worth trying again?
 *
 * Retryable means the message is fine and the moment was not: rate
 * limits, provider 5xx, a dropped connection. Terminal means trying
 * again would fail identically — a dead token, a message we built
 * wrong, credentials that are not valid. The default for an
 * unrecognised code is RETRY, because an unknown failure is more often
 * a bad minute than a permanently broken notification, and the attempt
 * budget bounds how wrong that guess can get.
 */
create or replace function private.push_error_is_retryable(error_code text)
returns boolean language sql immutable set search_path = '' as $$
  select case
    -- the device is gone. the token is already being invalidated.
    when error_code = 'DeviceNotRegistered' then false
    -- we built the message wrong; the same message will fail again.
    when error_code in ('MessageTooBig', 'InvalidMessage') then false
    -- the push setup itself is wrong. retrying hides it.
    when error_code in ('InvalidCredentials', 'MismatchSenderId') then false
    -- a kind with no copy is a bug in the sender, not a bad minute.
    when error_code like 'unknown_kind:%' then false
    -- Expo asking us, in as many words, to slow down and come back.
    when error_code = 'MessageRateExceeded' then true
    -- 4xx is us and will not improve; 5xx and 0 (no response) are worth another go.
    when error_code like 'http_4%' then false
    when error_code like 'http_%' then true
    else true
  end;
$$;

-- ---------------------------------------------------------------
-- 2. record what happened, and decide what happens next
-- ---------------------------------------------------------------
/**
 * The sender's single exit point for a failure.
 *
 * Returns the status it settled on so the caller can count it. Doing
 * this in one statement is what keeps a retry from racing a claim: the
 * row is either handed back to the queue with a time on it, or closed.
 */
create or replace function public.record_notification_failure(
  outbox_id uuid,
  error_code text
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  row_attempts integer;
  retryable boolean := private.push_error_is_retryable(error_code);
  settled text;
begin
  select o.attempt_count into row_attempts
  from public.notification_outbox o where o.id = outbox_id;
  if row_attempts is null then return null; end if;

  if retryable and row_attempts < private.push_max_attempts() then
    update public.notification_outbox
    set delivery_status = 'pending',
        next_attempt_at = now() + private.push_backoff(row_attempts),
        last_error = error_code,
        last_attempt_at = now(),
        resolved_at = null
    where id = outbox_id;
    settled := 'pending';
  else
    update public.notification_outbox
    set delivery_status = 'failed',
        next_attempt_at = null,
        -- say WHY it stopped, so a spent budget is not mistaken for a
        -- permanent error when someone reads this back later.
        last_error = case
          when retryable then 'gave_up_after_' || row_attempts || ':' || coalesce(error_code, 'unknown')
          else coalesce(error_code, 'unknown') end,
        last_attempt_at = now(),
        resolved_at = now()
    where id = outbox_id;
    settled := 'failed';
  end if;
  return settled;
end;
$$;
revoke execute on function public.record_notification_failure(uuid, text) from public, anon, authenticated;
grant execute on function public.record_notification_failure(uuid, text) to service_role;

-- ---------------------------------------------------------------
-- 3. the claim honours the wait
-- ---------------------------------------------------------------
-- Same exclusive handover as before; it now simply refuses to pick a
-- row back up before the time it was told to.
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

-- a waiting row is not a ready row; keep the ready ones cheap to find
drop index if exists public.notification_outbox_pending;
create index if not exists notification_outbox_ready
  on public.notification_outbox (next_attempt_at nulls first, created_at)
  where delivery_status = 'pending';

-- ---------------------------------------------------------------
-- 4. what is actually going wrong, in one place
-- ---------------------------------------------------------------
-- The reason to reach for a notification platform is rarely delivery —
-- it is being able to answer "did that arrive, and if not why" without
-- reading a log. Two views cost nothing and answer it.
create or replace view public.notification_health as
  select kind,
         delivery_status,
         count(*) as rows,
         max(attempt_count) as worst_attempts,
         min(created_at) as oldest,
         max(last_attempt_at) as last_tried
  from public.notification_outbox
  group by kind, delivery_status;

create or replace view public.notification_failures as
  select kind,
         coalesce(last_error, 'unknown') as reason,
         count(*) as rows,
         max(last_attempt_at) as last_seen
  from public.notification_outbox
  where delivery_status = 'failed'
  group by kind, coalesce(last_error, 'unknown')
  order by count(*) desc;

revoke all on public.notification_health from public, anon, authenticated;
revoke all on public.notification_failures from public, anon, authenticated;
grant select on public.notification_health to service_role;
grant select on public.notification_failures to service_role;
