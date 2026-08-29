begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select has_function('public', 'my_feed', 'the feed function exists');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','vd@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cd@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000b1','Viewer'),
  ('00000000-0000-0000-0000-0000000000b2','Caster');

-- the viewer sits at 77.6000, 12.9700. one degree of longitude at this
-- latitude is ~108.4 km, so 77.6100 is a shade over 1 km east.
insert into public.profile_areas (profile_id, name, centroid) values
  ('00000000-0000-0000-0000-0000000000b1','home', extensions.ST_SetSRID(extensions.ST_MakePoint(77.6000,12.9700),4326)::extensions.geography),
  -- a second, much further area: the MINIMUM is the one reported
  ('00000000-0000-0000-0000-0000000000b1','other', extensions.ST_SetSRID(extensions.ST_MakePoint(78.2000,12.9700),4326)::extensions.geography);
insert into public.profile_interests (profile_id, category) values ('00000000-0000-0000-0000-0000000000b1','sports');

insert into public.intents (id, broadcaster_id, category, statement, status, seed_demo, expires_at, published_at) values
  ('44444444-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000b2','sports','a cast with a point','live', false, now()+interval '2 days', now()),
  ('55555555-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000b2','sports','a cast with no point','live', true, now()+interval '2 days', now());
insert into public.intent_context (intent_id, approximate_place, approximate_geography, starts_at, coarse_window) values
  ('44444444-0000-0000-0000-0000000000c1','somewhere', extensions.ST_SetSRID(extensions.ST_MakePoint(77.6100,12.9700),4326)::extensions.geography, now()+interval '1 day','weekday-evening');
insert into public.intent_context (intent_id, approximate_place, starts_at, coarse_window) values
  ('55555555-0000-0000-0000-0000000000c2','nearby', now()+interval '1 day','weekday-evening');
insert into public.intent_reach (intent_id, radius_km) values ('44444444-0000-0000-0000-0000000000c1', 5);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';

-- ~1084 m, reported from the NEAREST approved area and rounded to 50 m
select is(
  (select distance_m from public.my_feed() where intent_id='44444444-0000-0000-0000-0000000000c1'),
  1100, 'distance comes from the nearest approved area, rounded to 50 m');

-- rounding is what keeps repeated reads from sharpening the point
select is(
  (select (distance_m % 50) from public.my_feed() where intent_id='44444444-0000-0000-0000-0000000000c1'),
  0, 'distance is always a multiple of 50 m');

-- no point on the cast: null, never a fabricated number
select is(
  (select distance_m from public.my_feed() where intent_id='55555555-0000-0000-0000-0000000000c2'),
  null, 'a cast with no approximate point reports no distance at all');

reset role;
select finish();
rollback;
