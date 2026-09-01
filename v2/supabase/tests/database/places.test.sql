-- ===============================================================
-- L14: a cast's exact place is visible only to its caster and to
-- accepted participants. And L2, as amended.
-- ===============================================================
--
-- The shape being asserted:
--
--   a cast carries a venue. The feed says "approx 3 km away" and
--   nothing more. Acceptance reveals the point and the place name.
--
-- The attack this is written against is trilateration, not reading.
-- A distance from a known point puts the venue on a circle; three
-- distances fix it. person_areas are self-declared and unlimited, so
-- three measurements cost nothing. The defence is that the distance
-- is computed from a COARSENED point -- trilaterate all you like and
-- you recover a ~1 km cell, never the café.
--
-- The place NAME is gated identically to the point. "Third Wave
-- Coffee, 100ft Road" is the venue; a text column is not a lesser
-- disclosure than two floats.
-- ===============================================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a'),
  ('bbbbbbbb-0000-0000-0000-00000000000b'),
  ('cccccccc-0000-0000-0000-00000000000c'),
  ('dddddddd-0000-0000-0000-00000000000d');
insert into public.people (id, display_name) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'Aarav'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'Bhavna'),
  ('cccccccc-0000-0000-0000-00000000000c', 'Chetan'),
  ('dddddddd-0000-0000-0000-00000000000d', 'Divya');
insert into public.person_verification (person_id, phone_e164, verified_at) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', '+910000000001', now()),
  ('bbbbbbbb-0000-0000-0000-00000000000b', '+910000000002', now()),
  ('cccccccc-0000-0000-0000-00000000000c', '+910000000003', now()),
  ('dddddddd-0000-0000-0000-00000000000d', '+910000000004', now());
-- B, C and D all live near the venue and all like sports, so all three
-- receive the cast. What separates them is only what they did next.
insert into public.person_areas (person_id, name, centroid) values
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'Domlur', extensions.ST_Point(77.6390, 12.9610)::extensions.geography),
  ('cccccccc-0000-0000-0000-00000000000c', 'Domlur', extensions.ST_Point(77.6390, 12.9610)::extensions.geography),
  ('dddddddd-0000-0000-0000-00000000000d', 'Domlur', extensions.ST_Point(77.6390, 12.9610)::extensions.geography);
insert into public.person_interests (person_id, category) values
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'sports'),
  ('cccccccc-0000-0000-0000-00000000000c', 'sports'),
  ('dddddddd-0000-0000-0000-00000000000d', 'sports');

-- ===============================================================
-- publishing carries a venue
-- ===============================================================
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';

select throws_ok(
  $$ select public.publish_cast('sports', 'badminton after work.', 3,
       now() + interval '6 hours', 'nearby',
       12.97840, 77.64080, 'Indiranagar Badminton Court', 500) $$,
  '23514', null, 'a radius under 2 km is refused -- it would be noise against a 1 km cell');

select lives_ok(
  $$ select public.publish_cast('sports', 'badminton after work.', 3,
       now() + interval '6 hours', 'nearby',
       12.97840, 77.64080, 'Indiranagar Badminton Court', 3000) $$,
  'a cast publishes with a venue and a radius from it');

reset role;
create temporary table k as select id from public.casts limit 1;
grant select on k to authenticated;

-- ===============================================================
-- L2 amended: the stored match point is coarse, the venue is not
-- ===============================================================
select is(
  (select extensions.ST_Y(match_point::extensions.geometry) from public.casts),
  12.98::double precision,
  'L2 the matching point is rounded to ~1 km, latitude');
select is(
  (select extensions.ST_X(match_point::extensions.geometry) from public.casts),
  77.64::double precision,
  'L2 and longitude');
select cmp_ok(
  (select extensions.ST_Distance(c.match_point, p.point)
     from public.casts c join public.cast_places p on p.cast_id = c.id)::numeric,
  '<', 1600::numeric,
  'L2 the coarse point stays within a cell of the real one');
select isnt(
  (select extensions.ST_AsText(match_point::extensions.geometry) from public.casts),
  (select extensions.ST_AsText(point::extensions.geometry) from public.cast_places),
  'L2 and is never simply the real one');

-- ===============================================================
-- L14  who may read the venue
-- ===============================================================
-- the caster
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
select isnt_empty(
  $$ select 1 from public.cast_places $$,
  'L14 the caster sees their own venue');

-- delivered, but has not asked
set local "request.jwt.claims" = '{"sub":"dddddddd-0000-0000-0000-00000000000d","role":"authenticated"}';
select isnt_empty(
  $$ select 1 from public.my_feed() $$,
  'a delivered person sees the cast');
select is_empty(
  $$ select 1 from public.cast_places $$,
  'L14 but not its venue');

-- asked, not yet accepted
set local "request.jwt.claims" = '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}';
select lives_ok(
  $$ select public.request_to_join((select id from k), 'me too') $$,
  'a recipient asks to join');
select is_empty(
  $$ select 1 from public.cast_places $$,
  'L14 asking is not being accepted -- still no venue');

-- accepted
set local "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select lives_ok(
  $$ select public.request_to_join((select id from k), 'in') $$,
  'another asks');
reset role;
create temporary table rq as
  select id from public.join_requests where person_id = 'bbbbbbbb-0000-0000-0000-00000000000b';
grant select on rq to authenticated;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok(
  $$ select public.accept_join_request((select id from rq)) $$,
  'the caster accepts one of them');

set local "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select is(
  (select place_name from public.cast_places),
  'Indiranagar Badminton Court',
  'L14 the accepted person sees the venue name');
select is(
  (select extensions.ST_Y(point::extensions.geometry) from public.cast_places),
  12.97840::double precision,
  'L14 and the exact point, at full precision');

-- the one who asked and was not accepted still sees nothing
set local "request.jwt.claims" = '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}';
select is_empty(
  $$ select 1 from public.cast_places $$,
  'L14 the still-pending person gained nothing from someone else being accepted');

-- ===============================================================
-- L14  the feed leaks neither the point nor the name
-- ===============================================================
set local "request.jwt.claims" = '{"sub":"dddddddd-0000-0000-0000-00000000000d","role":"authenticated"}';
select is_empty(
  $$ select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'my_feed'
        and (data_type ilike '%geog%' or data_type ilike '%geom%'
             or column_name ilike '%place%' or column_name ilike '%lat%'
             or column_name ilike '%lon%') $$,
  'L14 my_feed returns no coordinate and no place name');
select isnt(
  (select distance_m from public.my_feed()), null,
  'the feed does say how far away it is');
select is(
  (select distance_m % 500 from public.my_feed()), 0,
  'rounded to 500 m, so it adds no precision beyond the cell');

-- ===============================================================
-- L2  the rest of it still holds
-- ===============================================================
select is_empty(
  $$ select 1 from public.person_areas where person_id <> auth.uid() $$,
  'L2 nobody reads another person''s approved areas');
select is_empty(
  $$ select 1 from public.person_interests where person_id <> auth.uid() $$,
  'L2 nor their interests');

-- and no table anywhere holds a coordinate outside the three places
-- the amended law permits
reset role;
select results_eq(
  $$ select c.table_name || '.' || c.column_name
       from information_schema.columns c
       join pg_class t on t.relname = c.table_name
      where c.table_schema = 'public'
        and c.udt_name in ('geography','geometry')
      order by 1 $$,
  $$ values ('cast_places.point'), ('casts.match_point'), ('person_areas.centroid') $$,
  'L2 the only coordinates in the schema are the three the law permits');

-- ===============================================================
-- the write surface stays closed
-- ===============================================================
select is_empty(
  $$ select table_name || '.' || privilege_type
       from information_schema.table_privileges
      where grantee in ('authenticated','anon')
        and table_schema = 'public'
        and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES') $$,
  'L1 cast_places added no write privilege');
select ok(
  not has_function_privilege('authenticated', 'private.coarse_point(double precision, double precision)', 'execute'),
  'a client cannot ask the server to coarsen a point for it');

select * from finish();
rollback;
