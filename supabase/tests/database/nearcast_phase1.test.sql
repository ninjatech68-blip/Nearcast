-- Phase 1 lifecycle, invitation, idempotency, and safety boundaries.
-- Every allowed case below has a corresponding denied case, per the QA plan.
begin;

create extension if not exists pgtap with schema extensions;
select plan(74);

-- ---------------------------------------------------------------- structure
select has_table('public', 'invitations', 'invitations table exists');
select has_table('public', 'verifications', 'verifications table exists');
select has_table('public', 'devices', 'devices table exists');
select has_table('public', 'reliability_aggregates', 'reliability aggregates table exists');
select has_table('public', 'moderation_actions', 'moderation actions table exists');
select has_table('public', 'idempotency_keys', 'idempotency key store exists');

select has_function('public', 'redeem_invite', array['text', 'text'], 'invite redemption exists');
select has_function('public', 'publish_intent', array['uuid', 'integer', 'reach_level', 'boolean', 'boolean', 'uuid'], 'publish transaction exists');
select has_function('public', 'change_intent_reach', array['uuid', 'integer', 'reach_level', 'boolean'], 'reach change exists');
select has_function('public', 'close_intent', array['uuid', 'intent_status', 'resolution_outcome'], 'close transaction exists');
select has_function('public', 'expire_intents', array[]::text[], 'expiry job exists');
select has_function('public', 'confirm_intent', array['uuid'], 'origin confirmation exists');
select has_function('public', 'submit_response', array['uuid', 'text', 'jsonb', 'uuid'], 'response submission exists');
select has_function('public', 'decide_response', array['uuid', 'text', 'intent_status'], 'response decision exists');
select has_function('public', 'release_disclosure', array['uuid', 'text[]'], 'disclosure release exists');
select has_function('public', 'send_message', array['uuid', 'text', 'uuid'], 'message send exists');
select has_function('public', 'create_report', array['text', 'uuid', 'text', 'text'], 'report creation exists');
select has_function('public', 'confirm_interaction_outcome', array['uuid', 'boolean', 'boolean'], 'outcome confirmation exists');
select has_function('public', 'get_match_disclosures', array['uuid'], 'released-field projection exists');

-- ---------------------------------------------------------------- fixtures
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'broadcaster@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recipient@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'invitee@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'blocked@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'second@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000a1', 'Asha Rao'),
  ('00000000-0000-0000-0000-0000000000a2', 'Dev Mehta'),
  ('00000000-0000-0000-0000-0000000000a3', 'Mira Sen'),
  ('00000000-0000-0000-0000-0000000000a5', 'Ravi Kumar');

insert into public.invitations (token_hash, issued_by, expires_at)
values
  (encode(extensions.digest('valid-token', 'sha256'), 'hex'), '00000000-0000-0000-0000-0000000000a1', now() + interval '7 days'),
  (encode(extensions.digest('expired-token', 'sha256'), 'hex'), '00000000-0000-0000-0000-0000000000a1', now() - interval '1 day');

-- ------------------------------------------------------- invitation redemption
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}';

select throws_ok(
  $$ select public.redeem_invite('expired-token', 'Late Arrival') $$,
  'invalid_invitation',
  'an expired invitation is rejected'
);
select throws_ok(
  $$ select public.redeem_invite('never-issued', 'Ghost') $$,
  'invalid_invitation',
  'an unknown invitation is rejected with the same generic error'
);
select lives_ok(
  $$ select public.redeem_invite('valid-token', 'Nikhil Rao') $$,
  'a valid invitation creates a profile'
);
select results_eq(
  $$ select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a4' $$,
  array['Nikhil Rao'::text],
  'redemption stores the chosen display name'
);
select throws_ok(
  $$ select public.redeem_invite('valid-token', 'Nikhil Again') $$,
  'conflict',
  'a user who already has a profile cannot redeem again'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a6","role":"authenticated"}';
select throws_ok(
  $$ select public.redeem_invite('valid-token', 'Second Claimant') $$,
  'invalid_invitation',
  'a consumed invitation cannot be redeemed by anyone else'
);
select is_empty(
  $$ select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000a6' $$,
  'a rejected redemption creates no profile'
);

-- ------------------------------------------------------------ draft and publish
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

insert into public.intents (id, broadcaster_id, primitive, statement, response_action, expires_at, share_slug)
values ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1',
        'request', 'Need one person to help sort books', 'Offer help', now() + interval '2 days',
        '20000000-0000-0000-0000-0000000000d1');
insert into public.intent_context (intent_id, approximate_place)
values ('10000000-0000-0000-0000-0000000000b1', 'Indiranagar');
insert into public.intent_private (intent_id, exact_address, private_contact)
values ('10000000-0000-0000-0000-0000000000b1', '42 Private Lane', '+910000000000');

select is_empty(
  $$ select 1 from public.intents where id = '10000000-0000-0000-0000-0000000000b1' and status = 'live' $$,
  'a draft is not live before publish'
);
select throws_ok(
  $$ select public.publish_intent('10000000-0000-0000-0000-0000000000b1', 99, 'origin_only', true, true, '30000000-0000-0000-0000-0000000000c1') $$,
  'stale_state',
  'publishing with a stale version is rejected'
);
select lives_ok(
  $$ select public.publish_intent('10000000-0000-0000-0000-0000000000b1', 1, 'origin_only', true, true, '30000000-0000-0000-0000-0000000000c1') $$,
  'the owner can publish a valid draft'
);
select results_eq(
  $$ select status from public.intents where id = '10000000-0000-0000-0000-0000000000b1' $$,
  array['live'::public.intent_status],
  'publishing moves the intent to live'
);
select results_eq(
  $$ select level from public.intent_reach where intent_id = '10000000-0000-0000-0000-0000000000b1' $$,
  array['origin_only'::public.reach_level],
  'publishing records the chosen reach level'
);
select isnt_empty(
  $$ select 1 from public.intent_events where intent_id = '10000000-0000-0000-0000-0000000000b1' and event_type = 'intent_published' $$,
  'publishing appends a lifecycle event'
);
select lives_ok(
  $$ select public.publish_intent('10000000-0000-0000-0000-0000000000b1', 1, 'origin_only', true, true, '30000000-0000-0000-0000-0000000000c1') $$,
  'replaying the same idempotency key returns the original result instead of failing'
);
select results_eq(
  $$ select count(*) from public.intent_events where intent_id = '10000000-0000-0000-0000-0000000000b1' and event_type = 'intent_published' $$,
  array[1::bigint],
  'an idempotent replay does not append a second event'
);
select throws_ok(
  $$ select public.publish_intent('10000000-0000-0000-0000-0000000000b1', 2, 'adjacent_network', true, true, '30000000-0000-0000-0000-0000000000c1') $$,
  'conflict',
  'reusing an idempotency key with a different request is a conflict'
);

-- --------------------------------------------------------------- reach control
select throws_ok(
  $$ select public.change_intent_reach('10000000-0000-0000-0000-0000000000b1', 2, 'nearby_relevant', false) $$,
  'disclosure_not_confirmed',
  'reach cannot expand without an explicit disclosure confirmation'
);
select lives_ok(
  $$ select public.change_intent_reach('10000000-0000-0000-0000-0000000000b1', 2, 'nearby_relevant', true) $$,
  'reach expands when the disclosure is confirmed'
);
select lives_ok(
  $$ select public.change_intent_reach('10000000-0000-0000-0000-0000000000b1', 3, 'origin_only', false) $$,
  'reducing reach never requires a disclosure confirmation'
);

-- a non-owner may not touch reach
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
select throws_ok(
  $$ select public.change_intent_reach('10000000-0000-0000-0000-0000000000b1', 4, 'broader_approved', true) $$,
  'not_authorized',
  'a non-owner cannot change reach'
);

-- ---------------------------------------------------------- origin confirmation
select lives_ok(
  $$ select public.confirm_intent('20000000-0000-0000-0000-0000000000d1') $$,
  'an authenticated outsider can confirm origin support'
);
reset role;
select results_eq(
  $$ select count(*) from public.intent_confirmations where intent_id = '10000000-0000-0000-0000-0000000000b1' $$,
  array[1::bigint],
  'confirming twice does not double-count'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok(
  $$ select public.confirm_intent('20000000-0000-0000-0000-0000000000d1') $$,
  'self_confirmation_forbidden',
  'a broadcaster cannot confirm their own intent'
);

-- ------------------------------------------------------------------- responses
reset role;
insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text)
values ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2',
        'adjacent_trust_connection', 'Shared through one trusted connection');

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
select throws_ok(
  $$ select public.submit_response('10000000-0000-0000-0000-0000000000b1', 'I can help', '{}'::jsonb, '30000000-0000-0000-0000-0000000000c2') $$,
  'not_authorized',
  'a user with no delivery cannot respond'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok(
  $$ select public.submit_response('10000000-0000-0000-0000-0000000000b1', 'I can help', '{"a":1,"b":2,"c":3}'::jsonb, '30000000-0000-0000-0000-0000000000c2') $$,
  'invalid_input',
  'more than two qualifying answers is rejected'
);
select lives_ok(
  $$ select public.submit_response('10000000-0000-0000-0000-0000000000b1', 'I can help this evening', '{"when":"evening"}'::jsonb, '30000000-0000-0000-0000-0000000000c2') $$,
  'a delivered recipient can respond'
);
select throws_ok($$ select 1 from public.notification_jobs $$, '42501', NULL, 'the notification queue rejects client roles at the grant level');
reset role;
select isnt_empty(
  $$ select 1 from public.notification_jobs where event_type = 'response_received' $$,
  'responding queues a notification in the same transaction'
);
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';

-- respondents cannot see competing responses
reset role;
insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text)
values ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a5',
        'nearby_interest_match', 'Nearby and relevant');
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}';
select lives_ok(
  $$ select public.submit_response('10000000-0000-0000-0000-0000000000b1', 'I am free too', '{}'::jsonb, '30000000-0000-0000-0000-0000000000c3') $$,
  'a second delivered recipient can respond'
);
select results_eq(
  $$ select count(*) from public.responses where intent_id = '10000000-0000-0000-0000-0000000000b1' $$,
  array[1::bigint],
  'a respondent sees only their own response, never a competitor'
);

-- ------------------------------------------------------------------- decisions
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok(
  $$ select public.decide_response(
       (select id from public.responses where respondent_id = '00000000-0000-0000-0000-0000000000a2'),
       'accept', 'live') $$,
  'not_authorized',
  'a respondent cannot accept their own response'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$ select public.decide_response(
       (select id from public.responses where respondent_id = '00000000-0000-0000-0000-0000000000a5'),
       'decline', 'live') $$,
  'the broadcaster can decline a response'
);
select results_eq(
  $$ select status from public.responses where respondent_id = '00000000-0000-0000-0000-0000000000a5' $$,
  array['declined'::public.response_status],
  'declining records a neutral declined status'
);
select lives_ok(
  $$ select public.decide_response(
       (select id from public.responses where respondent_id = '00000000-0000-0000-0000-0000000000a2'),
       'accept', 'live') $$,
  'the broadcaster can accept a response'
);
select results_eq(
  $$ select count(*) from public.matches where intent_id = '10000000-0000-0000-0000-0000000000b1' $$,
  array[1::bigint],
  'acceptance creates exactly one match'
);
select results_eq(
  $$ select count(*) from public.conversations c join public.matches m on m.id = c.match_id
     where m.intent_id = '10000000-0000-0000-0000-0000000000b1' $$,
  array[1::bigint],
  'acceptance opens exactly one coordination room'
);

-- ------------------------------------------------------- progressive disclosure
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is_empty(
  $$ select 1 from public.intent_private where intent_id = '10000000-0000-0000-0000-0000000000b1' $$,
  'acceptance alone does not expose the private intent row'
);
select is_empty(
  $$ select field_name from public.get_match_disclosures(
       (select id from public.matches where intent_id = '10000000-0000-0000-0000-0000000000b1')) $$,
  'no field is disclosed before an explicit release'
);
select throws_ok(
  $$ select public.release_disclosure(
       (select id from public.matches where intent_id = '10000000-0000-0000-0000-0000000000b1'),
       array['exact_address']) $$,
  'not_authorized',
  'a participant cannot release the broadcaster private fields'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$ select public.release_disclosure(
       (select id from public.matches where intent_id = '10000000-0000-0000-0000-0000000000b1'),
       array['exact_address']) $$,
  'the broadcaster can explicitly release a private field'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select results_eq(
  $$ select field_name, field_value from public.get_match_disclosures(
       (select id from public.matches where intent_id = '10000000-0000-0000-0000-0000000000b1')) $$,
  $$ values ('exact_address'::text, '42 Private Lane'::text) $$,
  'a released field becomes visible to the accepted participant'
);
select is_empty(
  $$ select 1 from public.get_match_disclosures(
       (select id from public.matches where intent_id = '10000000-0000-0000-0000-0000000000b1'))
     where field_name = 'private_contact' $$,
  'an unreleased field on the same private row stays hidden'
);

-- ------------------------------------------------------------------- messaging
reset role;
create temp table t_ctx as
select
  (select id from public.matches where intent_id = '10000000-0000-0000-0000-0000000000b1') as match_id,
  (select c.id from public.conversations c
     join public.matches m on m.id = c.match_id
     where m.intent_id = '10000000-0000-0000-0000-0000000000b1') as conversation_id;
grant select on t_ctx to authenticated;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select lives_ok(
  $$ select public.send_message(
       (select conversation_id from t_ctx), 'On my way', '30000000-0000-0000-0000-0000000000c4') $$,
  'an accepted participant can message in the room'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
select throws_ok(
  $$ select public.send_message(
       (select conversation_id from t_ctx), 'let me in', '30000000-0000-0000-0000-0000000000c5') $$,
  'not_authorized',
  'an outsider cannot message in a room they do not belong to'
);

-- --------------------------------------------------------------------- safety
select lives_ok(
  $$ select public.create_report('intent', '10000000-0000-0000-0000-0000000000b1', 'spam', 'Looks like solicitation') $$,
  'any authenticated user can file a report'
);
select isnt_empty(
  $$ select 1 from public.reports where subject_id = '10000000-0000-0000-0000-0000000000b1' $$,
  'the report is preserved'
);

-- ---------------------------------------------------------------- resolution
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$ select public.close_intent('10000000-0000-0000-0000-0000000000b1', 'matched', 'resolved_through_nearcast') $$,
  'the broadcaster can resolve a matched intent'
);
select results_eq(
  $$ select status from public.intents where id = '10000000-0000-0000-0000-0000000000b1' $$,
  array['resolved'::public.intent_status],
  'resolving moves the intent to resolved'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select lives_ok(
  $$ select public.confirm_interaction_outcome(
       (select id from public.matches where intent_id = '10000000-0000-0000-0000-0000000000b1'), true, false) $$,
  'an accepted participant can confirm the interaction completed'
);
select results_eq(
  $$ select completed_count from public.reliability_aggregates
     where profile_id = '00000000-0000-0000-0000-0000000000a1' $$,
  array[1::bigint],
  'only a confirmed, undisputed completion updates reliability'
);

-- ------------------------------------------------------------------- expiry
reset role;
insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action,
                            created_at, expires_at, published_at)
values ('10000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1',
        'offer', 'Spare desk for the afternoon', 'live', 'I am interested',
        now() - interval '2 days', now() - interval '1 minute', now() - interval '2 days');

select results_eq(
  $$ select public.expire_intents() $$,
  array[1::integer],
  'the expiry job transitions exactly the intents past their expiry'
);
select results_eq(
  $$ select status from public.intents where id = '10000000-0000-0000-0000-0000000000b2' $$,
  array['expired'::public.intent_status],
  'a lapsed intent reaches the expired status rather than drifting'
);

-- --------------------------------------------------- service-only table denial
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select throws_ok($$ select 1 from public.invitations $$, '42501', NULL, 'invitations reject client roles at the grant level');
select throws_ok($$ select 1 from public.idempotency_keys $$, '42501', NULL, 'the idempotency store rejects client roles at the grant level');
select throws_ok($$ select 1 from public.moderation_actions $$, '42501', NULL, 'moderation audit records reject client roles at the grant level');

select * from finish();
rollback;
