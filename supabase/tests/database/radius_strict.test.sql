begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

-- viewer placed in indiranagar, into sports
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rv@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rc@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000d1','Viewer'),
  ('00000000-0000-0000-0000-0000000000d2','Caster');
insert into public.profile_areas (profile_id, name, centroid) values
  ('00000000-0000-0000-0000-0000000000d1','indiranagar', extensions.ST_SetSRID(extensions.ST_MakePoint(77.6408,12.9719),4326)::extensions.geography);
insert into public.profile_interests (profile_id, category) values ('00000000-0000-0000-0000-0000000000d1','sports');

-- a FAR cast (~60km east) that shares the viewer's area NAME. with the old
-- name-bypass it would have reached; strict radius must refuse it.
insert into public.intents (id, broadcaster_id, category, statement, status, seed_demo, expires_at, published_at) values
  ('a0000000-0000-0000-0000-00000000ff01','00000000-0000-0000-0000-0000000000d2','sports','far badminton','live', false, now()+interval '2 days', now());
insert into public.intent_context (intent_id, approximate_place, approximate_geography, starts_at, coarse_window) values
  ('a0000000-0000-0000-0000-00000000ff01','indiranagar', extensions.ST_SetSRID(extensions.ST_MakePoint(78.30,12.9719),4326)::extensions.geography, now()+interval '1 day','weekday-evening');
insert into public.intent_reach (intent_id, radius_km) values ('a0000000-0000-0000-0000-00000000ff01', 5);

-- a NEAR cast (~0.5km) with a different name; distance should carry it in.
insert into public.intents (id, broadcaster_id, category, statement, status, seed_demo, expires_at, published_at) values
  ('a0000000-0000-0000-0000-00000000ee01','00000000-0000-0000-0000-0000000000d2','sports','near badminton','live', false, now()+interval '2 days', now());
insert into public.intent_context (intent_id, approximate_place, approximate_geography, starts_at, coarse_window) values
  ('a0000000-0000-0000-0000-00000000ee01','someplace', extensions.ST_SetSRID(extensions.ST_MakePoint(77.6450,12.9719),4326)::extensions.geography, now()+interval '1 day','weekday-evening');
insert into public.intent_reach (intent_id, radius_km) values ('a0000000-0000-0000-0000-00000000ee01', 5);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';

select is(
  (select count(*)::int from public.my_feed() where intent_id='a0000000-0000-0000-0000-00000000ff01'),
  0, 'a far cast that merely shares the area NAME no longer bypasses the radius');
select is(
  (select count(*)::int from public.my_feed() where intent_id='a0000000-0000-0000-0000-00000000ee01'),
  1, 'a near cast reaches on DISTANCE even with a different area name');
select is(
  (select distance_m from public.my_feed() where intent_id='a0000000-0000-0000-0000-00000000ee01') < 2000,
  true, 'and it is reported as close');

reset role;
select finish();
rollback;
