begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select has_column('public', 'messages', 'media_path', 'messages carry a media path');
select has_column('public', 'messages', 'media_thumb_path', 'messages carry a thumbnail path');
select has_function('public', 'send_media', 'the media send path exists');

-- two parties in a conversation, plus an outsider
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mc1@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mc2@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mc3@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000c1','Caster'),
  ('00000000-0000-0000-0000-0000000000c2','Joiner'),
  ('00000000-0000-0000-0000-0000000000c3','Outsider');

insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('66666666-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c1','sports','a plan','matched', now()+interval '2 days', now());
insert into public.responses (id, intent_id, respondent_id, message, status) values
  ('66666666-0000-0000-0000-0000000000b1','66666666-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c2','in','accepted');
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id) values
  ('77777777-0000-0000-0000-0000000000a1','66666666-0000-0000-0000-0000000000a1','66666666-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c2');
insert into public.conversations (id, match_id, person_low, person_high, mode, expires_at) values
  ('88888888-0000-0000-0000-0000000000a1','77777777-0000-0000-0000-0000000000a1',
   least('00000000-0000-0000-0000-0000000000c1'::uuid,'00000000-0000-0000-0000-0000000000c2'::uuid),
   greatest('00000000-0000-0000-0000-0000000000c1'::uuid,'00000000-0000-0000-0000-0000000000c2'::uuid),
   'day', now()+interval '1 day');
update public.matches set conversation_id = '88888888-0000-0000-0000-0000000000a1'
  where id = '77777777-0000-0000-0000-0000000000a1';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';

-- a photo with no caption is a valid message
select lives_ok(
  $$ select public.send_media('88888888-0000-0000-0000-0000000000a1'::uuid,
       '88888888-0000-0000-0000-0000000000a1/one.jpg', 'image', 800, 600, null) $$,
  'a party may send a photo with no words');

-- ...and it comes back with its path and kind intact
select is(
  (select media_kind from public.conversation_messages('88888888-0000-0000-0000-0000000000a1')
    where media_path = '88888888-0000-0000-0000-0000000000a1/one.jpg'),
  'image', 'the reader returns the media kind');

select is(
  (select media_thumb_path from public.conversation_messages('88888888-0000-0000-0000-0000000000a1')
    where media_path = '88888888-0000-0000-0000-0000000000a1/one.jpg'),
  '88888888-0000-0000-0000-0000000000a1/one.jpg',
  'legacy calls still resolve to an in-conversation thumbnail path');

-- a path outside this conversation's folder is refused: the storage
-- policies key on that folder, so the row must never disagree with them
select throws_ok(
  $$ select public.send_media('88888888-0000-0000-0000-0000000000a1'::uuid,
       '99999999-0000-0000-0000-0000000000zz/sneak.jpg', 'image', null, null, null) $$,
  '42501', 'media_path_outside_conversation',
  'a path outside the conversation folder is refused');

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';

-- an outsider cannot put anything in someone else's room
select throws_ok(
  $$ select public.send_media('88888888-0000-0000-0000-0000000000a1'::uuid,
       '88888888-0000-0000-0000-0000000000a1/sneak.jpg', 'image', null, null, null) $$,
  '42501', 'not_a_party',
  'a non-party cannot send media into the room');

reset role;
select finish();
rollback;
