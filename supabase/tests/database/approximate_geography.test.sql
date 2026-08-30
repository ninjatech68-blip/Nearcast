begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

select has_function('public', 'discover_intents', 'discovery exists');
select has_function('public', 'distance_band', 'distance is reported as a band');
select has_column('public', 'profiles', 'approximate_home', 'profiles carry an approximate home');
select has_index('public', 'profiles', 'profiles_approximate_home_idx',
  'the approximate home is indexed for proximity search');

-- Bands, not numbers.
select is(public.distance_band(500), 'walking_distance', 'under a kilometre is walking distance');
select is(public.distance_band(2000), 'nearby', 'a couple of kilometres is nearby');
select is(public.distance_band(5000), 'short_trip', 'several kilometres is a short trip');
select is(public.distance_band(50000), 'further_out', 'a long way is further out');
select is(public.distance_band(null), 'unknown', 'an unplaced intent is unknown, not zero');

-- The discovery result cannot carry a coordinate, because the return type has
-- no column for one. Pinned so adding one fails here.
create temporary view discovery_shape as
select * from public.discover_intents(1000);

select set_eq(
  $$select column_name::text from information_schema.columns
    where table_name = 'discovery_shape'$$,
  $$values ('intent_id'),('primitive'),('statement'),('response_action'),
           ('expires_at'),('approximate_place'),('distance_band'),
           ('broadcaster_first_name')$$,
  'discovery returns bands and never a coordinate or a distance in metres'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'near@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000072', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000073', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'blocked@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000074', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'restricted@nearcast.local', '', now(), now());

-- Bengaluru-ish points. The viewer sits at the origin point.
insert into public.profiles (id, display_name, approximate_home, is_restricted) values
  ('00000000-0000-0000-0000-000000000071', 'Asha Rao',
   extensions.st_point(77.6400, 12.9780)::extensions.geography, false),
  ('00000000-0000-0000-0000-000000000072', 'Dev Mehta',
   extensions.st_point(77.6400, 12.9780)::extensions.geography, false),
  ('00000000-0000-0000-0000-000000000073', 'Mira Sen',
   extensions.st_point(77.6400, 12.9780)::extensions.geography, false),
  ('00000000-0000-0000-0000-000000000074', 'Ravi Nair',
   extensions.st_point(77.6400, 12.9780)::extensions.geography, true);

-- Four intents: near, far, expired, and from a restricted broadcaster.
insert into public.intents (
  id, broadcaster_id, primitive, statement, status, response_action,
  expires_at, published_at, share_slug, version, created_at
) values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000071',
   'request', 'Near and live', 'live', 'Offer help',
   now() + interval '1 day', now(), '80000000-0000-0000-0000-000000000001', 1, now()),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000071',
   'request', 'Far away', 'live', 'Offer help',
   now() + interval '1 day', now(), '80000000-0000-0000-0000-000000000002', 1, now()),
  ('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000071',
   'request', 'Already lapsed', 'live', 'Offer help',
   now() - interval '1 minute', now(), '80000000-0000-0000-0000-000000000003', 1, now() - interval '2 days'),
  ('70000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000074',
   'request', 'From a restricted account', 'live', 'Offer help',
   now() + interval '1 day', now(), '80000000-0000-0000-0000-000000000004', 1, now()),
  ('70000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000073',
   'request', 'From a blocked person', 'live', 'Offer help',
   now() + interval '1 day', now(), '80000000-0000-0000-0000-000000000005', 1, now()),
  ('70000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000071',
   'request', 'Origin only', 'live', 'Offer help',
   now() + interval '1 day', now(), '80000000-0000-0000-0000-000000000006', 1, now());

insert into public.intent_context (intent_id, approximate_place, approximate_geography) values
  ('70000000-0000-0000-0000-000000000001', 'Indiranagar', extensions.st_point(77.6420, 12.9790)::extensions.geography),
  ('70000000-0000-0000-0000-000000000002', 'Mysuru',      extensions.st_point(76.6394, 12.2958)::extensions.geography),
  ('70000000-0000-0000-0000-000000000003', 'Indiranagar', extensions.st_point(77.6420, 12.9790)::extensions.geography),
  ('70000000-0000-0000-0000-000000000004', 'Indiranagar', extensions.st_point(77.6420, 12.9790)::extensions.geography),
  ('70000000-0000-0000-0000-000000000005', 'Indiranagar', extensions.st_point(77.6420, 12.9790)::extensions.geography),
  ('70000000-0000-0000-0000-000000000006', 'Indiranagar', extensions.st_point(77.6420, 12.9790)::extensions.geography);

insert into public.intent_private (intent_id, exact_address, exact_geography) values
  ('70000000-0000-0000-0000-000000000001', '42 Private Lane',
   extensions.st_point(77.6421, 12.9791)::extensions.geography);

insert into public.intent_reach (intent_id, level) values
  ('70000000-0000-0000-0000-000000000001', 'nearby_relevant'),
  ('70000000-0000-0000-0000-000000000002', 'nearby_relevant'),
  ('70000000-0000-0000-0000-000000000003', 'nearby_relevant'),
  ('70000000-0000-0000-0000-000000000004', 'nearby_relevant'),
  ('70000000-0000-0000-0000-000000000005', 'nearby_relevant'),
  ('70000000-0000-0000-0000-000000000006', 'origin_only');

insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-000000000072', '00000000-0000-0000-0000-000000000073');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000072","role":"authenticated"}';

select is(
  (select count(*)::int from public.discover_intents(10000)),
  1,
  'only the near, live, unblocked, unrestricted, reachable intent survives'
);

select is(
  (select statement from public.discover_intents(10000)),
  'Near and live',
  'the surviving row is the one expected'
);

select is(
  (select distance_band from public.discover_intents(10000)),
  'walking_distance',
  'a nearby intent is reported as walking distance, not as metres'
);

select is_empty(
  $$select 1 from public.discover_intents(10000) where statement = 'Far away'$$,
  'an out-of-range intent returns no row'
);

select is_empty(
  $$select 1 from public.discover_intents(10000) where statement = 'Already lapsed'$$,
  'an expired intent returns no row'
);

select is_empty(
  $$select 1 from public.discover_intents(10000) where statement = 'From a restricted account'$$,
  'a restricted broadcaster returns no row'
);

select is_empty(
  $$select 1 from public.discover_intents(10000) where statement = 'From a blocked person'$$,
  'a blocked pair returns no row in either direction'
);

select * from finish();
rollback;
