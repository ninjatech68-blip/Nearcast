begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

-- ---------------------------------------------------------------
-- shape: a radius on the reach row, an optional ceiling on the cast
-- ---------------------------------------------------------------
select has_column('public', 'intent_reach', 'radius_km', 'a cast carries how far it travels');
select col_not_null('public', 'intent_reach', 'radius_km', 'every cast has a radius — there is no unset state');
select col_default_is('public', 'intent_reach', 'radius_km', '5',
  'the default radius leaves your own street without reaching the whole city');
select col_is_null('public', 'intents', 'slots_wanted',
  'a cast may state no ceiling at all, which is what the app now makes');
select col_hasnt_default('public', 'intents', 'slots_wanted',
  'no hidden default: an unanswered question must not become a silent cap');

-- ---------------------------------------------------------------
-- fixtures
-- ---------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','radius-caster@nearcast.local','',now(),now()),
  ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','radius-j1@nearcast.local','',now(),now()),
  ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','radius-j2@nearcast.local','',now(),now()),
  ('00000000-0000-0000-0000-0000000000a4','00000000-0000-0000-0000-000000000000','authenticated','authenticated','radius-j3@nearcast.local','',now(),now());

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000a1','Piyush Sharma'),
  ('00000000-0000-0000-0000-0000000000a2','Aarav Rao'),
  ('00000000-0000-0000-0000-0000000000a3','Riya Mehta'),
  ('00000000-0000-0000-0000-0000000000a4','Mira Sen');

-- an uncapped cast: slots_wanted left out entirely, as the app does
insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at)
values ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','sports',
        'sunday morning run. anyone.','live', now() + interval '2 days', now());
insert into public.intent_context (intent_id, approximate_place, starts_at)
values ('10000000-0000-0000-0000-0000000000a1','indiranagar', now() + interval '1 day');
insert into public.intent_reach (intent_id) values ('10000000-0000-0000-0000-0000000000a1');

insert into public.responses (id, intent_id, respondent_id, message) values
  ('20000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2','in'),
  ('20000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a3','in'),
  ('20000000-0000-0000-0000-0000000000a3','10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a4','in');

select results_eq(
  $$ select slots_wanted from public.intents where id = '10000000-0000-0000-0000-0000000000a1' $$,
  array[null::smallint],
  'a cast made without a ceiling stores none, rather than inheriting one'
);
select results_eq(
  $$ select radius_km from public.intent_reach where intent_id = '10000000-0000-0000-0000-0000000000a1' $$,
  array[5::smallint],
  'and it gets the default radius'
);

-- ---------------------------------------------------------------
-- an uncapped cast never fills
-- ---------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select lives_ok(
  $$ select public.accept_response('20000000-0000-0000-0000-0000000000a1','live') $$,
  'the caster accepts the first joiner'
);
select lives_ok(
  $$ select public.accept_response('20000000-0000-0000-0000-0000000000a2','live') $$,
  'the caster accepts the second joiner'
);
-- the old default was two. a third accept is the regression this guards:
-- a hidden ceiling would refuse it and the caster would never be told why.
select lives_ok(
  $$ select public.accept_response('20000000-0000-0000-0000-0000000000a3','live') $$,
  'and a third, because no ceiling was ever stated'
);
select results_eq(
  $$ select status::text from public.intents where id = '10000000-0000-0000-0000-0000000000a1' $$,
  array['live'::text],
  'an uncapped cast stays live — nothing can fill it'
);

reset role;

select * from finish();
rollback;
