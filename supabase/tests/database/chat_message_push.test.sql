-- ---------------------------------------------------------------
-- A message pings the other person, unless they are already reading it.
--
-- Before this, `messages` had no trigger at all and the outbox only
-- knew about join_request and join_accepted: a chat message woke
-- nobody. Chat felt live only while the thread was open, because the
-- open thread polls. Close the app and messages arrived in silence.
--
-- The rule, and the one exception, are what these pin:
--   a message enqueues a content-free ping for the OTHER party,
--   unless that party has this conversation open right now.
-- ---------------------------------------------------------------
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mp1@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mp2@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000a1','Caster'),
  ('00000000-0000-0000-0000-0000000000a2','Joiner');
insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','sports','a plan','matched', now()+interval '9 days', now());
insert into public.responses (id, intent_id, respondent_id, message, status) values
  ('aaaaaaaa-0000-0000-0000-0000000000a2','aaaaaaaa-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2','in','accepted');
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id) values
  ('bbbbbbbb-0000-0000-0000-0000000000a1','aaaaaaaa-0000-0000-0000-0000000000a1','aaaaaaaa-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2');
insert into public.conversations (id, match_id, person_low, person_high, mode, expires_at) values
  ('cccccccc-0000-0000-0000-0000000000a1','bbbbbbbb-0000-0000-0000-0000000000a1',
   least('00000000-0000-0000-0000-0000000000a1'::uuid,'00000000-0000-0000-0000-0000000000a2'::uuid),
   greatest('00000000-0000-0000-0000-0000000000a1'::uuid,'00000000-0000-0000-0000-0000000000a2'::uuid),
   'day', now() + interval '20 hours');
update public.matches set conversation_id = 'cccccccc-0000-0000-0000-0000000000a1'
  where id = 'bbbbbbbb-0000-0000-0000-0000000000a1';

-- the caster speaks; the joiner is nowhere near their phone
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$ select public.send_message('cccccccc-0000-0000-0000-0000000000a1'::uuid, 'court is booked for 7') $$,
  'a message sends');

reset role;
select is(
  (select count(*) from public.notification_outbox
    where kind = 'chat_message' and recipient_id = '00000000-0000-0000-0000-0000000000a2'),
  1::bigint, 'the other person is queued a ping');

select is(
  (select count(*) from public.notification_outbox
    where kind = 'chat_message' and recipient_id = '00000000-0000-0000-0000-0000000000a1'),
  0::bigint, 'the sender is never pinged about their own message');

select is(
  (select conversation_id from public.notification_outbox
    where kind = 'chat_message' and recipient_id = '00000000-0000-0000-0000-0000000000a2'),
  'cccccccc-0000-0000-0000-0000000000a1'::uuid,
  'the ping carries the conversation id so a tap can open the right chat');

-- PRODUCT LAW: the outbox carries a kind and ids, never a syllable of it
select is(
  (select count(*) from public.notification_outbox o
    where o.kind = 'chat_message'
      and (o.id::text || o.recipient_id::text || o.kind ||
           coalesce(o.conversation_id::text,'') || coalesce(o.intent_id::text,''))
          ilike '%court%'),
  0::bigint, 'the queued ping holds no message text');

-- ---- the storm guard: a burst is one ping, not a burst of pings ----
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$ select public.send_message('cccccccc-0000-0000-0000-0000000000a1'::uuid, 'bring water'),
            public.send_message('cccccccc-0000-0000-0000-0000000000a1'::uuid, 'and a towel'),
            public.send_message('cccccccc-0000-0000-0000-0000000000a1'::uuid, 'see you there') $$,
  'three more messages send');
reset role;
select is(
  (select count(*) from public.notification_outbox
    where kind = 'chat_message' and recipient_id = '00000000-0000-0000-0000-0000000000a2'
      and delivery_status = 'pending'),
  1::bigint, 'four messages in a row are still a single un-drained ping');

-- once that ping is drained, the next message pings again
update public.notification_outbox set delivery_status = 'delivered', resolved_at = now()
  where kind = 'chat_message' and recipient_id = '00000000-0000-0000-0000-0000000000a2';
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$ select public.send_message('cccccccc-0000-0000-0000-0000000000a1'::uuid, 'running five late') $$,
  'a message after the ping was delivered');
reset role;
select is(
  (select count(*) from public.notification_outbox
    where kind = 'chat_message' and recipient_id = '00000000-0000-0000-0000-0000000000a2'
      and delivery_status = 'pending'),
  1::bigint, 'a drained ping does not stop the next one');

-- ---- THE RULE: no ping while they have the chat open ----
reset role;
delete from public.notification_outbox where kind = 'chat_message';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select lives_ok(
  $$ select public.touch_conversation_presence('cccccccc-0000-0000-0000-0000000000a1'::uuid) $$,
  'the joiner opens the chat');

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$ select public.send_message('cccccccc-0000-0000-0000-0000000000a1'::uuid, 'you there?') $$,
  'the caster writes while the joiner is looking at the thread');
reset role;
select is(
  (select count(*) from public.notification_outbox where kind = 'chat_message'),
  0::bigint, 'no ping while they have the chat open');

-- ---- the lease lapses, and pings resume on their own ----
reset role;
update public.conversation_presence set active_until = now() - interval '1 second'
  where conversation_id = 'cccccccc-0000-0000-0000-0000000000a1';
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$ select public.send_message('cccccccc-0000-0000-0000-0000000000a1'::uuid, 'still there?') $$,
  'the caster writes after the lease ran out');
reset role;
select is(
  (select count(*) from public.notification_outbox where kind = 'chat_message'),
  1::bigint, 'an expired presence lease pings again — no heartbeat, no silence');

-- ---- presence on ANOTHER chat does not silence this one ----
reset role;
delete from public.notification_outbox where kind = 'chat_message';
delete from public.conversation_presence;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok(
  $$ select public.touch_conversation_presence('cccccccc-0000-0000-0000-000000009999'::uuid) $$,
  '42501', 'not_a_party',
  'presence cannot be claimed on someone else''s chat');

-- ---- a system note wakes nobody ----
reset role;
insert into public.messages (conversation_id, sender_id, body, is_system)
values ('cccccccc-0000-0000-0000-0000000000a1', null, 'the window is 7 days now.', true);
select is(
  (select count(*) from public.notification_outbox where kind = 'chat_message'),
  0::bigint, 'a system note is the app talking to itself, and pings nobody');

select finish();
rollback;
