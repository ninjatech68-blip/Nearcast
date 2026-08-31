-- ---------------------------------------------------------------
-- A bad minute is not a lost notification.
--
-- The sender submitted a claimed batch to Expo, wrote down what
-- happened, and never tried again: `claim_notification_batch` only took
-- `pending` rows and nothing ever put a row back. One 5xx, or one
-- dropped connection during the submit, marked up to two hundred
-- notifications failed forever, silently.
--
-- It also read one Expo error code out of many, so `MessageRateExceeded`
-- — which means precisely "slow down and try again" — was filed next to
-- a dead device token as a permanent failure.
--
-- These pin the classification, the backoff, the give-up, and the one
-- that matters most: that the claim actually honours the wait, because
-- a retry that comes straight back is just the hammering the provider
-- asked us to stop.
-- ---------------------------------------------------------------
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('66666666-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rt1@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('66666666-0000-0000-0000-0000000000a1','Recipient');

-- ---- classification: what is worth another go ----
select ok(private.push_error_is_retryable('MessageRateExceeded'),
  'a rate limit is the one error that literally means try again');
select ok(private.push_error_is_retryable('http_500'),
  'a provider 5xx is a bad minute, not a bad notification');
select ok(private.push_error_is_retryable('http_0'),
  'no response at all — a dropped connection — is retryable');
select ok(private.push_error_is_retryable('something_nobody_has_seen'),
  'an unrecognised failure is retried; the attempt budget bounds the guess');

select ok(not private.push_error_is_retryable('DeviceNotRegistered'),
  'a dead token is terminal — the device is gone');
select ok(not private.push_error_is_retryable('MessageTooBig'),
  'a message we built wrong will fail identically next time');
select ok(not private.push_error_is_retryable('InvalidCredentials'),
  'broken push credentials must surface, not hide behind retries');
select ok(not private.push_error_is_retryable('MismatchSenderId'),
  'a misconfigured sender id is a setup bug, not a transient one');
select ok(not private.push_error_is_retryable('http_400'),
  'a 4xx is us, and will not improve on its own');
select ok(not private.push_error_is_retryable('unknown_kind:nonsense'),
  'a kind with no copy is a bug in the sender');

-- ---- backoff grows, and stops growing ----
select ok(private.push_backoff(2) > private.push_backoff(1),
  'each attempt waits longer than the last');
select ok(private.push_backoff(99) <= interval '30 minutes',
  'the wait is capped — past that the notification has lost its point');

-- ---- a retryable failure goes back in the queue, not in the bin ----
insert into public.notification_outbox (id, recipient_id, kind, delivery_status, attempt_count)
values ('66666666-1000-0000-0000-0000000000a1','66666666-0000-0000-0000-0000000000a1',
        'join_request','sending', 1);

select is(public.record_notification_failure('66666666-1000-0000-0000-0000000000a1'::uuid, 'http_503'),
  'pending', 'a provider 5xx hands the row back to the queue');
select is(
  (select delivery_status from public.notification_outbox where id = '66666666-1000-0000-0000-0000000000a1'),
  'pending', 'and it is pending again, not failed');
select ok(
  (select next_attempt_at > now() from public.notification_outbox
    where id = '66666666-1000-0000-0000-0000000000a1'),
  'with a wait on it before anyone may take it again');
select is(
  (select resolved_at from public.notification_outbox where id = '66666666-1000-0000-0000-0000000000a1'),
  null, 'an unresolved row is not counted as done');

-- THE ONE THAT MATTERS: the claim honours the wait
select is(
  (select count(*) from public.claim_notification_batch(200)),
  0::bigint, 'a drain running inside the backoff window claims nothing');

update public.notification_outbox set next_attempt_at = now() - interval '1 second'
  where id = '66666666-1000-0000-0000-0000000000a1';
select is(
  (select count(*) from public.claim_notification_batch(200)),
  1::bigint, 'once the wait has passed it is picked up again');

-- ---- the budget runs out, and says so ----
update public.notification_outbox
set delivery_status = 'sending', attempt_count = private.push_max_attempts()
where id = '66666666-1000-0000-0000-0000000000a1';
select is(public.record_notification_failure('66666666-1000-0000-0000-0000000000a1'::uuid, 'http_503'),
  'failed', 'a retryable error stops being retried once the budget is spent');
select alike(
  (select last_error from public.notification_outbox where id = '66666666-1000-0000-0000-0000000000a1'),
  'gave_up_after_%',
  'and it records that it gave up, so a spent budget is not misread as a broken notification');

select finish();
rollback;
