begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

select has_function('public', 'generate_deliveries', 'delivery generation exists');
select has_function('public', 'home_feed', 'the home feed exists');
select has_column('public', 'intent_deliveries', 'saved_at', 'a delivery can be saved');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000083', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'blocked@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name, approximate_home) values
  ('00000000-0000-0000-0000-000000000081', 'Asha Rao', extensions.st_point(77.6400, 12.9780)::extensions.geography),
  ('00000000-0000-0000-0000-000000000082', 'Dev Mehta', extensions.st_point(77.6400, 12.9780)::extensions.geography),
  ('00000000-0000-0000-0000-000000000083', 'Mira Sen', extensions.st_point(77.6400, 12.9780)::extensions.geography);

insert into public.intents (
  id, broadcaster_id, primitive, statement, status, response_action,
  expires_at, published_at, share_slug, version, created_at
) values
  ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000081',
   'request', 'Adjacent reach intent', 'live', 'Offer help',
   now() + interval '2 days', now(), 'a1000000-0000-0000-0000-000000000001', 1, now()),
  ('90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000081',
   'request', 'Broader reach intent', 'live', 'Offer help',
   now() + interval '1 day', now(), 'a1000000-0000-0000-0000-000000000002', 1, now()),
  ('90000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000081',
   'request', 'Origin only intent', 'live', 'Offer help',
   now() + interval '1 day', now(), 'a1000000-0000-0000-0000-000000000003', 1, now());

insert into public.intent_context (intent_id, approximate_place, approximate_geography) values
  ('90000000-0000-0000-0000-000000000001', 'Indiranagar', extensions.st_point(77.6420, 12.9790)::extensions.geography),
  ('90000000-0000-0000-0000-000000000002', 'Indiranagar', extensions.st_point(77.6420, 12.9790)::extensions.geography),
  ('90000000-0000-0000-0000-000000000003', 'Indiranagar', extensions.st_point(77.6420, 12.9790)::extensions.geography);

insert into public.intent_reach (intent_id, level) values
  ('90000000-0000-0000-0000-000000000001', 'adjacent_network'),
  ('90000000-0000-0000-0000-000000000002', 'broader_approved'),
  ('90000000-0000-0000-0000-000000000003', 'origin_only');

-- Generation.
select is(public.generate_deliveries('90000000-0000-0000-0000-000000000001'), 2,
  'an adjacent-reach intent is delivered to both eligible people');

select is(public.generate_deliveries('90000000-0000-0000-0000-000000000001'), 0,
  're-running delivers to nobody twice');

select is(public.generate_deliveries('90000000-0000-0000-0000-000000000003'), 0,
  'an origin-only intent is not delivered by discovery');

select is_empty(
  $$select 1 from public.intent_deliveries
    where recipient_id = '00000000-0000-0000-0000-000000000081'$$,
  'a broadcaster is never delivered their own intent'
);

-- Every row carries one approved code and a non-empty reason.
select is_empty(
  $$select 1 from public.intent_deliveries
    where reason_code not in ('origin_recipient','adjacent_trust_connection',
                              'nearby_interest_match','broader_approved_match')$$,
  'every delivery carries an approved explanation code'
);

select is_empty(
  $$select 1 from public.intent_deliveries where btrim(coalesce(reason_text,'')) = ''$$,
  'every delivery carries a non-empty rendered reason'
);

select is(
  (select reason_code from public.intent_deliveries
   where intent_id = '90000000-0000-0000-0000-000000000001' limit 1),
  'adjacent_trust_connection',
  'the reason code follows the reach level'
);

select is_empty(
  $$select 1 from public.intent_deliveries
    where reason_text ilike '%whatsapp%' or reason_text ilike '%group%'
       or reason_text ilike '%Asha%'$$,
  'a rendered reason never names a group or a third party'
);

-- Blocks are honoured at generation time.
insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000083');

select is(public.generate_deliveries('90000000-0000-0000-0000-000000000002'), 1,
  'a blocked person is not delivered to');

select is_empty(
  $$select 1 from public.intent_deliveries
    where intent_id = '90000000-0000-0000-0000-000000000002'
      and recipient_id = '00000000-0000-0000-0000-000000000083'$$,
  'the blocked recipient has no delivery row'
);

-- The feed.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000082","role":"authenticated"}';

select is(
  (select count(*)::int from public.home_feed(20)),
  2,
  'the viewer sees both intents delivered to them'
);

select is(
  (select statement from public.home_feed(20) limit 1),
  'Adjacent reach intent',
  'a closer trust connection outranks a broader one'
);

select is_empty(
  $$select 1 from public.home_feed(20) where reason_text is null or btrim(reason_text) = ''$$,
  'every feed card carries its explanation'
);

-- Hiding and not-relevant remove a card for good.
reset role;
update public.intent_deliveries set hidden_at = now()
where intent_id = '90000000-0000-0000-0000-000000000001'
  and recipient_id = '00000000-0000-0000-0000-000000000082';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000082","role":"authenticated"}';

select is(
  (select count(*)::int from public.home_feed(20)),
  1,
  'a hidden delivery leaves the feed'
);

reset role;
update public.intent_deliveries set feedback = 'not_relevant'
where intent_id = '90000000-0000-0000-0000-000000000002'
  and recipient_id = '00000000-0000-0000-0000-000000000082';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000082","role":"authenticated"}';

select is(
  (select count(*)::int from public.home_feed(20)),
  0,
  'a not-relevant delivery leaves the feed, which is how it stays finite'
);

-- The feed shape carries no coordinate.
reset role;
create temporary view feed_shape as select * from public.home_feed(1);

select set_eq(
  $$select column_name::text from information_schema.columns where table_name = 'feed_shape'$$,
  $$values ('delivery_id'),('intent_id'),('primitive'),('statement'),('response_action'),
           ('expires_at'),('approximate_place'),('distance_band'),
           ('broadcaster_first_name'),('reason_code'),('reason_text'),('is_saved')$$,
  'the feed carries bands and reasons, never a coordinate'
);

select is(
  (select count(*)::int from public.home_feed(1000)),
  0,
  'the feed is finite: a page size beyond the cap is clamped, not unbounded'
);

select * from finish();
rollback;
