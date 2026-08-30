begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select has_column('public', 'intents', 'seed_demo', 'casts carry a demo flag');

-- a viewer far from everything, into music only, in nobody's circle
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','v@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000D1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000F1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','f@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','n@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000a1','Viewer'),
  ('00000000-0000-0000-0000-0000000000D1','Demo'),
  ('00000000-0000-0000-0000-0000000000F1','Far'),
  ('00000000-0000-0000-0000-0000000000e1','Near');
insert into public.profile_areas (profile_id, name, centroid) values
  ('00000000-0000-0000-0000-0000000000a1','whitefield', extensions.ST_SetSRID(extensions.ST_MakePoint(77.75,12.97),4326)::extensions.geography);
insert into public.profile_interests (profile_id, category) values ('00000000-0000-0000-0000-0000000000a1','music');

-- a DEMO cast (seed_demo): food, no matching interest, no geography
insert into public.intents (id, broadcaster_id, category, statement, status, seed_demo, expires_at, published_at) values
  ('11111111-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000D1','food','demo dosa','live', true, now()+interval '2 days', now());
insert into public.intent_context (intent_id, approximate_place, starts_at, coarse_window) values
  ('11111111-0000-0000-0000-0000000000d1','nearby', now()+interval '1 day','weekday-evening');

-- a REAL cast far away, wrong interest, tight radius -> must not reach V
insert into public.intents (id, broadcaster_id, category, statement, status, seed_demo, expires_at, published_at) values
  ('22222222-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000F1','sports','real badminton','live', false, now()+interval '2 days', now());
insert into public.intent_context (intent_id, approximate_place, approximate_geography, starts_at, coarse_window) values
  ('22222222-0000-0000-0000-0000000000f1','koramangala', extensions.ST_SetSRID(extensions.ST_MakePoint(77.62,12.93),4326)::extensions.geography, now()+interval '1 day','weekday-evening');
insert into public.intent_reach (intent_id, radius_km) values ('22222222-0000-0000-0000-0000000000f1', 2);

-- a REAL cast near V, matching interest, ample radius -> must reach V
insert into public.intents (id, broadcaster_id, category, statement, status, seed_demo, expires_at, published_at) values
  ('33333333-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000e1','music','real jam','live', false, now()+interval '2 days', now());
insert into public.intent_context (intent_id, approximate_place, approximate_geography, starts_at, coarse_window) values
  ('33333333-0000-0000-0000-0000000000e1','whitefield', extensions.ST_SetSRID(extensions.ST_MakePoint(77.75,12.97),4326)::extensions.geography, now()+interval '1 day','weekday-evening');
insert into public.intent_reach (intent_id, radius_km) values ('33333333-0000-0000-0000-0000000000e1', 5);

-- read the feed as V
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is(
  (select count(*)::int from public.my_feed() where intent_id='11111111-0000-0000-0000-0000000000d1'),
  1, 'a demo cast reaches a tester with no place/interest/circle match');
select is(
  (select reason_text from public.my_feed() where intent_id='11111111-0000-0000-0000-0000000000d1'),
  'demo cast · shown to every tester', 'and carries an honest demo reason');
select is(
  (select count(*)::int from public.my_feed() where intent_id='22222222-0000-0000-0000-0000000000f1'),
  0, 'a real out-of-radius, wrong-interest cast does NOT reach the tester');
select is(
  (select count(*)::int from public.my_feed() where intent_id='33333333-0000-0000-0000-0000000000e1'),
  1, 'a real in-radius, matching-interest cast DOES reach the tester');

reset role;
select finish();
rollback;
