-- ===============================================================
-- Delivery: L6 (reach never widens) and L8 (every delivery carries
-- a stored reason), asserted by running the generator.
-- ===============================================================
--
-- The personas exist to pin one rule each. If an assertion here
-- fails, the persona name says which rule broke:
--
--   A  the caster                              -- never reached
--   B  in A's circle, near, interested          -- reached by both casts
--   C  near, interested, no relationship        -- nearby only
--   D  near, verified, NOT interested           -- never
--   E  interested, verified, FAR                -- never
--   F  near, interested, UNVERIFIED             -- never
--   G  near, interested, RESTRICTED             -- never
--   H  near, interested, BLOCKED by A           -- never
--
-- Distances are real. Indiranagar to Domlur is about 1.9 km, to
-- Whitefield about 12 km, so a 3 km radius separates them without
-- depending on a fudge factor.
-- ===============================================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

-- --------------------------------------------------------------
-- personas
-- --------------------------------------------------------------
insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a'),
  ('bbbbbbbb-0000-0000-0000-00000000000b'),
  ('cccccccc-0000-0000-0000-00000000000c'),
  ('dddddddd-0000-0000-0000-00000000000d'),
  ('eeeeeeee-0000-0000-0000-00000000000e'),
  ('ffffffff-0000-0000-0000-00000000000f'),
  ('11111111-0000-0000-0000-000000000011'),
  ('22222222-0000-0000-0000-000000000022');

insert into public.people (id, display_name) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'Aarav'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'Bhavna'),
  ('cccccccc-0000-0000-0000-00000000000c', 'Chetan'),
  ('dddddddd-0000-0000-0000-00000000000d', 'Divya'),
  ('eeeeeeee-0000-0000-0000-00000000000e', 'Eshan'),
  ('ffffffff-0000-0000-0000-00000000000f', 'Farida'),
  ('11111111-0000-0000-0000-000000000011', 'Gautam'),
  ('22222222-0000-0000-0000-000000000022', 'Hiral');

-- F is deliberately absent: unverified.
insert into public.person_verification (person_id, phone_e164, verified_at) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', '+910000000001', now()),
  ('bbbbbbbb-0000-0000-0000-00000000000b', '+910000000002', now()),
  ('cccccccc-0000-0000-0000-00000000000c', '+910000000003', now()),
  ('dddddddd-0000-0000-0000-00000000000d', '+910000000004', now()),
  ('eeeeeeee-0000-0000-0000-00000000000e', '+910000000005', now()),
  ('11111111-0000-0000-0000-000000000011', '+910000000007', now()),
  ('22222222-0000-0000-0000-000000000022', '+910000000008', now());

insert into public.person_areas (person_id, name, centroid) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'Indiranagar', extensions.ST_Point(77.6408, 12.9784)::extensions.geography),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'Domlur',      extensions.ST_Point(77.6390, 12.9610)::extensions.geography),
  ('cccccccc-0000-0000-0000-00000000000c', 'Domlur',      extensions.ST_Point(77.6390, 12.9610)::extensions.geography),
  ('dddddddd-0000-0000-0000-00000000000d', 'Domlur',      extensions.ST_Point(77.6390, 12.9610)::extensions.geography),
  ('eeeeeeee-0000-0000-0000-00000000000e', 'Whitefield',  extensions.ST_Point(77.7500, 12.9700)::extensions.geography),
  ('ffffffff-0000-0000-0000-00000000000f', 'Domlur',      extensions.ST_Point(77.6390, 12.9610)::extensions.geography),
  ('11111111-0000-0000-0000-000000000011', 'Domlur',      extensions.ST_Point(77.6390, 12.9610)::extensions.geography),
  ('22222222-0000-0000-0000-000000000022', 'Domlur',      extensions.ST_Point(77.6390, 12.9610)::extensions.geography);

-- D is deliberately absent: near, but not interested in sports.
insert into public.person_interests (person_id, category) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'sports'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'sports'),
  ('cccccccc-0000-0000-0000-00000000000c', 'sports'),
  ('dddddddd-0000-0000-0000-00000000000d', 'social'),
  ('eeeeeeee-0000-0000-0000-00000000000e', 'sports'),
  ('ffffffff-0000-0000-0000-00000000000f', 'sports'),
  ('11111111-0000-0000-0000-000000000011', 'sports'),
  ('22222222-0000-0000-0000-000000000022', 'sports');

insert into public.account_restrictions (person_id, reason) values
  ('11111111-0000-0000-0000-000000000011', 'test hold');
insert into public.blocks (blocker_id, blocked_id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', '22222222-0000-0000-0000-000000000022');

insert into public.circles (id, owner_id, name) values
  ('c1c1c1c1-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'badminton');
insert into public.circle_members (circle_id, person_id) values
  ('c1c1c1c1-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b');

-- the geometry the radius rests on, asserted rather than assumed
select cmp_ok(
  (select extensions.ST_Distance(
     (select centroid from public.person_areas where person_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
     (select centroid from public.person_areas where person_id = 'cccccccc-0000-0000-0000-00000000000c')))::numeric,
  '<', 3000::numeric, 'the near persona really is inside a 3 km radius');
select cmp_ok(
  (select extensions.ST_Distance(
     (select centroid from public.person_areas where person_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
     (select centroid from public.person_areas where person_id = 'eeeeeeee-0000-0000-0000-00000000000e')))::numeric,
  '>', 3000::numeric, 'and the far persona really is outside it');

-- ===============================================================
-- L6  a nearby cast reaches an approved area inside the radius,
--     with the matching interest, and nobody else
-- ===============================================================
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$ select public.publish_cast('sports', 'badminton after work.', 2,
       now() + interval '6 hours', 'nearby', 12.9784, 77.6408, 'the court', 3000) $$,
  'a nearby cast publishes');

reset role;
-- publish_cast mints the id, so the tests carry it in a scratch table.
-- It is read from inside role-switched blocks below, hence the grant --
-- test scaffolding, not part of the schema's surface.
create temporary table near_cast as
  select id from public.casts where category = 'sports' limit 1;
grant select on near_cast to authenticated;

select results_eq(
  $$ select p.display_name from public.cast_deliveries d
       join public.people p on p.id = d.person_id
      where d.cast_id = (select id from near_cast)
      order by p.display_name $$,
  $$ values ('Bhavna'), ('Chetan') $$,
  'L6 nearby reaches exactly the near, interested, verified, unblocked people');

select is_empty(
  $$ select 1 from public.cast_deliveries
      where cast_id = (select id from near_cast)
        and person_id = 'aaaaaaaa-0000-0000-0000-00000000000a' $$,
  'L6 the caster is never delivered their own cast');
select is_empty(
  $$ select 1 from public.cast_deliveries
      where cast_id = (select id from near_cast)
        and person_id = 'dddddddd-0000-0000-0000-00000000000d' $$,
  'L6 near but not interested is not reached');
select is_empty(
  $$ select 1 from public.cast_deliveries
      where cast_id = (select id from near_cast)
        and person_id = 'eeeeeeee-0000-0000-0000-00000000000e' $$,
  'L6 interested but outside the radius is not reached');
select is_empty(
  $$ select 1 from public.cast_deliveries
      where cast_id = (select id from near_cast)
        and person_id = 'ffffffff-0000-0000-0000-00000000000f' $$,
  'L6 an unverified account is not reached');
select is_empty(
  $$ select 1 from public.cast_deliveries
      where cast_id = (select id from near_cast)
        and person_id = '11111111-0000-0000-0000-000000000011' $$,
  'L9 a restricted account is not reached');
select is_empty(
  $$ select 1 from public.cast_deliveries
      where cast_id = (select id from near_cast)
        and person_id = '22222222-0000-0000-0000-000000000022' $$,
  'L7 a blocked person is not reached');

-- ===============================================================
-- L6  a circles cast reaches the circle and nothing else --
--     proximity and interest do not leak a private cast
-- ===============================================================
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok(
  $$ select public.publish_cast('social', 'drinks at mine.', 4,
       now() + interval '7 hours', 'circles', 12.9784, 77.6408, 'mine', null,
       array['c1c1c1c1-0000-0000-0000-000000000001'::uuid]) $$,
  'a circles cast publishes');

reset role;
create temporary table circle_cast as
  select id from public.casts where category = 'social' limit 1;
grant select on circle_cast to authenticated;

select results_eq(
  $$ select p.display_name from public.cast_deliveries d
       join public.people p on p.id = d.person_id
      where d.cast_id = (select id from circle_cast)
      order by p.display_name $$,
  $$ values ('Bhavna') $$,
  'L6 a circles cast reaches the circle only');
select is_empty(
  $$ select 1 from public.cast_deliveries
      where cast_id = (select id from circle_cast)
        and person_id = 'cccccccc-0000-0000-0000-00000000000c' $$,
  'L6 being nearby and interested does not get you into a circles cast');

-- adding a member afterwards must not widen an already-published cast
insert into public.circle_members (circle_id, person_id)
values ('c1c1c1c1-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-00000000000c');
select is_empty(
  $$ select 1 from public.cast_deliveries
      where cast_id = (select id from circle_cast)
        and person_id = 'cccccccc-0000-0000-0000-00000000000c' $$,
  'L6 joining the circle after publish does not widen an existing cast');

-- ===============================================================
-- L8  every delivery carries a stored, human-readable reason
-- ===============================================================
select is_empty(
  $$ select 1 from public.cast_deliveries where btrim(coalesce(reason_text, '')) = '' $$,
  'L8 no delivery exists without a reason');
select results_eq(
  $$ select distinct reason_code::text from public.cast_deliveries order by 1 $$,
  $$ values ('circle'), ('nearby') $$,
  'L8 the reason code is the rule that actually applied');
select is(
  (select reason_text from public.cast_deliveries
    where cast_id = (select id from circle_cast)),
  'you are in a circle of theirs',
  'L8 the circle reason names the relationship');
select is_empty(
  $$ select 1 from public.cast_deliveries where reason_text ilike '%badminton%' $$,
  'L3 no reason names the circle it came from');

-- ===============================================================
-- L8  the generator is idempotent
-- ===============================================================
select is(
  private.generate_deliveries((select id from near_cast)), 0,
  'L8 re-running the generator writes nothing');
select is(
  (select count(*)::integer from public.cast_deliveries
    where cast_id = (select id from near_cast)), 2,
  'L8 and leaves the delivered set unchanged');

-- ===============================================================
-- the feed reads deliveries and nothing wider
-- ===============================================================
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}';
select results_eq(
  $$ select statement from public.my_feed() order by 1 $$,
  $$ values ('badminton after work.') $$,
  'the feed returns only what was delivered to me');
select is(
  (select reason_text from public.my_feed()),
  'near you, and you are into sports',
  'L8 and shows the stored reason, not a computed one');

select lives_ok(
  $$ select public.hide_cast((select id from near_cast), true) $$,
  'a recipient can hide a delivery');
select is_empty(
  $$ select 1 from public.my_feed() $$,
  'and it leaves their feed');
select throws_ok(
  $$ select public.hide_cast((select id from circle_cast)) $$,
  'P0002', null, 'hiding something never delivered to you is refused');

-- L7 immediacy, through the feed
set local "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select is(
  (select count(*)::integer from public.my_feed()), 2,
  'the circle member sees both casts');
select lives_ok(
  $$ select public.block_person('aaaaaaaa-0000-0000-0000-00000000000a') $$,
  'they block the caster');
select is_empty(
  $$ select 1 from public.my_feed() $$,
  'L7 and both casts leave the feed immediately');

-- ===============================================================
-- eligibility is the server''s judgement, not the client''s
-- ===============================================================
select ok(
  not has_function_privilege('authenticated', 'private.generate_deliveries(uuid)', 'execute'),
  'a client cannot run the generator');
select ok(
  not has_function_privilege('authenticated', 'private.eligible_for(uuid)', 'execute'),
  'a client cannot ask who is eligible');
select ok(
  not has_function_privilege('authenticated', 'private.cast_origin(uuid)', 'execute'),
  'L2 a client cannot ask where a cast was broadcast from');

select * from finish();
rollback;
