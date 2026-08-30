begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

select has_function('public', 'publish_intent', 'the publish mutation exists');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stranger@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name)
values ('00000000-0000-0000-0000-000000000021', 'Asha Rao');

set local role authenticated;

-- A signed-in identity with no redeemed invitation cannot broadcast.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000022","role":"authenticated"}';

select throws_ok(
  $$select public.publish_intent('request', 'Need a ladder', 'Offer help', now() + interval '1 day')$$,
  '42501',
  null,
  'a signed-in non-member cannot publish'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000021","role":"authenticated"}';

-- Input validation.
select throws_ok(
  $$select public.publish_intent('request', '   ', 'Offer help', now() + interval '1 day')$$,
  '22023', null, 'a blank statement is refused'
);

select throws_ok(
  $$select public.publish_intent('request', repeat('x', 501), 'Offer help', now() + interval '1 day')$$,
  '22023', null, 'a statement over 500 characters is refused'
);

select throws_ok(
  $$select public.publish_intent('request', 'Need a ladder', 'Offer help', now() - interval '1 minute')$$,
  '22023', null, 'an expiry already in the past is refused'
);

select throws_ok(
  $$select public.publish_intent('request', 'Need a ladder', 'Offer help', now() + interval '1 day',
      'origin_only', true, true, null, null, null, 1500, null)$$,
  '22023', null, 'a price without a currency is refused'
);

-- A valid publish.
select is(
  (select intent_status from public.publish_intent(
    'request', '  Need two helpers for Saturday  ', 'Offer help',
    now() + interval '1 day', 'adjacent_network', true, true,
    null, null, 2, null, null, 'Indiranagar', null, null, '["Can lift boxes"]'::jsonb,
    '42 Private Lane', '+910000000000', 'Gate code 1234',
    '70000000-0000-0000-0000-000000000001')),
  'live',
  'a valid draft publishes straight to live'
);

reset role;

select is(
  (select statement from public.intents where broadcaster_id = '00000000-0000-0000-0000-000000000021'),
  'Need two helpers for Saturday',
  'the statement is trimmed before storage'
);

select isnt_empty(
  $$select 1 from public.intents
    where broadcaster_id = '00000000-0000-0000-0000-000000000021'
      and published_at is not null and share_slug is not null$$,
  'publishing stamps a publish time and a share slug'
);

select isnt_empty(
  $$select 1 from public.intent_context c
    join public.intents i on i.id = c.intent_id
    where i.broadcaster_id = '00000000-0000-0000-0000-000000000021'
      and c.approximate_place = 'Indiranagar' and c.quantity = 2$$,
  'public context is written'
);

select isnt_empty(
  $$select 1 from public.intent_reach r
    join public.intents i on i.id = r.intent_id
    where i.broadcaster_id = '00000000-0000-0000-0000-000000000021'
      and r.level = 'adjacent_network'$$,
  'reach is written'
);

select isnt_empty(
  $$select 1 from public.intent_events e
    join public.intents i on i.id = e.intent_id
    where i.broadcaster_id = '00000000-0000-0000-0000-000000000021'
      and e.event_type = 'intent_published' and e.to_status = 'live'$$,
  'a publish event is appended'
);

-- Private-field leakage: private values must reach intent_private and nowhere else.
select isnt_empty(
  $$select 1 from public.intent_private p
    join public.intents i on i.id = p.intent_id
    where i.broadcaster_id = '00000000-0000-0000-0000-000000000021'
      and p.exact_address = '42 Private Lane'$$,
  'private details are written to the private table'
);

select is_empty(
  $$select 1 from public.intent_context c
    join public.intents i on i.id = c.intent_id
    where i.broadcaster_id = '00000000-0000-0000-0000-000000000021'
      and (c.approximate_place ilike '%Private Lane%'
        or c.requirements::text ilike '%910000000000%')$$,
  'no private value leaks into the public context row'
);

select is_empty(
  $$select 1 from public.analytics_outbox
    where event_name = 'intent_published'
      and (properties::text ilike '%helpers for Saturday%'
        or properties::text ilike '%Private Lane%'
        or properties::text ilike '%910000000000%')$$,
  'analytics carries shape, never statement or private content'
);

-- Idempotency.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000021","role":"authenticated"}';

select is(
  (select count(*)::int from public.publish_intent(
    'request', 'Need two helpers for Saturday', 'Offer help',
    (select expires_at from public.intents where broadcaster_id = '00000000-0000-0000-0000-000000000021'),
    'adjacent_network', true, true, null, null, 2, null, null, 'Indiranagar',
    null, null, '["Can lift boxes"]'::jsonb, '42 Private Lane', '+910000000000',
    'Gate code 1234', '70000000-0000-0000-0000-000000000001')),
  1,
  'a replayed publish returns one intent rather than creating a second'
);

select throws_ok(
  $$select public.publish_intent('request', 'A different statement', 'Offer help',
      now() + interval '1 day', 'adjacent_network', true, true, null, null, null,
      null, null, null, null, null, '[]'::jsonb, null, null, null,
      '70000000-0000-0000-0000-000000000001')$$,
  '23505',
  null,
  'the same key with different content conflicts'
);

-- Publishing at a discoverable reach level must actually deliver.
reset role;
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'neighbour@nearcast.local', '', now(), now());
insert into public.profiles (id, display_name, approximate_home)
values ('00000000-0000-0000-0000-0000000000e1', 'Neighbour',
        extensions.st_point(77.6400, 12.9780)::extensions.geography);
update public.profiles set approximate_home = extensions.st_point(77.6400, 12.9780)::extensions.geography
where id = '00000000-0000-0000-0000-000000000021';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000021","role":"authenticated"}';

select lives_ok(
  $$select public.publish_intent('offer', 'Spare desk on Sunday', 'Ask for it',
      now() + interval '1 day', 'nearby_relevant', true, true, null, null, null,
      null, null, 'Indiranagar', 77.6420, 12.9790, '[]'::jsonb, null, null, null,
      '70000000-0000-0000-0000-00000000000b')$$,
  'an intent can be published at a discoverable reach level'
);

reset role;

select isnt_empty(
  $$select 1 from public.intent_deliveries d
    join public.intents i on i.id = d.intent_id
    where i.statement = 'Spare desk on Sunday'
      and d.recipient_id = '00000000-0000-0000-0000-0000000000e1'$$,
  'publishing at a discoverable level delivers to an eligible neighbour'
);

select * from finish();
rollback;
