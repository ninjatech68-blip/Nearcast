-- ---------------------------------------------------------------
-- Two drains racing do not send the same ping twice.
--
-- The sender used to read pending rows, submit them, and mark them
-- afterwards. For the whole submit the rows still read as pending, so
-- an overlapping run picked up the same ones — and the drain is
-- scheduled every minute against batches that can take longer than
-- that. One message, two buzzes.
--
-- Claiming makes the handover atomic. These pin that a second caller
-- gets nothing, that a crashed run's work comes back, and that the
-- one-ping-per-chat rule still lets a NEW message queue while the
-- previous ping is in flight.
-- ---------------------------------------------------------------
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('33333333-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cl1@x','',now(),now()),
  ('33333333-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cl2@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('33333333-0000-0000-0000-0000000000e1','Sender'),
  ('33333333-0000-0000-0000-0000000000e2','Reader');
insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('33333333-1000-0000-0000-0000000000e1','33333333-0000-0000-0000-0000000000e1','sports','a plan','matched', now()+interval '9 days', now());
insert into public.responses (id, intent_id, respondent_id, message, status) values
  ('33333333-2000-0000-0000-0000000000e1','33333333-1000-0000-0000-0000000000e1','33333333-0000-0000-0000-0000000000e2','in','accepted');
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id) values
  ('33333333-3000-0000-0000-0000000000e1','33333333-1000-0000-0000-0000000000e1','33333333-2000-0000-0000-0000000000e1','33333333-0000-0000-0000-0000000000e1','33333333-0000-0000-0000-0000000000e2');
insert into public.conversations (id, match_id, person_low, person_high, mode, expires_at) values
  ('33333333-4000-0000-0000-0000000000e1','33333333-3000-0000-0000-0000000000e1',
   least('33333333-0000-0000-0000-0000000000e1'::uuid,'33333333-0000-0000-0000-0000000000e2'::uuid),
   greatest('33333333-0000-0000-0000-0000000000e1'::uuid,'33333333-0000-0000-0000-0000000000e2'::uuid),
   'day', now()+interval '20 hours');
update public.matches set conversation_id = '33333333-4000-0000-0000-0000000000e1'
  where id = '33333333-3000-0000-0000-0000000000e1';

-- the fixture's accepted response queues a join_request ping of its
-- own; this suite is about the chat ping, so clear the rest first.
delete from public.notification_outbox where kind <> 'chat_message';

-- a message queues one ping for the reader
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-0000-0000-0000-0000000000e1","role":"authenticated"}';
select public.send_message('33333333-4000-0000-0000-0000000000e1'::uuid, 'first');
reset role;

select is(
  (select count(*) from public.notification_outbox
    where kind = 'chat_message' and delivery_status = 'pending'),
  1::bigint, 'one ping is waiting');

-- ---- the first drain takes it ----
select is(
  (select count(*) from public.claim_notification_batch(200)),
  1::bigint, 'the first drain claims the ping');
select is(
  (select delivery_status from public.notification_outbox where kind = 'chat_message'),
  'sending', 'a claimed row is out of pending and marked sending');
select is(
  (select attempt_count from public.notification_outbox where kind = 'chat_message'),
  1, 'claiming counts as the attempt');

-- ---- the second drain, overlapping, gets nothing ----
select is(
  (select count(*) from public.claim_notification_batch(200)),
  0::bigint, 'an overlapping drain claims nothing — no duplicate send');

-- ---- a NEW message while the ping is in flight still queues ----
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-0000-0000-0000-0000000000e1","role":"authenticated"}';
select public.send_message('33333333-4000-0000-0000-0000000000e1'::uuid, 'second');
reset role;
select is(
  (select count(*) from public.notification_outbox
    where kind = 'chat_message' and delivery_status = 'pending'),
  1::bigint, 'a message arriving mid-flight queues its own ping rather than being swallowed');

-- ---- a drain that died leaves its claim behind; the work comes back ----
update public.notification_outbox
set last_attempt_at = now() - interval '30 minutes'
where delivery_status = 'sending';
select is(
  (select count(*) from public.claim_notification_batch(200)),
  2::bigint, 'a stale claim is retaken, along with the newly queued ping');

-- ---- a fresh claim is NOT stolen ----
select is(
  (select count(*) from public.claim_notification_batch(200)),
  0::bigint, 'a claim that is still fresh stays with the run that took it');

select finish();
rollback;
