begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

select has_function('public', 'submit_response', 'the response mutation exists');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'delivered@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'undelivered@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'blocked@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-000000000051', 'Asha Rao'),
  ('00000000-0000-0000-0000-000000000052', 'Dev Mehta'),
  ('00000000-0000-0000-0000-000000000053', 'Mira Sen'),
  ('00000000-0000-0000-0000-000000000054', 'Ravi Nair');

insert into public.intents (
  id, broadcaster_id, primitive, statement, status, response_action,
  expires_at, published_at, share_slug, version, created_at
) values
  ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000051',
   'request', 'Need two helpers for Saturday', 'live', 'Offer help',
   now() + interval '1 day', now(), 'f0000000-0000-0000-0000-000000000001', 1, now()),
  ('e0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000051',
   'request', 'Lapsed intent', 'live', 'Offer help',
   now() - interval '1 minute', now() - interval '2 days',
   'f0000000-0000-0000-0000-000000000002', 1, now() - interval '3 days');

insert into public.intent_context (intent_id) values
  ('e0000000-0000-0000-0000-000000000001'), ('e0000000-0000-0000-0000-000000000002');

insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text) values
  ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000052',
   'adjacent_trust_connection', 'Someone you both know shared this'),
  ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000054',
   'adjacent_trust_connection', 'Someone you both know shared this'),
  ('e0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000052',
   'adjacent_trust_connection', 'Someone you both know shared this');

insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000054');

set local role authenticated;

-- Self-response.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000051","role":"authenticated"}';
select throws_ok(
  $$select public.submit_response('e0000000-0000-0000-0000-000000000001', 'Me again')$$,
  '42501', null, 'a broadcaster cannot respond to their own intent'
);

-- Missing delivery.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000053","role":"authenticated"}';
select throws_ok(
  $$select public.submit_response('e0000000-0000-0000-0000-000000000001', 'Let me in')$$,
  '42501', null, 'someone the intent never reached cannot respond'
);

-- Blocked pair.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000054","role":"authenticated"}';
select throws_ok(
  $$select public.submit_response('e0000000-0000-0000-0000-000000000001', 'Hello')$$,
  '42501', null, 'a blocked pair cannot respond'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000052","role":"authenticated"}';

-- Expiry.
select throws_ok(
  $$select public.submit_response('e0000000-0000-0000-0000-000000000002', 'Still keen')$$,
  '40001', null, 'a lapsed intent cannot be responded to'
);

-- Input validation.
select throws_ok(
  $$select public.submit_response('e0000000-0000-0000-0000-000000000001', '   ')$$,
  '22023', null, 'a blank message is refused'
);
select throws_ok(
  $$select public.submit_response('e0000000-0000-0000-0000-000000000001', repeat('x', 1001))$$,
  '22023', null, 'a message over 1000 characters is refused'
);

-- A valid submission.
select is(
  (select response_status from public.submit_response(
    'e0000000-0000-0000-0000-000000000001', '  Happy to help  ',
    '{"has_van": true}'::jsonb, '10000000-0000-0000-0000-00000000000a')),
  'pending',
  'a delivered, unblocked recipient can respond'
);

reset role;

select is(
  (select message from public.responses where intent_id = 'e0000000-0000-0000-0000-000000000001'),
  'Happy to help',
  'the message is trimmed before storage'
);

select isnt_empty(
  $$select 1 from public.responses
    where intent_id = 'e0000000-0000-0000-0000-000000000001'
      and qualification ->> 'has_van' = 'true'$$,
  'qualification is stored alongside the response'
);

-- The notification is queued in the same transaction, addressed to the owner.
select isnt_empty(
  $$select 1 from public.notification_jobs
    where event_type = 'response_received'
      and recipient_id = '00000000-0000-0000-0000-000000000051'
      and object_type = 'response'$$,
  'the broadcaster notification is queued with the response'
);

select is_empty(
  $$select 1 from public.notification_jobs
    where event_type = 'response_received'
      and (idempotency_key ilike '%Happy to help%'
        or idempotency_key ilike '%helpers for Saturday%')$$,
  'the queued notification carries no message or intent text'
);

select isnt_empty(
  $$select 1 from public.intent_events
    where intent_id = 'e0000000-0000-0000-0000-000000000001'
      and event_type = 'response_submitted'$$,
  'the response is recorded in intent history'
);

-- Duplicate response.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000052","role":"authenticated"}';

select is(
  (select count(*)::int from public.submit_response(
    'e0000000-0000-0000-0000-000000000001', 'A completely different note')),
  1,
  'a second response returns the original rather than refusing'
);

reset role;
select is(
  (select count(*)::int from public.responses
   where intent_id = 'e0000000-0000-0000-0000-000000000001'),
  1,
  'a person still has exactly one response to an intent'
);

-- Idempotent retry.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000052","role":"authenticated"}';

select is(
  (select response_id from public.submit_response(
    'e0000000-0000-0000-0000-000000000001', 'Happy to help',
    '{"has_van": true}'::jsonb, '10000000-0000-0000-0000-00000000000a')),
  (select id from public.responses where intent_id = 'e0000000-0000-0000-0000-000000000001'),
  'a replayed key returns the original response'
);

select throws_ok(
  $$select public.submit_response('e0000000-0000-0000-0000-000000000001',
      'Different body', '{}'::jsonb, '10000000-0000-0000-0000-00000000000a')$$,
  '23505', null, 'the same key with a different message conflicts'
);

select * from finish();
rollback;
