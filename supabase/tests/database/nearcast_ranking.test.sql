-- Geographic bands and delivery ranking (MUST-030 to MUST-036, Doc 05).
--
-- A band is the finest geographic fact anything may expose. Deliveries carry
-- an explanation, never a coordinate, and the ranking that decides who gets a
-- delivery has to be visible in the order rows are inserted.
begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

-- ---------------------------------------------------------------- structure
select has_function(
  'private', 'distance_band', array['extensions.geography', 'extensions.geography'],
  'the distance band helper exists'
);
select has_column(
  'public', 'profile_private', 'approximate_geography',
  'a coarse home area is stored out of reach of other members'
);
select hasnt_column(
  'public', 'profiles', 'approximate_geography',
  'and never on the discoverable profile'
);

-- --------------------------------------------------------------- the bands
-- Cubbon Park as the origin; points chosen to sit inside each band.
select is(
  private.distance_band(
    extensions.st_point(77.5946, 12.9716)::extensions.geography,
    extensions.st_point(77.6000, 12.9750)::extensions.geography),
  'walking',
  'a point about half a kilometre away is walking distance'
);
select is(
  private.distance_band(
    extensions.st_point(77.5946, 12.9716)::extensions.geography,
    extensions.st_point(77.6400, 12.9750)::extensions.geography),
  'nearby',
  'about five kilometres is nearby'
);
select is(
  private.distance_band(
    extensions.st_point(77.5946, 12.9716)::extensions.geography,
    extensions.st_point(77.7500, 12.9750)::extensions.geography),
  'across_town',
  'about seventeen kilometres is across town'
);
select is(
  private.distance_band(
    extensions.st_point(77.5946, 12.9716)::extensions.geography,
    extensions.st_point(72.8777, 19.0760)::extensions.geography),
  'far',
  'Mumbai is far'
);
select is(
  private.distance_band(NULL, extensions.st_point(77.5946, 12.9716)::extensions.geography),
  NULL,
  'an unknown location has no band, rather than a guessed one'
);

-- ---------------------------------------------------------------- fixtures
delete from public.profiles;
delete from auth.users;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
select ('00000000-0000-0000-0000-00000000e' || lpad(n::text, 3, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'rank' || n || '@nearcast.local', '', now(), now()
from generate_series(1, 6) as n;

insert into public.profiles (id, display_name, city)
select ('00000000-0000-0000-0000-00000000e' || lpad(n::text, 3, '0'))::uuid,
       'Ranker ' || n, 'Bengaluru'
from generate_series(1, 6) as n;

-- 1 broadcasts. 2 is a trusted connection far away. 3 is a stranger next door.
-- 4 is a stranger in Mumbai. 5 has been delivered a lot today already.
-- 6 has no stored area at all.
insert into public.profile_private (profile_id, approximate_geography) values
  ('00000000-0000-0000-0000-00000000e001', extensions.st_point(77.5946, 12.9716)::extensions.geography),
  ('00000000-0000-0000-0000-00000000e002', extensions.st_point(72.8777, 19.0760)::extensions.geography),
  ('00000000-0000-0000-0000-00000000e003', extensions.st_point(77.6000, 12.9750)::extensions.geography),
  ('00000000-0000-0000-0000-00000000e004', extensions.st_point(72.8777, 19.0760)::extensions.geography),
  ('00000000-0000-0000-0000-00000000e005', extensions.st_point(77.6000, 12.9750)::extensions.geography);

-- The trust connection: 2 confirmed an earlier intent of 1's.
insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action, expires_at, published_at)
values ('10000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000e001',
        'request', 'An earlier intent', 'resolved', 'Offer help', now() + interval '1 day', now());
insert into public.intent_confirmations (intent_id, confirmer_id)
values ('10000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000e002');

-- 5 is already saturated for today.
insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action, expires_at, published_at)
select ('10000000-0000-0000-0000-00000000f' || lpad(n::text, 3, '0'))::uuid,
       '00000000-0000-0000-0000-00000000e003', 'offer', 'Filler ' || n, 'live', 'I am interested',
       now() + interval '2 days', now()
from generate_series(1, 10) as n;
insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text)
select ('10000000-0000-0000-0000-00000000f' || lpad(n::text, 3, '0'))::uuid,
       '00000000-0000-0000-0000-00000000e005',
       'broader_approved_match', 'Within the approved broader reach for this intent'
from generate_series(1, 10) as n;

-- The intent under test, at the widest reach so every candidate is eligible.
insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action, expires_at, published_at)
values ('10000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000e001',
        'request', 'Need a hand on Saturday morning', 'live', 'Offer help', now() + interval '2 days', now());
insert into public.intent_reach (intent_id, level)
values ('10000000-0000-0000-0000-00000000e002', 'broader_approved');

select lives_ok(
  $$ select public.generate_deliveries('10000000-0000-0000-0000-00000000e002') $$,
  'generation runs for a live intent at broader reach'
);

-- --------------------------------------------------------------- eligibility
select isnt_empty(
  $$ select 1 from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-00000000e002'
       and recipient_id = '00000000-0000-0000-0000-00000000e003'
       and reason_code = 'nearby_interest_match' $$,
  'a stranger inside a near band is delivered as a nearby match'
);
select isnt_empty(
  $$ select 1 from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-00000000e002'
       and recipient_id = '00000000-0000-0000-0000-00000000e002'
       and reason_code = 'adjacent_trust_connection' $$,
  'a trusted connection is delivered as one even from far away'
);
select isnt_empty(
  $$ select 1 from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-00000000e002'
       and recipient_id = '00000000-0000-0000-0000-00000000e004'
       and reason_code = 'broader_approved_match' $$,
  'a distant stranger is delivered only under the broader reason'
);
select isnt_empty(
  $$ select 1 from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-00000000e002'
       and recipient_id = '00000000-0000-0000-0000-00000000e006' $$,
  'someone with no stored area still receives it, on the broader reason'
);
select is_empty(
  $$ select 1 from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-00000000e002'
       and recipient_id = '00000000-0000-0000-0000-00000000e005' $$,
  'someone already saturated today is skipped: fatigue is a limit, not a preference'
);

-- ------------------------------------------------------------------ ranking
select results_eq(
  $$ select recipient_id from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-00000000e002'
     order by rank_position asc limit 2 $$,
  $$ values ('00000000-0000-0000-0000-00000000e002'::uuid), ('00000000-0000-0000-0000-00000000e003'::uuid) $$,
  'trust ranks above proximity, and proximity above the broader tier'
);
select is_empty(
  $$ select 1 from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-00000000e002' and rank_position is null $$,
  'every delivery records where it ranked, so an ordering can be explained later'
);

-- ------------------------------------------------------------ privacy
select is_empty(
  $$ select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'intent_deliveries'
       and data_type in ('USER-DEFINED', 'geography', 'geometry')
       and column_name like '%geog%' $$,
  'a delivery row carries no geography at all'
);
select is_empty(
  $$ select 1 from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-00000000e002'
       and (reason_text like '%12.97%' or reason_text like '%77.59%') $$,
  'and no explanation leaks a coordinate'
);

select * from finish();
rollback;
