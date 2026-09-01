-- ===============================================================
-- The laws, as assertions.
-- ===============================================================
--
-- Written before the schema existed. Every assertion here traces to
-- a numbered law in the permissions matrix, and the matrix traces to
-- a recorded product decision. If a law changes, this file changes
-- first and the schema follows.
--
-- L1 is table-driven on purpose: it enumerates every table in the
-- public schema and asserts no write privilege exists. A new table
-- added without thought therefore fails this suite rather than
-- quietly shipping a write surface -- which is the failure mode that
-- produced four privilege escalations in the previous build.
-- ===============================================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

-- --------------------------------------------------------------
-- personas
--   A  caster
--   B  in A's circle, verified
--   C  verified, no relationship to A
--   M  moderator
-- --------------------------------------------------------------
insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a'),
  ('bbbbbbbb-0000-0000-0000-00000000000b'),
  ('cccccccc-0000-0000-0000-00000000000c'),
  ('dddddddd-0000-0000-0000-00000000000d');

insert into public.people (id, display_name) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'Aarav'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'Bhavna'),
  ('cccccccc-0000-0000-0000-00000000000c', 'Chetan'),
  ('dddddddd-0000-0000-0000-00000000000d', 'Mira');

insert into public.person_verification (person_id, phone_e164, verified_at) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', '+910000000001', now()),
  ('bbbbbbbb-0000-0000-0000-00000000000b', '+910000000002', now()),
  ('cccccccc-0000-0000-0000-00000000000c', '+910000000003', now());

-- Every cast is broadcast from one of the caster's approved areas.
-- B has one too, so the L9 refusal below can only be the restriction --
-- publish_cast would otherwise reject an area that is not the caster's,
-- with the same error code, and the test would pass for the wrong reason.
insert into public.person_areas (person_id, name, centroid) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'Indiranagar',
   extensions.ST_Point(77.6408, 12.9784)::extensions.geography),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'Domlur',
   extensions.ST_Point(77.6390, 12.9610)::extensions.geography);

insert into public.circles (id, owner_id, name) values
  ('c1c1c1c1-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'badminton');
insert into public.circle_members (circle_id, person_id) values
  ('c1c1c1c1-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b');

insert into public.casts (
  id, caster_id, category, statement, slots, area_name, happens_at, expires_at, state, published_at
) values (
  'ca57ca57-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
  'sports', 'badminton after work.', 2, 'Indiranagar',
  now() + interval '6 hours', now() + interval '8 hours', 'live', now()
);
insert into public.cast_reach (cast_id, kind) values
  ('ca57ca57-0000-0000-0000-000000000001', 'circles');
insert into public.cast_reach_circles (cast_id, circle_id) values
  ('ca57ca57-0000-0000-0000-000000000001', 'c1c1c1c1-0000-0000-0000-000000000001');
insert into public.cast_deliveries (cast_id, person_id, reason_code, reason_text) values
  ('ca57ca57-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b',
   'circle', 'you are in a circle of theirs');

-- ===============================================================
-- L1  no client write privilege exists, on any table
-- ===============================================================
select is_empty(
  $$ select table_name || '.' || privilege_type
       from information_schema.table_privileges
      where grantee in ('authenticated','anon')
        and table_schema = 'public'
        and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES') $$,
  'L1 no table-level write privilege is granted to any client role'
);
select is_empty(
  $$ select table_name || '.' || column_name || '/' || privilege_type
       from information_schema.column_privileges
      where grantee in ('authenticated','anon')
        and table_schema = 'public'
        and privilege_type in ('INSERT','UPDATE','REFERENCES') $$,
  'L1 no column-level write privilege is granted either'
);
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity $$,
  'L1 row level security is enabled on every table in public'
);
select is_empty(
  $$ select tablename || ' :: ' || policyname from pg_policies
      where schemaname = 'public' and cmd <> 'SELECT' $$,
  'L1 no policy grants anything but SELECT -- writes are functions only'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';

select throws_ok(
  $$ insert into public.casts (caster_id, category, statement, slots, happens_at, expires_at, state)
     values (auth.uid(), 'social', 'sneaking a row in', 1, now() + interval '1 day', now() + interval '2 days', 'live') $$,
  '42501', null, 'L1 a client cannot insert a cast directly'
);
select throws_ok(
  $$ update public.people set display_name = 'renamed' where id = auth.uid() $$,
  '42501', null, 'L1 a client cannot update even their own row directly'
);
select throws_ok(
  $$ update public.cast_deliveries set cast_id = 'ca57ca57-0000-0000-0000-000000000001' where person_id = auth.uid() $$,
  '42501', null, 'L1 the delivery-repointing escalation is structurally impossible'
);
select throws_ok(
  $$ delete from public.blocks where blocker_id = auth.uid() $$,
  '42501', null, 'L1 a client cannot delete directly'
);

-- ===============================================================
-- L3  circle membership is invisible from outside
-- ===============================================================
select results_eq(
  $$ select count(*) from public.circle_members
      where circle_id = 'c1c1c1c1-0000-0000-0000-000000000001' $$,
  array[1::bigint],
  'L3 a member reads the membership of a circle they are in'
);
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}';
select is_empty(
  $$ select 1 from public.circle_members
      where circle_id = 'c1c1c1c1-0000-0000-0000-000000000001' $$,
  'L3 a non-member reads no membership rows at all'
);
select is_empty(
  $$ select 1 from public.circles where id = 'c1c1c1c1-0000-0000-0000-000000000001' $$,
  'L3 a non-member cannot even see that the circle exists'
);

-- ===============================================================
-- L6  reach never widens -- C is nearby but not in the circle
-- ===============================================================
select is_empty(
  $$ select 1 from public.casts where id = 'ca57ca57-0000-0000-0000-000000000001' $$,
  'L6 a circles-only cast is invisible to someone outside those circles'
);
select throws_ok(
  $$ select public.request_to_join('ca57ca57-0000-0000-0000-000000000001', 'me too') $$,
  'P0002', null, 'L6 and they cannot join a cast that was never delivered to them'
);

-- ===============================================================
-- L10 a cast freezes on the first join request
-- ===============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok(
  $$ select public.edit_cast('ca57ca57-0000-0000-0000-000000000001', 'badminton after work, 7pm.') $$,
  'L10 the caster can edit while nobody has asked to join'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select lives_ok(
  $$ select public.request_to_join('ca57ca57-0000-0000-0000-000000000001', 'in') $$,
  'L10 a delivered person can ask to join'
);
select throws_ok(
  $$ select public.request_to_join('ca57ca57-0000-0000-0000-000000000001', 'again') $$,
  '23505', null, 'a person cannot ask twice'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok(
  $$ select public.edit_cast('ca57ca57-0000-0000-0000-000000000001', 'actually, squash.') $$,
  '23514', null, 'L10 the words are frozen once someone has acted on them'
);

-- ===============================================================
-- isolation  a requester never sees a competing request
-- ===============================================================
select results_eq(
  $$ select count(*) from public.join_requests
      where cast_id = 'ca57ca57-0000-0000-0000-000000000001' $$,
  array[1::bigint],
  'the caster reads every request on their own cast'
);
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}';
select is_empty(
  $$ select 1 from public.join_requests $$,
  'isolation an unrelated person reads no requests'
);

-- ===============================================================
-- L5  a vouch requires a settled receipt
-- ===============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok(
  $$ select public.vouch_for('bbbbbbbb-0000-0000-0000-00000000000b') $$,
  '23514', null, 'L5 vouching without a settled receipt is refused'
);
select throws_ok(
  $$ select public.vouch_for('aaaaaaaa-0000-0000-0000-00000000000a') $$,
  '23514', null, 'L5 vouching for yourself is refused'
);

-- ===============================================================
-- L9  restriction cannot be self-cleared, and stops everything
-- ===============================================================
reset role;
insert into public.account_restrictions (person_id, reason, restricted_at)
values ('bbbbbbbb-0000-0000-0000-00000000000b', 'test hold', now());

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select is_empty(
  $$ select 1 from public.account_restrictions $$,
  'L9 a restricted person cannot read the restriction record'
);
select throws_ok(
  $$ delete from public.account_restrictions where person_id = auth.uid() $$,
  '42501', null, 'L9 and cannot remove it'
);
select throws_ok(
  $$ select public.publish_cast('social', 'still here', 1, now() + interval '1 day', 'nearby', 'Domlur') $$,
  '42501', null, 'L9 a restricted account cannot publish'
);

-- ===============================================================
-- L7  blocking is symmetric and immediate
-- ===============================================================
reset role;
delete from public.account_restrictions where person_id = 'bbbbbbbb-0000-0000-0000-00000000000b';
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok(
  $$ select public.block_person('bbbbbbbb-0000-0000-0000-00000000000b') $$,
  'L7 a person can block another'
);
select is_empty(
  $$ select 1 from public.people where id = 'bbbbbbbb-0000-0000-0000-00000000000b' $$,
  'L7 the blocker no longer sees the blocked person'
);
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select is_empty(
  $$ select 1 from public.people where id = 'aaaaaaaa-0000-0000-0000-00000000000a' $$,
  'L7 and the blocked person no longer sees the blocker -- symmetric'
);
select is_empty(
  $$ select 1 from public.casts where id = 'ca57ca57-0000-0000-0000-000000000001' $$,
  'L7 the blocked person loses sight of the cast too'
);
select is_empty(
  $$ select 1 from public.blocks $$,
  'L7 the blocked person cannot see that a block exists'
);

-- ===============================================================
-- L2  no coordinate describing a person is readable by another
-- ===============================================================
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}';
select is_empty(
  $$ select 1 from public.person_areas where person_id <> auth.uid() $$,
  'L2 nobody reads another person''s approved areas'
);
select is_empty(
  $$ select 1 from public.person_interests where person_id <> auth.uid() $$,
  'L2 nor their interests'
);
select is_empty(
  $$ select 1 from public.person_verification where person_id <> auth.uid() $$,
  'L2 nor their phone number'
);

-- ===============================================================
-- L8  a delivery cannot exist without a stored reason
-- ===============================================================
reset role;
select throws_ok(
  $$ insert into public.cast_deliveries (cast_id, person_id, reason_code, reason_text)
     values ('ca57ca57-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-00000000000c','circle','') $$,
  '23514', null, 'L8 an empty delivery reason is refused even for the service role'
);
select throws_ok(
  $$ insert into public.cast_deliveries (cast_id, person_id, reason_code)
     values ('ca57ca57-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-00000000000c','circle') $$,
  '23502', null, 'L8 a missing delivery reason is refused'
);

-- ===============================================================
-- L12 the moderation audit is append-only
-- ===============================================================
insert into public.moderation_actions (moderator_id, subject_person_id, action, reason)
values ('dddddddd-0000-0000-0000-00000000000d','cccccccc-0000-0000-0000-00000000000c','restrict','test');
select throws_ok(
  $$ update public.moderation_actions set reason = 'rewritten' $$,
  'P0001', null, 'L12 nobody can update a moderation action, including the service role'
);
select throws_ok(
  $$ delete from public.moderation_actions $$,
  'P0001', null, 'L12 nor delete one'
);

-- ===============================================================
-- operations tables are unreachable by clients
-- ===============================================================
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}';
select is_empty($$ select 1 from public.rate_limits $$,        'ops rate_limits is invisible to clients');
select is_empty($$ select 1 from public.idempotency_keys $$,   'ops idempotency_keys is invisible to clients');
select is_empty($$ select 1 from public.notification_outbox $$,'ops notification_outbox is invisible to clients');
select is_empty($$ select 1 from public.analytics_outbox $$,   'ops analytics_outbox is invisible to clients');

reset role;
select * from finish();
rollback;
