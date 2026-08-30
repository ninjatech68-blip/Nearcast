begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

select has_function('public', 'update_intent', 'the edit mutation exists');
select has_function('public', 'withdraw_intent', 'the withdraw mutation exists');
select has_function('public', 'resolve_intent', 'the resolve mutation exists');
select has_function('public', 'expire_intents', 'the expiry sweep exists');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recipient@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-000000000041', 'Asha Rao'),
  ('00000000-0000-0000-0000-000000000042', 'Dev Mehta');

insert into public.intents (
  id, broadcaster_id, primitive, statement, status, response_action,
  expires_at, published_at, share_slug, version
) values (
  'a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000041',
  'request', 'Need two helpers for Saturday', 'live', 'Offer help',
  now() + interval '1 day', now(), 'b0000000-0000-0000-0000-000000000001', 1
);

insert into public.intent_context (intent_id, approximate_place, price_minor, currency)
values ('a0000000-0000-0000-0000-000000000001', 'Indiranagar', 1000, 'INR');
insert into public.intent_reach (intent_id, level) values
  ('a0000000-0000-0000-0000-000000000001', 'adjacent_network');
insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text)
values ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000042',
        'adjacent_trust_connection', 'Someone you both know shared this');

set local role authenticated;

-- Only the owner may edit.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000042","role":"authenticated"}';

select throws_ok(
  $$select public.update_intent('a0000000-0000-0000-0000-000000000001', 1,
      'Hijacked', 'Offer help', now() + interval '1 day')$$,
  '42501', null, 'a non-owner cannot edit the intent'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000041","role":"authenticated"}';

-- Stale version.
select throws_ok(
  $$select public.update_intent('a0000000-0000-0000-0000-000000000001', 99,
      'Need two helpers', 'Offer help', now() + interval '1 day')$$,
  '40001', null, 'an edit against a stale version is refused'
);

-- A non-material edit.
select is(
  (select intent_version from public.update_intent(
    'a0000000-0000-0000-0000-000000000001', 1,
    'Need two helpers for Saturday morning', 'Offer help',
    (select expires_at from public.intents where id = 'a0000000-0000-0000-0000-000000000001'),
    null, null, null, 1000, 'INR', 'Indiranagar', '[]'::jsonb)),
  2,
  'an edit bumps the version'
);

reset role;

select isnt_empty(
  $$select 1 from public.intent_events
    where intent_id = 'a0000000-0000-0000-0000-000000000001'
      and event_type = 'intent_edited'$$,
  'a wording-only edit is recorded as a plain edit'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000041","role":"authenticated"}';

-- A material edit: price and location both change.
select is(
  (select intent_version from public.update_intent(
    'a0000000-0000-0000-0000-000000000001', 2,
    'Need two helpers for Saturday morning', 'Offer help',
    (select expires_at from public.intents where id = 'a0000000-0000-0000-0000-000000000001'),
    null, null, null, 2500, 'INR', 'Koramangala', '[]'::jsonb)),
  3,
  'a material edit bumps the version'
);

reset role;

select isnt_empty(
  $$select 1 from public.intent_events
    where intent_id = 'a0000000-0000-0000-0000-000000000001'
      and event_type = 'intent_edited_materially'$$,
  'a material edit is recorded distinctly from a wording change'
);

select set_eq(
  $$select jsonb_array_elements_text(metadata -> 'material_changes')
    from public.intent_events
    where intent_id = 'a0000000-0000-0000-0000-000000000001'
      and event_type = 'intent_edited_materially'$$,
  $$values ('price'::text),('location'::text)$$,
  'the event names exactly which fields materially changed'
);

-- A recipient may respond while the intent is live.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000042","role":"authenticated"}';

select lives_ok(
  $$insert into public.responses (intent_id, respondent_id, message, status)
    values ('a0000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000042', 'Happy to help', 'pending')$$,
  'a delivered recipient can respond to a live intent'
);

-- Withdrawal.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000041","role":"authenticated"}';

select is(
  (select intent_status from public.withdraw_intent('a0000000-0000-0000-0000-000000000001', 3)),
  'withdrawn',
  'the owner can withdraw a live intent'
);

select is(
  (select intent_status from public.withdraw_intent('a0000000-0000-0000-0000-000000000001', 3)),
  'withdrawn',
  'withdrawing again confirms the outcome instead of reporting a stale state'
);

reset role;
select isnt_empty(
  $$select 1 from public.intent_events
    where intent_id = 'a0000000-0000-0000-0000-000000000001'
      and event_type = 'intent_withdrawn' and to_status = 'withdrawn'$$,
  'withdrawal is recorded in history'
);

-- New responses stop immediately once the intent is not live.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000042","role":"authenticated"}';

select throws_ok(
  $$insert into public.responses (intent_id, respondent_id, message, status)
    values ('a0000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000042', 'Still keen', 'pending')$$,
  '42501', null, 'a withdrawn intent stops accepting new responses'
);

-- An edit after closing is refused.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000041","role":"authenticated"}';

select throws_ok(
  $$select public.update_intent('a0000000-0000-0000-0000-000000000001', 4,
      'Reopened', 'Offer help', now() + interval '1 day')$$,
  '40001', null, 'a withdrawn intent cannot be edited back into life'
);

-- Resolution, on a second intent.
reset role;
insert into public.intents (
  id, broadcaster_id, primitive, statement, status, response_action,
  expires_at, published_at, share_slug, version
) values (
  'a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000041',
  'request', 'Need a ladder', 'live', 'Offer help',
  now() + interval '1 day', now(), 'b0000000-0000-0000-0000-000000000002', 1
);
insert into public.intent_context (intent_id) values ('a0000000-0000-0000-0000-000000000002');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000041","role":"authenticated"}';

select is(
  (select intent_status from public.resolve_intent('a0000000-0000-0000-0000-000000000002', 1)),
  'resolved',
  'the owner can resolve a live intent'
);

reset role;

select isnt_empty(
  $$select 1 from public.intents
    where id = 'a0000000-0000-0000-0000-000000000002' and resolved_at is not null$$,
  'resolving stamps the resolution time'
);

-- Expiry sweep.
insert into public.intents (
  id, broadcaster_id, primitive, statement, status, response_action,
  expires_at, published_at, share_slug, version, created_at
) values (
  'a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000041',
  'request', 'Lapsed intent', 'live', 'Offer help',
  now() - interval '1 minute', now() - interval '2 days',
  'b0000000-0000-0000-0000-000000000003', 1, now() - interval '3 days'
);
insert into public.intent_context (intent_id) values ('a0000000-0000-0000-0000-000000000003');

select is(public.expire_intents(), 1, 'the sweep expires the lapsed intent');
select is(public.expire_intents(), 0, 'running the sweep again changes nothing');

select is(
  (select status::text from public.intents where id = 'a0000000-0000-0000-0000-000000000003'),
  'expired',
  'the lapsed intent is now recorded as expired'
);

select * from finish();
rollback;
