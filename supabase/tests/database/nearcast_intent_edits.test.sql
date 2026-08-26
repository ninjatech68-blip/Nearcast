-- Material-edit history (MUST-017).
-- A published intent can be edited by its broadcaster, but an edit that changes
-- what someone responded to must leave a record the existing respondents can
-- see. The record names the fields that changed; it never copies their values,
-- because an append-only log cannot be redacted by the retention policy.
begin;

create extension if not exists pgtap with schema extensions;
select plan(30);

-- ---------------------------------------------------------------- structure
select has_function(
  'public', 'update_intent', array['uuid', 'integer', 'jsonb'],
  'the owner edit function exists'
);

-- ---------------------------------------------------------------- fixtures
delete from public.profiles;
delete from auth.users;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bela@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'raj@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zoe@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name, city) values
  ('00000000-0000-0000-0000-0000000000e1', 'Bela Broadcaster', 'Bengaluru'),
  ('00000000-0000-0000-0000-0000000000e2', 'Raj Respondent', 'Bengaluru'),
  ('00000000-0000-0000-0000-0000000000e3', 'Zoe Outsider', 'Bengaluru');

-- Bela owns one live intent Raj was delivered and responded to, and one draft.
insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action, expires_at, published_at)
values
  ('10000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e1',
   'request', 'Need a table for six on Friday', 'live', 'Offer help', now() + interval '5 days', now()),
  ('10000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e1',
   'offer', 'Not published yet', 'draft', 'I am interested', now() + interval '5 days', null);

insert into public.intent_context (intent_id, approximate_place, price_minor, currency)
values ('10000000-0000-0000-0000-0000000000e1', 'Koramangala', 40000, 'INR');
insert into public.intent_context (intent_id) values ('10000000-0000-0000-0000-0000000000e2');

insert into public.intent_reach (intent_id, level)
values
  ('10000000-0000-0000-0000-0000000000e1', 'adjacent_network'),
  ('10000000-0000-0000-0000-0000000000e2', 'adjacent_network');

insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text)
values ('10000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2',
        'adjacent_trust_connection', 'Shared through one trusted connection');

insert into public.responses (id, intent_id, respondent_id, message, status)
values ('40000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000e1',
        '00000000-0000-0000-0000-0000000000e2', 'I can host that', 'pending');

-- A lifecycle event only the broadcaster may read, to prove the two policies
-- stay separate.
insert into public.intent_events (intent_id, actor_id, event_type, from_status, to_status)
values ('10000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e1',
        'intent_published', 'draft', 'live');

-- Bela also owns a matched intent, which is past the point of editing.
insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action, expires_at, published_at)
values ('10000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e1',
        'plan', 'Already arranged', 'matched', 'Request to join', now() + interval '5 days', now());
insert into public.intent_context (intent_id) values ('10000000-0000-0000-0000-0000000000e3');

-- ------------------------------------------------------------------- grants
set local role anon;
set local "request.jwt.claims" = '{"role":"anon"}';
select throws_ok(
  $$ select public.update_intent('10000000-0000-0000-0000-0000000000e1', 1, '{"statement":"anything"}'::jsonb) $$,
  '42501',
  NULL,
  'an anonymous caller cannot edit an intent'
);

-- --------------------------------------------------------------- authority
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select throws_ok(
  $$ select public.update_intent('10000000-0000-0000-0000-0000000000e1', 1, '{"statement":"Raj rewrites it"}'::jsonb) $$,
  '42501',
  NULL,
  'a respondent cannot edit the broadcaster''s intent'
);

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select throws_ok(
  $$ select public.update_intent('10000000-0000-0000-0000-0000000000e1', 9, '{"statement":"Stale write"}'::jsonb) $$,
  '40001',
  NULL,
  'an edit against a stale version is refused'
);
select throws_ok(
  $$ select public.update_intent('10000000-0000-0000-0000-0000000000e3', 1, '{"statement":"Too late"}'::jsonb) $$,
  '40001',
  NULL,
  'a matched intent can no longer be edited'
);

-- -------------------------------------------------------------- validation
select throws_ok(
  $$ select public.update_intent('10000000-0000-0000-0000-0000000000e1', 1, '{"broadcaster_id":"00000000-0000-0000-0000-0000000000e2"}'::jsonb) $$,
  '22000',
  NULL,
  'an unlisted field is rejected rather than silently ignored'
);
select throws_ok(
  $$ select public.update_intent('10000000-0000-0000-0000-0000000000e1', 1, '{"statement":"   "}'::jsonb) $$,
  '22000',
  NULL,
  'an empty statement is rejected'
);
select throws_ok(
  $$ select public.update_intent('10000000-0000-0000-0000-0000000000e1', 1,
       jsonb_build_object('expires_at', (now() - interval '1 day')::text)) $$,
  '22000',
  NULL,
  'an expiry in the past is rejected'
);
-- The draft carries neither price nor currency, so a lone price would leave the
-- pair incomplete. On the live intent the currency is already set, and sending
-- a price alone is a legitimate correction.
select throws_ok(
  $$ select public.update_intent('10000000-0000-0000-0000-0000000000e2', 1, '{"price_minor":50000}'::jsonb) $$,
  '22000',
  NULL,
  'a price with no currency on either side is rejected'
);
select throws_ok(
  $$ select public.update_intent('10000000-0000-0000-0000-0000000000e1', 1, '{"requirements":"vegetarian"}'::jsonb) $$,
  '22000',
  NULL,
  'requirements must be a list, not free text'
);

-- ------------------------------------------------------------------- edit
select lives_ok(
  $$ select public.update_intent('10000000-0000-0000-0000-0000000000e1', 1,
       '{"price_minor":60000,"currency":"INR","approximate_place":"Indiranagar"}'::jsonb) $$,
  'the broadcaster can change price and place on a live intent'
);
select results_eq(
  $$ select version from public.intents where id = '10000000-0000-0000-0000-0000000000e1' $$,
  array[2],
  'the version advances so a concurrent editor is refused'
);
select results_eq(
  $$ select price_minor, approximate_place from public.intent_context
     where intent_id = '10000000-0000-0000-0000-0000000000e1' $$,
  $$ values (60000::bigint, 'Indiranagar'::text) $$,
  'the new values are stored'
);

-- ---------------------------------------------------------------- history
reset role;
select results_eq(
  $$ select count(*)::int from public.intent_events
     where intent_id = '10000000-0000-0000-0000-0000000000e1' and event_type = 'material_edit' $$,
  array[1],
  'one material-edit event records the change'
);
select results_eq(
  $$ select jsonb_array_length(metadata -> 'fields') from public.intent_events
     where intent_id = '10000000-0000-0000-0000-0000000000e1' and event_type = 'material_edit' $$,
  array[2],
  'the event names both changed fields, and only the fields that changed'
);
select isnt_empty(
  $$ select 1 from public.intent_events
     where intent_id = '10000000-0000-0000-0000-0000000000e1' and event_type = 'material_edit'
       and metadata -> 'fields' ? 'price' and metadata -> 'fields' ? 'location' $$,
  'the event names the categories in the requirement, not raw column names'
);
select is_empty(
  $$ select 1 from public.intent_events
     where intent_id = '10000000-0000-0000-0000-0000000000e1' and event_type = 'material_edit'
       and (metadata::text like '%Indiranagar%' or metadata::text like '%60000%') $$,
  'the event copies no values, so retention has nothing to redact here'
);

-- Existing respondents must be able to see it; unrelated accounts must not.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select isnt_empty(
  $$ select 1 from public.intent_events
     where intent_id = '10000000-0000-0000-0000-0000000000e1' and event_type = 'material_edit' $$,
  'an existing respondent can read the material-edit history'
);
select is_empty(
  $$ select 1 from public.intent_events
     where intent_id = '10000000-0000-0000-0000-0000000000e1' and event_type <> 'material_edit' $$,
  'a respondent sees only material edits, not the rest of the lifecycle log'
);

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}';
select is_empty(
  $$ select 1 from public.intent_events where intent_id = '10000000-0000-0000-0000-0000000000e1' $$,
  'an unrelated account reads no history at all'
);

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select isnt_empty(
  $$ select 1 from public.intent_events
     where intent_id = '10000000-0000-0000-0000-0000000000e1' and event_type = 'intent_published' $$,
  'the broadcaster still reads the whole lifecycle log'
);

-- ---------------------------------------------------------- notifications
reset role;
select results_eq(
  $$ select recipient_id, event_type, object_type from public.notification_jobs
     where object_id = '10000000-0000-0000-0000-0000000000e1' $$,
  $$ values ('00000000-0000-0000-0000-0000000000e2'::uuid, 'intent_material_edit'::text, 'intent'::text) $$,
  'only the existing respondent is notified, with a generic event type'
);
select is_empty(
  $$ select 1 from public.notification_jobs
     where object_id = '10000000-0000-0000-0000-0000000000e1'
       and (idempotency_key like '%Indiranagar%' or idempotency_key like '%table for six%') $$,
  'the notification carries no intent text or private detail'
);

-- ------------------------------------------------------------- idempotence
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select lives_ok(
  $$ select public.update_intent('10000000-0000-0000-0000-0000000000e1', 2,
       '{"price_minor":60000,"currency":"INR","approximate_place":"Indiranagar"}'::jsonb) $$,
  'resubmitting the same values is accepted'
);
reset role;
select results_eq(
  $$ select count(*)::int from public.intent_events
     where intent_id = '10000000-0000-0000-0000-0000000000e1' and event_type = 'material_edit' $$,
  array[1],
  'an edit that changes nothing records no second event'
);
select results_eq(
  $$ select count(*)::int from public.notification_jobs
     where object_id = '10000000-0000-0000-0000-0000000000e1' $$,
  array[1],
  'and notifies nobody a second time'
);

-- ---------------------------------------------------------------- drafts
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select lives_ok(
  $$ select public.update_intent('10000000-0000-0000-0000-0000000000e2', 1,
       '{"statement":"Still shaping this","price_minor":1000,"currency":"INR"}'::jsonb) $$,
  'a draft can be edited freely'
);
reset role;
select is_empty(
  $$ select 1 from public.intent_events
     where intent_id = '10000000-0000-0000-0000-0000000000e2' and event_type = 'material_edit' $$,
  'editing a draft records no material edit, because nobody has responded to it'
);
select is_empty(
  $$ select 1 from public.notification_jobs where object_id = '10000000-0000-0000-0000-0000000000e2' $$,
  'and notifies nobody'
);
select results_eq(
  $$ select statement from public.intents where id = '10000000-0000-0000-0000-0000000000e2' $$,
  array['Still shaping this'::text],
  'the draft edit is applied'
);

select * from finish();
rollback;
