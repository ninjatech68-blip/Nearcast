-- ---------------------------------------------------------------
-- One tick, two ticks, two blue ticks — three states, not two.
--
-- The receipts table can tell "it reached their phone" apart from "they
-- read it", but the app only ever marked delivery at the same instant
-- it marked reading, because opening the thread was the only caller.
-- The sender went straight from sent to read and never saw the middle,
-- which is the state that answers "did that even get through?".
--
-- These pin the three states as genuinely separate, and pin the rule
-- that a receipt only ever moves forward.
-- ---------------------------------------------------------------
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rc1@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rc2@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000b1','Sender'),
  ('00000000-0000-0000-0000-0000000000b2','Reader');
insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('aaaaaaaa-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b1','sports','a plan','matched', now()+interval '9 days', now());
insert into public.responses (id, intent_id, respondent_id, message, status) values
  ('aaaaaaaa-0000-0000-0000-0000000000b2','aaaaaaaa-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2','in','accepted');
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id) values
  ('bbbbbbbb-0000-0000-0000-0000000000b1','aaaaaaaa-0000-0000-0000-0000000000b1','aaaaaaaa-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2');
insert into public.conversations (id, match_id, person_low, person_high, mode, expires_at) values
  ('cccccccc-0000-0000-0000-0000000000b1','bbbbbbbb-0000-0000-0000-0000000000b1',
   least('00000000-0000-0000-0000-0000000000b1'::uuid,'00000000-0000-0000-0000-0000000000b2'::uuid),
   greatest('00000000-0000-0000-0000-0000000000b1'::uuid,'00000000-0000-0000-0000-0000000000b2'::uuid),
   'day', now() + interval '20 hours');
update public.matches set conversation_id = 'cccccccc-0000-0000-0000-0000000000b1'
  where id = 'bbbbbbbb-0000-0000-0000-0000000000b1';

-- ---- sent: it is on the server, nothing more is claimed ----
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select lives_ok(
  $$ select public.send_message('cccccccc-0000-0000-0000-0000000000b1'::uuid, 'on my way') $$,
  'the sender writes');
select is(
  (select remote_status from public.conversation_messages('cccccccc-0000-0000-0000-0000000000b1'::uuid)
    where body = 'on my way'),
  'sent', 'a message the other phone has not seen reads as sent');

-- ---- delivered: their device has it, they have not opened it ----
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select lives_ok(
  $$ select public.mark_conversation_delivered('cccccccc-0000-0000-0000-0000000000b1'::uuid) $$,
  'the reader''s app syncs and confirms delivery');

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select is(
  (select remote_status from public.conversation_messages('cccccccc-0000-0000-0000-0000000000b1'::uuid)
    where body = 'on my way'),
  'delivered', 'delivery alone reads as delivered — NOT as read');

-- ---- read: they opened the thread ----
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select lives_ok(
  $$ select public.mark_conversation_read('cccccccc-0000-0000-0000-0000000000b1'::uuid) $$,
  'the reader opens the thread');

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select is(
  (select remote_status from public.conversation_messages('cccccccc-0000-0000-0000-0000000000b1'::uuid)
    where body = 'on my way'),
  'read', 'opening the thread moves it to read');

-- ---- a receipt never walks backwards ----
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select lives_ok(
  $$ select public.mark_conversation_delivered('cccccccc-0000-0000-0000-0000000000b1'::uuid) $$,
  'a later delivery sync on an already-read thread');

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select is(
  (select remote_status from public.conversation_messages('cccccccc-0000-0000-0000-0000000000b1'::uuid)
    where body = 'on my way'),
  'read', 'a read message is never demoted back to delivered');

-- ---- the reader is not told about the state of their own receipts ----
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is(
  (select remote_status from public.conversation_messages('cccccccc-0000-0000-0000-0000000000b1'::uuid)
    where body = 'on my way'),
  null, 'ticks belong to the sender; the receiver sees none on an incoming message');

select finish();
rollback;
