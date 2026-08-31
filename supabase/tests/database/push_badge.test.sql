-- ---------------------------------------------------------------
-- The badge is a number, and it can come back down.
--
-- The client already asked permission to show one — `shouldSetBadge`
-- has been true from the start — but no notification ever carried a
-- count, so the icon badge stayed empty however much was waiting.
--
-- The number itself is the easy half. The half worth pinning is that it
-- CLEARS: a badge that counts messages in a chat you can no longer
-- reply to is a badge nobody can ever get rid of.
-- ---------------------------------------------------------------
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('77777777-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','bg1@x','',now(),now()),
  ('77777777-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','bg2@x','',now(),now()),
  ('77777777-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','bg3@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('77777777-0000-0000-0000-0000000000a1','Reader'),
  ('77777777-0000-0000-0000-0000000000a2','Writer Two'),
  ('77777777-0000-0000-0000-0000000000a3','Writer Three');

insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('77777777-1000-0000-0000-0000000000a1','77777777-0000-0000-0000-0000000000a1','sports','plan one','matched', now()+interval '9 days', now()),
  ('77777777-1000-0000-0000-0000000000a2','77777777-0000-0000-0000-0000000000a1','sports','plan two','matched', now()+interval '9 days', now());
insert into public.responses (id, intent_id, respondent_id, message, status) values
  ('77777777-2000-0000-0000-0000000000a1','77777777-1000-0000-0000-0000000000a1','77777777-0000-0000-0000-0000000000a2','in','accepted'),
  ('77777777-2000-0000-0000-0000000000a2','77777777-1000-0000-0000-0000000000a2','77777777-0000-0000-0000-0000000000a3','in','accepted');
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id) values
  ('77777777-3000-0000-0000-0000000000a1','77777777-1000-0000-0000-0000000000a1','77777777-2000-0000-0000-0000000000a1','77777777-0000-0000-0000-0000000000a1','77777777-0000-0000-0000-0000000000a2'),
  ('77777777-3000-0000-0000-0000000000a2','77777777-1000-0000-0000-0000000000a2','77777777-2000-0000-0000-0000000000a2','77777777-0000-0000-0000-0000000000a1','77777777-0000-0000-0000-0000000000a3');
insert into public.conversations (id, match_id, person_low, person_high, mode, expires_at) values
  ('77777777-4000-0000-0000-0000000000a1','77777777-3000-0000-0000-0000000000a1',
   least('77777777-0000-0000-0000-0000000000a1'::uuid,'77777777-0000-0000-0000-0000000000a2'::uuid),
   greatest('77777777-0000-0000-0000-0000000000a1'::uuid,'77777777-0000-0000-0000-0000000000a2'::uuid),
   'week', now()+interval '3 days'),
  ('77777777-4000-0000-0000-0000000000a2','77777777-3000-0000-0000-0000000000a2',
   least('77777777-0000-0000-0000-0000000000a1'::uuid,'77777777-0000-0000-0000-0000000000a3'::uuid),
   greatest('77777777-0000-0000-0000-0000000000a1'::uuid,'77777777-0000-0000-0000-0000000000a3'::uuid),
   'week', now()+interval '3 days');
update public.matches m set conversation_id = c.id from public.conversations c where c.match_id = m.id;

select is(private.unread_badge('77777777-0000-0000-0000-0000000000a1'::uuid), 0,
  'nothing waiting is a badge of zero, not a badge of null');

-- three in one chat, two in another
insert into public.messages (conversation_id, sender_id, body, is_system, created_at)
select '77777777-4000-0000-0000-0000000000a1','77777777-0000-0000-0000-0000000000a2','hi '||k,false, now() - (k * interval '1 minute')
from generate_series(1,3) k;
insert into public.messages (conversation_id, sender_id, body, is_system, created_at)
select '77777777-4000-0000-0000-0000000000a2','77777777-0000-0000-0000-0000000000a3','yo '||k,false, now() - (k * interval '1 minute')
from generate_series(1,2) k;

select is(private.unread_badge('77777777-0000-0000-0000-0000000000a1'::uuid), 5,
  'the badge sums every chat, not just the busiest one');

-- my own messages are not something waiting for me
insert into public.messages (conversation_id, sender_id, body, is_system, created_at)
values ('77777777-4000-0000-0000-0000000000a1','77777777-0000-0000-0000-0000000000a1','mine',false, now());
select is(private.unread_badge('77777777-0000-0000-0000-0000000000a1'::uuid), 5,
  'my own message does not raise my own badge');

-- neither is the app talking to itself
insert into public.messages (conversation_id, sender_id, body, is_system, created_at)
values ('77777777-4000-0000-0000-0000000000a1', null, 'the window is 7 days now.', true, now());
select is(private.unread_badge('77777777-0000-0000-0000-0000000000a1'::uuid), 5,
  'a system note is not an unread message');

-- the writer sees their own side of it
select is(private.unread_badge('77777777-0000-0000-0000-0000000000a2'::uuid), 1,
  'the other person has their own count, from their own side');

-- reading one chat takes only that chat off the badge
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"77777777-0000-0000-0000-0000000000a1","role":"authenticated"}';
select public.mark_conversation_read('77777777-4000-0000-0000-0000000000a1'::uuid);
select is(public.my_unread_badge(), 2,
  'reading one chat clears its share and leaves the rest');

-- THE ONE THAT MATTERS: a badge you cannot clear is worse than no badge
reset role;
update public.conversations set mode = 'ended', closed_at = now()
  where id = '77777777-4000-0000-0000-0000000000a2';
select is(private.unread_badge('77777777-0000-0000-0000-0000000000a1'::uuid), 0,
  'a chat you can no longer reply to stops counting — the badge can always reach zero');

-- an expired window counts the same way, without waiting for the sweeper
update public.conversations set mode = 'week', closed_at = null, expires_at = now() - interval '1 hour'
  where id = '77777777-4000-0000-0000-0000000000a2';
select is(private.unread_badge('77777777-0000-0000-0000-0000000000a1'::uuid), 0,
  'a lapsed window stops counting the moment it lapses');

-- and the claim hands the sender the number, so a push can carry it.
-- the messages above already queued the ping; the one-ping-per-chat
-- index means there is exactly one to take.
update public.conversations set expires_at = now() + interval '3 days'
  where id = '77777777-4000-0000-0000-0000000000a2';
select is(
  (select badge from public.claim_notification_batch(10)
    where kind = 'chat_message' and conversation_id = '77777777-4000-0000-0000-0000000000a2'),
  2, 'the claim returns the live badge, so the sender needs no second round trip');

select finish();
rollback;
