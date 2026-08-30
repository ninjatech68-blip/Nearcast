begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

select has_function('public', 'confirm_intent', 'the confirmation mutation exists');

-- The anonymous projection must expose exactly the API-contract fields. Pinned
-- as a set, so adding broadcaster_id or an address column fails here loudly
-- rather than leaking quietly.
create temporary view public_projection as
select * from public.get_public_intent('00000000-0000-0000-0000-000000000000');

select set_eq(
  $$select column_name::text from information_schema.columns
    where table_name = 'public_projection'$$,
  $$values ('id'),('share_slug'),('primitive'),('statement'),('response_action'),
           ('expires_at'),('published_at'),('starts_at'),('deadline_at'),('quantity'),
           ('price_minor'),('currency'),('approximate_place'),('broadcaster_first_name'),
           ('confirmation_count')$$,
  'the public projection returns only the contracted fields'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'broadcaster@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'friend@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nonmember@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-000000000031', 'Asha Rao'),
  ('00000000-0000-0000-0000-000000000032', 'Dev Mehta'),
  ('00000000-0000-0000-0000-000000000033', 'Mira Sen');

insert into public.intents (
  id, broadcaster_id, primitive, statement, status, response_action,
  expires_at, published_at, share_slug
) values
  ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000031',
   'request', 'Need two helpers for Saturday', 'live', 'Offer help',
   now() + interval '1 day', now(), '90000000-0000-0000-0000-000000000001'),
  ('80000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000031',
   'request', 'Link disabled intent', 'live', 'Offer help',
   now() + interval '1 day', now(), '90000000-0000-0000-0000-000000000002');

insert into public.intent_context (intent_id, approximate_place) values
  ('80000000-0000-0000-0000-000000000001', 'Indiranagar'),
  ('80000000-0000-0000-0000-000000000002', 'Indiranagar');

insert into public.intent_private (intent_id, exact_address, private_contact) values
  ('80000000-0000-0000-0000-000000000001', '42 Private Lane', '+910000000000');

insert into public.intent_reach (intent_id, level, public_link_enabled) values
  ('80000000-0000-0000-0000-000000000001', 'adjacent_network', true),
  ('80000000-0000-0000-0000-000000000002', 'adjacent_network', false);

-- The projection itself.
select is(
  (select confirmation_count from public.get_public_intent('90000000-0000-0000-0000-000000000001')),
  0::bigint,
  'an intent with no confirmations honestly reports zero'
);

select is(
  (select broadcaster_first_name from public.get_public_intent('90000000-0000-0000-0000-000000000001')),
  'Asha',
  'only the first name is projected, never the full display name'
);

select is_empty(
  $$select 1 from public.get_public_intent('90000000-0000-0000-0000-000000000002')$$,
  'an intent with its public link switched off is not projected'
);

set local role authenticated;

-- Self-confirmation would be fabricating support.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000031","role":"authenticated"}';

select throws_ok(
  $$select public.confirm_intent('90000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'a broadcaster cannot confirm their own intent'
);

-- A signed-in identity without a redeemed invitation is not a member.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000034","role":"authenticated"}';

select throws_ok(
  $$select public.confirm_intent('90000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'a signed-in non-member cannot confirm'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000032","role":"authenticated"}';

select is(
  (select confirmation_count from public.confirm_intent('90000000-0000-0000-0000-000000000001')),
  1::bigint,
  'a member confirming raises the count to one'
);

select is(
  (select confirmation_count from public.confirm_intent('90000000-0000-0000-0000-000000000001')),
  1::bigint,
  'confirming twice still counts one person'
);

select throws_ok(
  $$select public.confirm_intent('90000000-0000-0000-0000-000000000002')$$,
  'P0002', null, 'an intent with its link switched off cannot be confirmed'
);

select throws_ok(
  $$select public.confirm_intent('90000000-0000-0000-0000-000000000009')$$,
  'P0002', null, 'an unknown slug reports not found without confirming existence'
);

-- Membership of the confirming circle must not be readable.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000033","role":"authenticated"}';

select is(
  (select confirmation_count from public.confirm_intent('90000000-0000-0000-0000-000000000001')),
  2::bigint,
  'a second member raises the count to two'
);

select is(
  (select count(*)::int from public.intent_confirmations),
  1,
  'a viewer can read only their own confirmation, never the circle'
);

select is(
  (select confirmer_id from public.intent_confirmations),
  '00000000-0000-0000-0000-000000000033'::uuid,
  'the one readable row is the viewer''s own'
);

reset role;

select is(
  (select confirmation_count from public.get_public_intent('90000000-0000-0000-0000-000000000001')),
  2::bigint,
  'the projection reports the aggregate the viewers could not enumerate'
);

select * from finish();
rollback;
