-- ---------------------------------------------------------------
-- The hot path got cheaper without getting different.
--
-- An open chat polls several times a minute, and every tick used to do
-- work proportional to the whole thread: both receipt marks rewrote a
-- row for EVERY message in the conversation, and the metadata came
-- from pulling the entire conversation list and throwing all but one
-- row away. The fix is to bound each of those by what changed.
--
-- Cheaper is only worth anything if the answer is the same, so these
-- pin equivalence, not speed: the single-row reader agrees with the
-- list it replaces, and the watermarked receipt marks still reach every
-- message the unbounded ones did.
-- ---------------------------------------------------------------
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('55555555-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','hp1@x','',now(),now()),
  ('55555555-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','hp2@x','',now(),now()),
  ('55555555-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','hp3@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('55555555-0000-0000-0000-0000000000a1','Reader One'),
  ('55555555-0000-0000-0000-0000000000a2','Writer Two'),
  ('55555555-0000-0000-0000-0000000000a3','Other Three');

-- two conversations, so "one row" is genuinely a subset of "the list"
insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('55555555-1000-0000-0000-0000000000a1','55555555-0000-0000-0000-0000000000a1','sports','plan one','matched', now()+interval '9 days', now()),
  ('55555555-1000-0000-0000-0000000000a2','55555555-0000-0000-0000-0000000000a1','sports','plan two','matched', now()+interval '9 days', now());
insert into public.responses (id, intent_id, respondent_id, message, status) values
  ('55555555-2000-0000-0000-0000000000a1','55555555-1000-0000-0000-0000000000a1','55555555-0000-0000-0000-0000000000a2','in','accepted'),
  ('55555555-2000-0000-0000-0000000000a2','55555555-1000-0000-0000-0000000000a2','55555555-0000-0000-0000-0000000000a3','in','accepted');
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id) values
  ('55555555-3000-0000-0000-0000000000a1','55555555-1000-0000-0000-0000000000a1','55555555-2000-0000-0000-0000000000a1','55555555-0000-0000-0000-0000000000a1','55555555-0000-0000-0000-0000000000a2'),
  ('55555555-3000-0000-0000-0000000000a2','55555555-1000-0000-0000-0000000000a2','55555555-2000-0000-0000-0000000000a2','55555555-0000-0000-0000-0000000000a1','55555555-0000-0000-0000-0000000000a3');
insert into public.conversations (id, match_id, person_low, person_high, mode, expires_at) values
  ('55555555-4000-0000-0000-0000000000a1','55555555-3000-0000-0000-0000000000a1',
   least('55555555-0000-0000-0000-0000000000a1'::uuid,'55555555-0000-0000-0000-0000000000a2'::uuid),
   greatest('55555555-0000-0000-0000-0000000000a1'::uuid,'55555555-0000-0000-0000-0000000000a2'::uuid),
   'week', now()+interval '3 days'),
  ('55555555-4000-0000-0000-0000000000a2','55555555-3000-0000-0000-0000000000a2',
   least('55555555-0000-0000-0000-0000000000a1'::uuid,'55555555-0000-0000-0000-0000000000a3'::uuid),
   greatest('55555555-0000-0000-0000-0000000000a1'::uuid,'55555555-0000-0000-0000-0000000000a3'::uuid),
   'day', now()+interval '5 hours');
update public.matches m set conversation_id = c.id from public.conversations c where c.match_id = m.id;

-- a thread with history, and unread messages on top of it
insert into public.messages (conversation_id, sender_id, body, is_system, created_at)
select '55555555-4000-0000-0000-0000000000a1',
       case when k % 2 = 0 then '55555555-0000-0000-0000-0000000000a1'::uuid
                           else '55555555-0000-0000-0000-0000000000a2'::uuid end,
       'history '||k, false, now() - ((60 - k) * interval '1 hour')
from generate_series(1, 40) k;
insert into public.messages (conversation_id, sender_id, body, is_system, created_at) values
  ('55555555-4000-0000-0000-0000000000a2','55555555-0000-0000-0000-0000000000a3','other chat',false, now() - interval '10 minutes');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"55555555-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- ---- the single-row reader agrees with the list, column for column ----
select is(
  (select count(*) from public.conversation_summary('55555555-4000-0000-0000-0000000000a1'::uuid)),
  1::bigint, 'the summary returns exactly one row');

select is(
  (select row(conversation_id, intent_id, cast_title, other_id, other_first_name, mode,
              expires_at, last_message, last_at, unread_count, other_last_read_at,
              proposed_mode, proposed_by_me, plan_count)::text
     from public.conversation_summary('55555555-4000-0000-0000-0000000000a1'::uuid)),
  (select row(conversation_id, intent_id, cast_title, other_id, other_first_name, mode,
              expires_at, last_message, last_at, unread_count, other_last_read_at,
              proposed_mode, proposed_by_me, plan_count)::text
     from public.my_conversations()
    where conversation_id = '55555555-4000-0000-0000-0000000000a1'),
  'every column of the summary matches the list row it replaces');

select is(
  (select count(*) from public.conversation_summary('55555555-4000-0000-0000-0000000000a2'::uuid)),
  1::bigint, 'the other conversation is reachable too — not just the first');

-- someone else's conversation is not readable through the new door
select is(
  (select count(*) from public.conversation_summary('55555555-4000-0000-0000-0000000000a9'::uuid)),
  0::bigint, 'a conversation you are not in returns nothing');

-- ---- the list still orders newest-first ----
-- a2's last message is minutes old, a1's is hours old, so a2 leads
select is(
  (select conversation_id from public.my_conversations() limit 1),
  '55555555-4000-0000-0000-0000000000a2'::uuid,
  'the list still leads with the most recently active chat');

-- ---- unread is counted the same as before ----
select is(
  (select unread_count from public.conversation_summary('55555555-4000-0000-0000-0000000000a1'::uuid)),
  20::bigint, 'unread counts every message from the other person');

-- ---- the watermarked marks still reach EVERY message ----
select lives_ok(
  $$ select public.mark_conversation_delivered('55555555-4000-0000-0000-0000000000a1'::uuid) $$,
  'delivery is confirmed');
select is(
  (select count(*) from public.message_receipts r
     join public.messages m on m.id = r.message_id
    where m.conversation_id = '55555555-4000-0000-0000-0000000000a1'
      and r.recipient_id = '55555555-0000-0000-0000-0000000000a1'
      and r.delivered_at is not null),
  20::bigint, 'a first pass stamps every message from the other person, not just recent ones');

select lives_ok(
  $$ select public.mark_conversation_read('55555555-4000-0000-0000-0000000000a1'::uuid) $$,
  'the thread is read');
select is(
  (select count(*) from public.message_receipts r
     join public.messages m on m.id = r.message_id
    where m.conversation_id = '55555555-4000-0000-0000-0000000000a1'
      and r.recipient_id = '55555555-0000-0000-0000-0000000000a1'
      and r.read_at is not null),
  20::bigint, 'reading stamps every one of them too');

select is(
  (select unread_count from public.conversation_summary('55555555-4000-0000-0000-0000000000a1'::uuid)),
  0::bigint, 'and the unread count falls to zero');

-- ---- a message arriving AFTER the watermark is still picked up ----
reset role;
insert into public.messages (conversation_id, sender_id, body, is_system, created_at)
values ('55555555-4000-0000-0000-0000000000a1','55555555-0000-0000-0000-0000000000a2','after the watermark',false, now());
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"55555555-0000-0000-0000-0000000000a1","role":"authenticated"}';
select public.mark_conversation_read('55555555-4000-0000-0000-0000000000a1'::uuid);
select is(
  (select r.read_at is not null from public.message_receipts r
     join public.messages m on m.id = r.message_id
    where m.body = 'after the watermark' and r.recipient_id = '55555555-0000-0000-0000-0000000000a1'),
  true, 'a message arriving after the watermark is still stamped on the next tick');

select finish();
rollback;
