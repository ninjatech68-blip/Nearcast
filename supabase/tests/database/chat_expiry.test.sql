-- ---------------------------------------------------------------
-- An expired chat is over.
--
-- expires_at used to be written and never read: a chat whose window
-- closed a week ago still took messages and still listed as live. The
-- header counted down to "expired" and the composer kept working, which
-- made the countdown a lie.
--
-- These pin the three places it has to hold: the send guard, the list
-- the app renders from, and the sweeper that writes the close down.
-- ---------------------------------------------------------------
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','xp1@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','xp2@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000f1','Caster'),
  ('00000000-0000-0000-0000-0000000000f2','Joiner');
insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('aaaaaaaa-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000f1','sports','a plan','matched', now()+interval '9 days', now());
insert into public.responses (id, intent_id, respondent_id, message, status) values
  ('aaaaaaaa-0000-0000-0000-0000000000f2','aaaaaaaa-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000f2','in','accepted');
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id) values
  ('bbbbbbbb-0000-0000-0000-0000000000f1','aaaaaaaa-0000-0000-0000-0000000000f1','aaaaaaaa-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000f2');

-- a LAPSED chat: the window closed an hour ago
insert into public.conversations (id, match_id, person_low, person_high, mode, expires_at) values
  ('cccccccc-0000-0000-0000-0000000000f1','bbbbbbbb-0000-0000-0000-0000000000f1',
   least('00000000-0000-0000-0000-0000000000f1'::uuid,'00000000-0000-0000-0000-0000000000f2'::uuid),
   greatest('00000000-0000-0000-0000-0000000000f1'::uuid,'00000000-0000-0000-0000-0000000000f2'::uuid),
   'day', now() - interval '1 hour');
update public.matches set conversation_id = 'cccccccc-0000-0000-0000-0000000000f1'
  where id = 'bbbbbbbb-0000-0000-0000-0000000000f1';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';

-- ---- the send guard ----
select throws_ok(
  $$ select public.send_message('cccccccc-0000-0000-0000-0000000000f1'::uuid, 'is anyone still there') $$,
  '23514', 'conversation_expired',
  'a text message past the window is refused');

select throws_ok(
  $$ select public.send_location('cccccccc-0000-0000-0000-0000000000f1'::uuid, 12.97, 77.59) $$,
  '23514', 'conversation_expired',
  'a location share past the window is refused');

select throws_ok(
  $$ select public.send_media('cccccccc-0000-0000-0000-0000000000f1'::uuid,
       'cccccccc-0000-0000-0000-0000000000f1/a.jpg', 'image', 10, 10) $$,
  '23514', 'conversation_expired',
  'a photo past the window is refused');

-- ---- the window cannot be re-opened after it lapses ----
select throws_ok(
  $$ select public.set_conversation_mode('cccccccc-0000-0000-0000-0000000000f1'::uuid, 'week') $$,
  '23514', 'conversation_expired',
  'a lapsed window cannot be extended');

-- ---- what the app renders ----
select is(
  (select mode::text from public.my_conversations()
    where conversation_id = 'cccccccc-0000-0000-0000-0000000000f1'),
  'ended', 'the list reports a lapsed chat as ended straight away');

select is(
  (select count(*) from public.conversations
    where id = 'cccccccc-0000-0000-0000-0000000000f1' and mode = 'day'),
  1::bigint, 'the stored row is untouched until the sweeper runs');

-- ---- the sweeper writes it down ----
reset role;
select is(public.close_expired_conversations(500), 1, 'the sweeper closes exactly the lapsed chat');
select is(
  (select mode::text from public.conversations where id = 'cccccccc-0000-0000-0000-0000000000f1'),
  'ended', 'the swept chat is stored as ended');
select is(
  (select closed_at from public.conversations where id = 'cccccccc-0000-0000-0000-0000000000f1'),
  (select expires_at from public.conversations where id = 'cccccccc-0000-0000-0000-0000000000f1'),
  'it closed at its expiry, not at the moment the sweeper noticed');
select is(
  (select body from public.messages where conversation_id = 'cccccccc-0000-0000-0000-0000000000f1'
    order by created_at desc limit 1),
  'the window on this chat closed. nothing more comes through.',
  'the thread says why it stopped');
select is(public.close_expired_conversations(500), 0, 'sweeping again closes nothing — it is idempotent');

-- ---- an 'always' chat has no expiry to lapse, even with a stale timestamp ----
reset role;
update public.conversations set mode = 'always', expires_at = now() - interval '30 days', closed_at = null
  where id = 'cccccccc-0000-0000-0000-0000000000f1';
select is(public.close_expired_conversations(500), 0, 'an always-open chat never lapses');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select lives_ok(
  $$ select public.send_message('cccccccc-0000-0000-0000-0000000000f1'::uuid, 'still open, no expiry') $$,
  'an always-open chat still takes messages with a stale expires_at');

-- a chat someone closed by hand reports the ended error, not the expired one
reset role;
update public.conversations set mode = 'ended', closed_at = now(), expires_at = now() + interval '1 day'
  where id = 'cccccccc-0000-0000-0000-0000000000f1';
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select throws_ok(
  $$ select public.send_message('cccccccc-0000-0000-0000-0000000000f1'::uuid, 'hello') $$,
  '23514', 'conversation_ended',
  'a chat closed by hand still reads as ended, not expired');

select finish();
rollback;
