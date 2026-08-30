begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

select has_function('public', 'change_intent_reach', 'reach change exists');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000092', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name, approximate_home) values
  ('00000000-0000-0000-0000-000000000091', 'Asha Rao', extensions.st_point(77.6400, 12.9780)::extensions.geography),
  ('00000000-0000-0000-0000-000000000092', 'Dev Mehta', extensions.st_point(77.6400, 12.9780)::extensions.geography);

insert into public.intents (
  id, broadcaster_id, primitive, statement, status, response_action,
  expires_at, published_at, share_slug, version, created_at
) values (
  'b0000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000091',
  'request', 'Reach test', 'live', 'Offer help',
  now() + interval '1 day', now(), 'c0000000-0000-0000-0000-000000000091', 1, now()
);
insert into public.intent_context (intent_id, approximate_place, approximate_geography)
values ('b0000000-0000-0000-0000-000000000091', 'Indiranagar',
        extensions.st_point(77.6420, 12.9790)::extensions.geography);
insert into public.intent_reach (intent_id, level)
values ('b0000000-0000-0000-0000-000000000091', 'origin_only');

set local role authenticated;

-- Only the owner may change reach.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000092","role":"authenticated"}';
select throws_ok(
  $$select public.change_intent_reach('b0000000-0000-0000-0000-000000000091',
      'origin_only', 'adjacent_network', true)$$,
  '42501', null, 'a non-owner cannot change reach'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000091","role":"authenticated"}';

-- The three gates on expansion.
select throws_ok(
  $$select public.change_intent_reach('b0000000-0000-0000-0000-000000000091',
      'origin_only', 'adjacent_network', false)$$,
  '42501', null, 'expansion without a disclosure confirmation is refused'
);

select throws_ok(
  $$select public.change_intent_reach('b0000000-0000-0000-0000-000000000091',
      'nearby_relevant', 'broader_approved', true)$$,
  '40001', null, 'expansion from a level the caller does not actually hold is refused'
);

select is(
  (select count(*)::int from public.intent_deliveries
   where intent_id = 'b0000000-0000-0000-0000-000000000091'),
  0,
  'a refused expansion delivered to nobody'
);

-- A confirmed expansion.
select is(
  (select level::text from public.change_intent_reach('b0000000-0000-0000-0000-000000000091',
     'origin_only', 'adjacent_network', true)),
  'adjacent_network',
  'a confirmed expansion from the held level succeeds'
);

reset role;

select isnt_empty(
  $$select 1 from public.intent_events
    where intent_id = 'b0000000-0000-0000-0000-000000000091'
      and event_type = 'reach_expanded'
      and metadata ->> 'from_level' = 'origin_only'
      and metadata ->> 'to_level' = 'adjacent_network'
      and actor_id = '00000000-0000-0000-0000-000000000091'$$,
  'the old level, new level and actor are all logged'
);

select is(
  (select count(*)::int from public.intent_deliveries
   where intent_id = 'b0000000-0000-0000-0000-000000000091'),
  1,
  'expansion actually reaches the newly eligible person'
);

select isnt_empty(
  $$select 1 from public.intent_reach
    where intent_id = 'b0000000-0000-0000-0000-000000000091' and expanded_at is not null$$,
  'the expansion time is recorded'
);

-- Reduction needs no confirmation and is immediately available.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000091","role":"authenticated"}';

select is(
  (select level::text from public.change_intent_reach('b0000000-0000-0000-0000-000000000091',
     'adjacent_network', 'origin_only', false)),
  'origin_only',
  'reducing reach needs no disclosure confirmation'
);

reset role;

select isnt_empty(
  $$select 1 from public.intent_events
    where intent_id = 'b0000000-0000-0000-0000-000000000091'
      and event_type = 'reach_reduced'$$,
  'a reduction is logged distinctly from an expansion'
);

select is(
  (select level::text from public.intent_reach
   where intent_id = 'b0000000-0000-0000-0000-000000000091'),
  'origin_only',
  'the reduction took effect immediately'
);

-- Re-stating the current level is a no-op, not an error.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000091","role":"authenticated"}';

select is(
  (select level::text from public.change_intent_reach('b0000000-0000-0000-0000-000000000091',
     'origin_only', 'origin_only', false)),
  'origin_only',
  'setting the level it already holds is a no-op'
);

-- Reach cannot be changed on a closed intent.
reset role;
update public.intents set status = 'withdrawn' where id = 'b0000000-0000-0000-0000-000000000091';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000091","role":"authenticated"}';

select throws_ok(
  $$select public.change_intent_reach('b0000000-0000-0000-0000-000000000091',
      'origin_only', 'broader_approved', true)$$,
  '40001', null, 'a withdrawn intent cannot have its reach widened'
);

select * from finish();
rollback;
