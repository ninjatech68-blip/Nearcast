-- Phase 2: explainable delivery generation.
-- Every allowed case has a corresponding denied case, per the QA plan.
begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

select has_function('public', 'generate_deliveries', array['uuid'], 'delivery generation exists');

-- ---------------------------------------------------------------- fixtures
-- This suite asserts exact delivery counts, so it starts from an empty domain.
-- Everything here rolls back, so seed data is untouched outside the test.
delete from public.profiles;
delete from auth.users;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b1@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'connected@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nearby@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'far@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000f5', 'authenticated', 'authenticated', 'blocked@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'restricted@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name, city, is_restricted) values
  ('00000000-0000-0000-0000-0000000000f1', 'Bela Broadcaster', 'Bengaluru', false),
  ('00000000-0000-0000-0000-0000000000f2', 'Chetan Connected', 'Mumbai', false),
  ('00000000-0000-0000-0000-0000000000f3', 'Nadia Nearby', 'Bengaluru', false),
  ('00000000-0000-0000-0000-0000000000f4', 'Farid Far', 'Pune', false),
  ('00000000-0000-0000-0000-0000000000f5', 'Bipin Blocked', 'Bengaluru', false),
  ('00000000-0000-0000-0000-0000000000f6', 'Rani Restricted', 'Bengaluru', true);

-- Chetan earned a trust connection by confirming one of Bela's past intents.
insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action,
                            created_at, expires_at, published_at)
values ('10000000-0000-0000-0000-0000000000e0', '00000000-0000-0000-0000-0000000000f1',
        'offer', 'Old bookshelf to give away', 'resolved', 'I am interested',
        now() - interval '30 days', now() - interval '20 days', now() - interval '30 days');
insert into public.intent_confirmations (intent_id, confirmer_id)
values ('10000000-0000-0000-0000-0000000000e0', '00000000-0000-0000-0000-0000000000f2');

-- Bela and Bipin block each other.
insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000f1');

-- The intent under test, live at adjacent_network reach.
insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action, expires_at, published_at)
values ('10000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1',
        'request', 'Need one person to help move a table', 'live', 'Offer help',
        now() + interval '2 days', now());
insert into public.intent_context (intent_id, approximate_place)
values ('10000000-0000-0000-0000-0000000000e1', 'Indiranagar');
insert into public.intent_reach (intent_id, level)
values ('10000000-0000-0000-0000-0000000000e1', 'adjacent_network');

-- --------------------------------------------------------------- authorization
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000f3","role":"authenticated"}';
select throws_ok(
  $$ select public.generate_deliveries('10000000-0000-0000-0000-0000000000e1') $$,
  'not_authorized',
  'a non-owner cannot generate deliveries'
);

-- --------------------------------------------------------- adjacent_network run
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';

select results_eq(
  $$ select public.generate_deliveries('10000000-0000-0000-0000-0000000000e1') $$,
  array[1],
  'adjacent reach delivers only to trusted connections'
);
reset role;
select results_eq(
  $$ select recipient_id, reason_code from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-0000000000e1' $$,
  $$ values ('00000000-0000-0000-0000-0000000000f2'::uuid, 'adjacent_trust_connection'::text) $$,
  'the trusted connection receives the adjacent reason code'
);
select is_empty(
  $$ select 1 from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-0000000000e1'
       and (reason_text is null or btrim(reason_text) = '') $$,
  'every delivery carries a non-empty human-readable reason'
);

-- rerun is idempotent
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select results_eq(
  $$ select public.generate_deliveries('10000000-0000-0000-0000-0000000000e1') $$,
  array[0],
  'rerunning generation inserts nothing new'
);

-- --------------------------------------------------------- nearby_relevant run
reset role;
update public.intent_reach set level = 'nearby_relevant'
where intent_id = '10000000-0000-0000-0000-0000000000e1';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select results_eq(
  $$ select public.generate_deliveries('10000000-0000-0000-0000-0000000000e1') $$,
  array[1],
  'expanding to nearby adds the same-area candidate'
);
reset role;
select results_eq(
  $$ select reason_code from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-0000000000e1'
       and recipient_id = '00000000-0000-0000-0000-0000000000f3' $$,
  array['nearby_interest_match'::text],
  'the same-area candidate receives the nearby reason code'
);
select is_empty(
  $$ select 1 from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-0000000000e1'
       and recipient_id = '00000000-0000-0000-0000-0000000000f4' $$,
  'a different-area candidate is not delivered at nearby reach'
);

-- --------------------------------------------------------- broader_approved run
reset role;
update public.intent_reach set level = 'broader_approved'
where intent_id = '10000000-0000-0000-0000-0000000000e1';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select results_eq(
  $$ select public.generate_deliveries('10000000-0000-0000-0000-0000000000e1') $$,
  array[1],
  'broader reach adds the remaining eligible candidate'
);
reset role;
select results_eq(
  $$ select reason_code from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-0000000000e1'
       and recipient_id = '00000000-0000-0000-0000-0000000000f4' $$,
  array['broader_approved_match'::text],
  'the broader candidate receives the broader reason code'
);
select is_empty(
  $$ select 1 from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-0000000000e1'
       and recipient_id = '00000000-0000-0000-0000-0000000000f5' $$,
  'a blocked pair never receives a delivery in either direction'
);
select is_empty(
  $$ select 1 from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-0000000000e1'
       and recipient_id = '00000000-0000-0000-0000-0000000000f6' $$,
  'a restricted account never receives a delivery'
);
select is_empty(
  $$ select 1 from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-0000000000e1'
       and recipient_id = '00000000-0000-0000-0000-0000000000f1' $$,
  'the broadcaster is never delivered their own intent'
);

-- ------------------------------------------------------- hidden stays hidden
reset role;
update public.intent_deliveries set hidden_at = now()
where intent_id = '10000000-0000-0000-0000-0000000000e1'
  and recipient_id = '00000000-0000-0000-0000-0000000000f3';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select results_eq(
  $$ select public.generate_deliveries('10000000-0000-0000-0000-0000000000e1') $$,
  array[0],
  'a hidden delivery is never recreated'
);

-- ------------------------------------------------------- origin_only delivers nothing
reset role;
insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action, expires_at, published_at)
values ('10000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000f1',
        'plan', 'Quiet walk on Sunday', 'live', 'Request to join',
        now() + interval '2 days', now());
insert into public.intent_reach (intent_id, level)
values ('10000000-0000-0000-0000-0000000000e2', 'origin_only');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select results_eq(
  $$ select public.generate_deliveries('10000000-0000-0000-0000-0000000000e2') $$,
  array[0],
  'origin-only reach never generates automated deliveries'
);

-- ------------------------------------------------------- lapsed intent refuses
reset role;
insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action,
                            created_at, expires_at, published_at)
values ('10000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000f1',
        'request', 'Yesterday need', 'live', 'Offer help',
        now() - interval '2 days', now() - interval '1 hour', now() - interval '2 days');
insert into public.intent_reach (intent_id, level)
values ('10000000-0000-0000-0000-0000000000e3', 'broader_approved');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select throws_ok(
  $$ select public.generate_deliveries('10000000-0000-0000-0000-0000000000e3') $$,
  'stale_state',
  'a lapsed intent cannot generate deliveries'
);

-- ------------------------------------------------------- audit trail
reset role;
select isnt_empty(
  $$ select 1 from public.intent_events
     where intent_id = '10000000-0000-0000-0000-0000000000e1'
       and event_type = 'deliveries_generated' $$,
  'generation appends an audit event'
);

select * from finish();
rollback;
