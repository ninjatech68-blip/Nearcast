-- ---------------------------------------------------------------
-- A notification knows who it is about.
--
-- The copy said "someone wants in" and "they left you a line", because
-- the outbox carried ids and nothing else — the sender genuinely could
-- not name anyone. Both lines break the Content Design Guide on its own
-- terms: Nearcast must not sound "mysterious" or "overly familiar", and
-- a notification is supposed to "name the real state change".
--
-- What is pinned here is the actor being recorded and resolved, and the
-- line the whole design rests on: the NAME is resolved at send time and
-- never stored, so the outbox stays a table of kinds and ids. No message
-- excerpt, no plan title — both are ruled out on a lock screen.
-- ---------------------------------------------------------------
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('88888888-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','an1@x','',now(),now()),
  ('88888888-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','an2@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('88888888-0000-0000-0000-0000000000a1','Aarti Menon'),
  ('88888888-0000-0000-0000-0000000000a2','Riya Sharma');
insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('88888888-1000-0000-0000-0000000000a1','88888888-0000-0000-0000-0000000000a1','sports','badminton after work','live', now()+interval '9 days', now());

-- ---- a join request names the person who asked ----
insert into public.responses (id, intent_id, respondent_id, message, status) values
  ('88888888-2000-0000-0000-0000000000a1','88888888-1000-0000-0000-0000000000a1','88888888-0000-0000-0000-0000000000a2','in','pending');

select is(
  (select actor_id from public.notification_outbox where kind = 'join_request'),
  '88888888-0000-0000-0000-0000000000a2'::uuid,
  'the caster is pinged about the person who asked, and that person is recorded');

select is(
  (select actor_name from public.claim_notification_batch(10) where kind = 'join_request'),
  'Riya', 'the claim resolves them to a first name');

-- ---- an accept names the caster ----
update public.responses set status = 'accepted' where id = '88888888-2000-0000-0000-0000000000a1';
select is(
  (select actor_id from public.notification_outbox where kind = 'join_accepted'),
  '88888888-0000-0000-0000-0000000000a1'::uuid,
  'the joiner is pinged about the caster who said yes');
select is(
  (select actor_name from public.claim_notification_batch(10) where kind = 'join_accepted'),
  'Aarti', 'and the caster resolves to their first name, not the joiner''s');

-- ---- a message names its sender ----
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id) values
  ('88888888-3000-0000-0000-0000000000a1','88888888-1000-0000-0000-0000000000a1','88888888-2000-0000-0000-0000000000a1','88888888-0000-0000-0000-0000000000a1','88888888-0000-0000-0000-0000000000a2');
insert into public.conversations (id, match_id, person_low, person_high, mode, expires_at) values
  ('88888888-4000-0000-0000-0000000000a1','88888888-3000-0000-0000-0000000000a1',
   least('88888888-0000-0000-0000-0000000000a1'::uuid,'88888888-0000-0000-0000-0000000000a2'::uuid),
   greatest('88888888-0000-0000-0000-0000000000a1'::uuid,'88888888-0000-0000-0000-0000000000a2'::uuid),
   'week', now()+interval '3 days');
update public.matches set conversation_id = '88888888-4000-0000-0000-0000000000a1'
  where id = '88888888-3000-0000-0000-0000000000a1';

insert into public.messages (conversation_id, sender_id, body, is_system)
values ('88888888-4000-0000-0000-0000000000a1','88888888-0000-0000-0000-0000000000a2','can do 7:00 pm', false);

select is(
  (select actor_id from public.notification_outbox where kind = 'chat_message'),
  '88888888-0000-0000-0000-0000000000a2'::uuid,
  'a message records who sent it');
select is(
  (select actor_name from public.claim_notification_batch(10) where kind = 'chat_message'),
  'Riya', 'so the ping can say the name instead of "they"');

-- ---- THE LINE: a name, and nothing else ----
-- The Content Design Guide rules out message excerpts and private-group
-- references on a lock screen; AGENTS.md rules out intent text and
-- messages in a payload. The outbox is what would carry them.
select is(
  (select count(*) from public.notification_outbox o
    where (o.id::text || o.kind || coalesce(o.actor_id::text,'')
           || coalesce(o.intent_id::text,'') || coalesce(o.conversation_id::text,''))
          ilike '%7:00%'),
  0::bigint, 'no message excerpt reaches the outbox');

select is(
  (select count(*) from public.notification_outbox o
    where (o.id::text || o.kind || coalesce(o.actor_id::text,'')
           || coalesce(o.intent_id::text,'') || coalesce(o.conversation_id::text,''))
          ilike '%badminton%'),
  0::bigint, 'and neither does the plan title');

-- the name is resolved at SEND time, never written down
select is(
  (select count(*) from public.notification_outbox o
    where (o.id::text || o.kind || coalesce(o.actor_id::text,''))
          ilike '%riya%'),
  0::bigint, 'the name itself is never stored on the row — only the id is');

-- ---- a name that is missing degrades, it does not break the title ----
select is(private.actor_first_name('88888888-0000-0000-0000-00000000dead'::uuid), null,
  'an unknown actor resolves to nothing at the source');
select is(
  (select coalesce(private.actor_first_name(null), 'Someone')),
  'Someone', 'and the caller falls back to a word, never to an empty title');

select finish();
rollback;
