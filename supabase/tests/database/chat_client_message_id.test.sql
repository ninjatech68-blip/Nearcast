-- ---------------------------------------------------------------
-- The idempotent send path: a client message id, end to end.
--
-- Every send from the app now carries a client_message_id so a retry
-- cannot double-post. Two things have to hold and neither was covered:
--
--   1. the id must not collide with the COLUMN of the same name inside
--      the function (an ambiguous reference aborts every send), and
--   2. the RPC must still resolve when the optional arguments are
--      absent — a photo with no caption, a GIF with no thumbnail, a
--      location with no label are all ordinary sends.
--
-- It also pins media_thumb_path into the read API, which a later
-- migration once dropped, silently disabling every bubble thumbnail.
-- ---------------------------------------------------------------
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000e7','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cid1@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000e8','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cid2@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000e7','Caster'),
  ('00000000-0000-0000-0000-0000000000e8','Joiner');
insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('aaaaaaaa-0000-0000-0000-0000000000e7','00000000-0000-0000-0000-0000000000e7','sports','a plan','matched', now()+interval '2 days', now());
insert into public.responses (id, intent_id, respondent_id, message, status) values
  ('aaaaaaaa-0000-0000-0000-0000000000e8','aaaaaaaa-0000-0000-0000-0000000000e7','00000000-0000-0000-0000-0000000000e8','in','accepted');
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id) values
  ('bbbbbbbb-0000-0000-0000-0000000000e7','aaaaaaaa-0000-0000-0000-0000000000e7','aaaaaaaa-0000-0000-0000-0000000000e8','00000000-0000-0000-0000-0000000000e7','00000000-0000-0000-0000-0000000000e8');
insert into public.conversations (id, match_id, person_low, person_high, mode, expires_at) values
  ('cccccccc-0000-0000-0000-0000000000e7','bbbbbbbb-0000-0000-0000-0000000000e7',
   least('00000000-0000-0000-0000-0000000000e7'::uuid,'00000000-0000-0000-0000-0000000000e8'::uuid),
   greatest('00000000-0000-0000-0000-0000000000e7'::uuid,'00000000-0000-0000-0000-0000000000e8'::uuid),
   'day', now()+interval '1 day');
update public.matches set conversation_id = 'cccccccc-0000-0000-0000-0000000000e7'
  where id = 'bbbbbbbb-0000-0000-0000-0000000000e7';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000e7","role":"authenticated"}';

-- 1. a text send carrying a client id must not trip the ambiguity
select lives_ok(
  $$ select public.send_message(
       target_conversation_id => 'cccccccc-0000-0000-0000-0000000000e7'::uuid,
       message_body => 'first try',
       client_message_id => 'msg-aaaaaaaa-1111-2222-3333-444444444401') $$,
  'a text send accepts a client message id');

-- 2. the same id twice is the SAME message, not two
select lives_ok(
  $$ select public.send_message(
       target_conversation_id => 'cccccccc-0000-0000-0000-0000000000e7'::uuid,
       message_body => 'first try',
       client_message_id => 'msg-aaaaaaaa-1111-2222-3333-444444444401') $$,
  'replaying a send is accepted');
select is(
  (select count(*) from public.messages
    where client_message_id = 'msg-aaaaaaaa-1111-2222-3333-444444444401'),
  1::bigint, 'a replayed send does not double-post');

-- 3. the legacy path, with no client id, still works
select lives_ok(
  $$ select public.send_message(
       target_conversation_id => 'cccccccc-0000-0000-0000-0000000000e7'::uuid,
       message_body => 'no client id',
       client_message_id => null) $$,
  'a send with an explicit null client id still works');

-- 4. a location share with no label is an ordinary send
select lives_ok(
  $$ select public.send_location(
       target_conversation_id => 'cccccccc-0000-0000-0000-0000000000e7'::uuid,
       share_latitude => 12.9716, share_longitude => 77.5946,
       label => null,
       client_message_id => 'msg-aaaaaaaa-1111-2222-3333-444444444402') $$,
  'a location share resolves with no label');

-- 5. a photo with NO caption is the common case
select lives_ok(
  $$ select public.send_media(
       target_conversation_id => 'cccccccc-0000-0000-0000-0000000000e7'::uuid,
       path => 'cccccccc-0000-0000-0000-0000000000e7/a.jpg',
       kind => 'image', width => 100, height => 80,
       caption => null,
       client_message_id => 'msg-aaaaaaaa-1111-2222-3333-444444444403',
       thumb_path => 'cccccccc-0000-0000-0000-0000000000e7/thumb-a.jpg') $$,
  'a photo with no caption resolves and sends');

-- 6. a GIF carries no thumbnail and must still resolve
select lives_ok(
  $$ select public.send_media(
       target_conversation_id => 'cccccccc-0000-0000-0000-0000000000e7'::uuid,
       path => 'cccccccc-0000-0000-0000-0000000000e7/b.gif',
       kind => 'gif', width => 100, height => 80,
       caption => null,
       client_message_id => 'msg-aaaaaaaa-1111-2222-3333-444444444404',
       thumb_path => null) $$,
  'a GIF resolves with no thumbnail');

-- 7. the thumbnail must survive into the read API, or every bubble
--    silently falls back to the full-size image
select is(
  (select media_thumb_path from public.conversation_messages('cccccccc-0000-0000-0000-0000000000e7'::uuid)
    where media_path = 'cccccccc-0000-0000-0000-0000000000e7/a.jpg'),
  'cccccccc-0000-0000-0000-0000000000e7/thumb-a.jpg',
  'conversation_messages returns the stored thumbnail path');

select is(
  (select media_thumb_path from public.conversation_messages_page('cccccccc-0000-0000-0000-0000000000e7'::uuid)
    where media_path = 'cccccccc-0000-0000-0000-0000000000e7/a.jpg'),
  'cccccccc-0000-0000-0000-0000000000e7/thumb-a.jpg',
  'conversation_messages_page returns the stored thumbnail path');

select is(
  (select media_thumb_path from public.conversation_messages_after(
      'cccccccc-0000-0000-0000-0000000000e7'::uuid, now() - interval '1 hour')
    where media_path = 'cccccccc-0000-0000-0000-0000000000e7/a.jpg'),
  'cccccccc-0000-0000-0000-0000000000e7/thumb-a.jpg',
  'conversation_messages_after returns the stored thumbnail path');

select finish();
rollback;
