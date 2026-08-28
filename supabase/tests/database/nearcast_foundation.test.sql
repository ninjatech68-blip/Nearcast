begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

select has_table('public', 'intents', 'intents table exists');
select has_function('public', 'accept_response', array['uuid', 'intent_status'], 'acceptance transaction exists');
select has_function('public', 'get_public_intent', array['uuid'], 'privacy-safe public projection exists');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'broadcaster@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recipient@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-000000000001', 'Asha Rao'),
  ('00000000-0000-0000-0000-000000000002', 'Dev Mehta'),
  ('00000000-0000-0000-0000-000000000003', 'Mira Sen');

insert into public.intents (
  id, broadcaster_id, category, statement, status, expires_at, published_at, share_slug
) values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'help', 'Need help carrying books this evening', 'live',
  now() + interval '1 day', now(), '20000000-0000-0000-0000-000000000001'
);

insert into public.intent_context (intent_id, approximate_place)
values ('10000000-0000-0000-0000-000000000001', 'Indiranagar');
insert into public.intent_reach (intent_id, level)
values ('10000000-0000-0000-0000-000000000001', 'adjacent_network');
insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'one_trusted_link', 'one trusted link away'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

select results_eq(
  $$ select count(*) from public.intents where id = '10000000-0000-0000-0000-000000000001' $$,
  array[1::bigint],
  'delivered recipient can read the intent'
);

update public.intents set statement = 'tampered'
where id = '10000000-0000-0000-0000-000000000001';
select results_eq(
  $$ select statement from public.intents where id = '10000000-0000-0000-0000-000000000001' $$,
  array['Need help carrying books this evening'::text],
  'recipient cannot edit broadcaster intent'
);

-- an undelivered outsider must not see the cast at all
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
select is_empty(
  $$ select id from public.intents where id = '10000000-0000-0000-0000-000000000001' $$,
  'an outsider with no delivery row cannot read the cast'
);

reset role;
set local role anon;
select results_eq(
  $$ select broadcaster_first_name from public.get_public_intent('20000000-0000-0000-0000-000000000001') $$,
  array['Asha'::text],
  'anonymous share projection contains only allowed broadcaster identity'
);

select * from finish();
rollback;
