-- ---------------------------------------------------------------
-- Paging holds when timestamps tie.
--
-- The keyset carries an id alongside created_at for one reason: two
-- messages can share a timestamp. The existing paging test spaces every
-- message a second apart, so it never exercises the tie-break that the
-- id is there for — and a keyset that breaks on ties does not fail
-- loudly, it silently drops or repeats a message in the middle of
-- someone's history.
--
-- So: five messages on the exact same created_at, walked backwards a
-- page at a time, asserting the walk sees each of them once.
-- ---------------------------------------------------------------
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('22222222-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tie1@x','',now(),now()),
  ('22222222-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tie2@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('22222222-0000-0000-0000-0000000000d1','A One'),
  ('22222222-0000-0000-0000-0000000000d2','B Two');
insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('22222222-1000-0000-0000-0000000000d1','22222222-0000-0000-0000-0000000000d1','sports','a plan','matched', now()+interval '2 days', now());
insert into public.responses (id, intent_id, respondent_id, message, status) values
  ('22222222-2000-0000-0000-0000000000d1','22222222-1000-0000-0000-0000000000d1','22222222-0000-0000-0000-0000000000d2','in','accepted');
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id) values
  ('22222222-3000-0000-0000-0000000000d1','22222222-1000-0000-0000-0000000000d1','22222222-2000-0000-0000-0000000000d1','22222222-0000-0000-0000-0000000000d1','22222222-0000-0000-0000-0000000000d2');
insert into public.conversations (id, match_id, person_low, person_high, mode, expires_at) values
  ('22222222-4000-0000-0000-0000000000d1','22222222-3000-0000-0000-0000000000d1',
   least('22222222-0000-0000-0000-0000000000d1'::uuid,'22222222-0000-0000-0000-0000000000d2'::uuid),
   greatest('22222222-0000-0000-0000-0000000000d1'::uuid,'22222222-0000-0000-0000-0000000000d2'::uuid),
   'day', now()+interval '1 day');
update public.matches set conversation_id = '22222222-4000-0000-0000-0000000000d1'
  where id = '22222222-3000-0000-0000-0000000000d1';

-- five messages, one timestamp between them. ids are deliberately NOT
-- in body order, so a walk that leans on the id ordering rather than
-- luck is the only one that passes.
insert into public.messages (id, conversation_id, sender_id, body, is_system, created_at) values
  ('22222222-5000-0000-0000-00000000000c','22222222-4000-0000-0000-0000000000d1','22222222-0000-0000-0000-0000000000d1','m3',false,'2026-08-30T10:00:00Z'),
  ('22222222-5000-0000-0000-00000000000a','22222222-4000-0000-0000-0000000000d1','22222222-0000-0000-0000-0000000000d1','m1',false,'2026-08-30T10:00:00Z'),
  ('22222222-5000-0000-0000-00000000000e','22222222-4000-0000-0000-0000000000d1','22222222-0000-0000-0000-0000000000d2','m5',false,'2026-08-30T10:00:00Z'),
  ('22222222-5000-0000-0000-00000000000b','22222222-4000-0000-0000-0000000000d1','22222222-0000-0000-0000-0000000000d2','m2',false,'2026-08-30T10:00:00Z'),
  ('22222222-5000-0000-0000-00000000000d','22222222-4000-0000-0000-0000000000d1','22222222-0000-0000-0000-0000000000d1','m4',false,'2026-08-30T10:00:00Z');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"22222222-0000-0000-0000-0000000000d1","role":"authenticated"}';

-- the newest page of two, by the keyset's own ordering
select is(
  (select string_agg(id::text, ',' order by created_at asc, id asc)
     from public.conversation_messages_page('22222222-4000-0000-0000-0000000000d1', null, null, 2)),
  '22222222-5000-0000-0000-00000000000d,22222222-5000-0000-0000-00000000000e',
  'the newest page of a tied run is the two highest ids');

-- step back from the oldest row of that page
select is(
  (select string_agg(id::text, ',' order by created_at asc, id asc)
     from public.conversation_messages_page(
       '22222222-4000-0000-0000-0000000000d1',
       '2026-08-30T10:00:00Z'::timestamptz,
       '22222222-5000-0000-0000-00000000000d'::uuid, 2)),
  '22222222-5000-0000-0000-00000000000b,22222222-5000-0000-0000-00000000000c',
  'the next page back does not repeat the cursor row');

select is(
  (select string_agg(id::text, ',' order by created_at asc, id asc)
     from public.conversation_messages_page(
       '22222222-4000-0000-0000-0000000000d1',
       '2026-08-30T10:00:00Z'::timestamptz,
       '22222222-5000-0000-0000-00000000000b'::uuid, 2)),
  '22222222-5000-0000-0000-00000000000a',
  'the last page back returns the single remaining message');

select is(
  (select count(*) from public.conversation_messages_page(
       '22222222-4000-0000-0000-0000000000d1',
       '2026-08-30T10:00:00Z'::timestamptz,
       '22222222-5000-0000-0000-00000000000a'::uuid, 2)),
  0::bigint, 'walking past the oldest message returns nothing');

-- the whole walk, reassembled: every message exactly once
select is(
  (select count(distinct id) from (
     select id from public.conversation_messages_page('22222222-4000-0000-0000-0000000000d1', null, null, 2)
     union all
     select id from public.conversation_messages_page('22222222-4000-0000-0000-0000000000d1',
       '2026-08-30T10:00:00Z'::timestamptz, '22222222-5000-0000-0000-00000000000d'::uuid, 2)
     union all
     select id from public.conversation_messages_page('22222222-4000-0000-0000-0000000000d1',
       '2026-08-30T10:00:00Z'::timestamptz, '22222222-5000-0000-0000-00000000000b'::uuid, 2)
   ) walked),
  5::bigint, 'the whole walk sees all five messages');

select is(
  (select count(*) from (
     select id from public.conversation_messages_page('22222222-4000-0000-0000-0000000000d1', null, null, 2)
     union all
     select id from public.conversation_messages_page('22222222-4000-0000-0000-0000000000d1',
       '2026-08-30T10:00:00Z'::timestamptz, '22222222-5000-0000-0000-00000000000d'::uuid, 2)
     union all
     select id from public.conversation_messages_page('22222222-4000-0000-0000-0000000000d1',
       '2026-08-30T10:00:00Z'::timestamptz, '22222222-5000-0000-0000-00000000000b'::uuid, 2)
   ) walked),
  5::bigint, 'and sees none of them twice');

-- the catch-up reader is the same keyset the other way round
select is(
  (select string_agg(id::text, ',' order by created_at asc, id asc)
     from public.conversation_messages_after(
       '22222222-4000-0000-0000-0000000000d1',
       '2026-08-30T10:00:00Z'::timestamptz,
       '22222222-5000-0000-0000-00000000000c'::uuid, 100)),
  '22222222-5000-0000-0000-00000000000d,22222222-5000-0000-0000-00000000000e',
  'catching up from a tied cursor returns only what follows it');

select finish();
rollback;
