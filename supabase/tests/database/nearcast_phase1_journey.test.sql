-- Functional test of the complete Phase 1 loop, driven exclusively through the
-- public server functions — the same calls the app makes. Two users:
-- Uma broadcasts; Vikram confirms, is delivered, responds, is accepted,
-- coordinates, and confirms completion. Every stage asserts both the outcome
-- and the privacy boundary that must hold at that stage.
begin;

create extension if not exists pgtap with schema extensions;
select plan(25);

-- ---------------------------------------------------------------- fixtures
delete from public.profiles;
delete from auth.users;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'uma@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vikram@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name, city)
values ('00000000-0000-0000-0000-0000000000d1', 'Uma Rao', 'Bengaluru');

insert into public.invitations (token_hash, issued_by, expires_at)
values (encode(extensions.digest('journey-invite', 'sha256'), 'hex'),
        '00000000-0000-0000-0000-0000000000d1', now() + interval '7 days');

-- ------------------------------------------------- stage 1: Vikram joins
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select lives_ok(
  $$ select public.redeem_invite('journey-invite', 'Vikram Iyer', true) $$,
  'stage 1: an invited user joins through redemption'
);

-- ------------------------------------------------- stage 2: Uma drafts and publishes
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';

insert into public.intents (id, broadcaster_id, primitive, statement, response_action, expires_at)
values ('10000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000d1',
        'request', 'Need one person for badminton this evening', 'Request to join',
        now() + interval '8 hours');
insert into public.intent_context (intent_id, approximate_place)
values ('10000000-0000-0000-0000-0000000000d9', 'Indiranagar');
insert into public.intent_private (intent_id, exact_address, private_contact)
values ('10000000-0000-0000-0000-0000000000d9', 'Court 2, 44 Play Lane', '+919900000000');

select lives_ok(
  $$ select public.publish_intent('10000000-0000-0000-0000-0000000000d9', 1, 'adjacent_network',
       true, true, '30000000-0000-0000-0000-0000000000d1') $$,
  'stage 2: the owner publishes the draft at adjacent reach'
);

-- The slug travels inside the shared link; stage it the same way for roles
-- that cannot query the intents table.
reset role;
create temp table t_link as
select share_slug from public.intents where id = '10000000-0000-0000-0000-0000000000d9';
grant select on t_link to anon, authenticated;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select results_eq(
  $$ select status from public.intents where id = '10000000-0000-0000-0000-0000000000d9' $$,
  array['live'::public.intent_status],
  'stage 2: the intent is live'
);

-- ------------------------------------------------- stage 3: anonymous share link
reset role;
set local role anon;
select results_eq(
  $$ select statement, broadcaster_first_name from public.get_public_intent(
       (select share_slug from t_link)) $$,
  $$ values ('Need one person for badminton this evening'::text, 'Uma'::text) $$,
  'stage 3: the anonymous link shows the statement and first name only'
);
select throws_ok(
  $$ select exact_address from public.intent_private
     where intent_id = '10000000-0000-0000-0000-0000000000d9' $$,
  '42501', NULL,
  'stage 3: an anonymous viewer cannot touch the private table at all'
);

-- ------------------------------------------------- stage 4: Vikram confirms origin support
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select results_eq(
  $$ select public.confirm_intent((select share_slug from t_link)) $$,
  array[1::bigint],
  'stage 4: a genuine confirmation counts once'
);

-- ------------------------------------------------- stage 5: delivery with a reason
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select results_eq(
  $$ select public.generate_deliveries('10000000-0000-0000-0000-0000000000d9') $$,
  array[1],
  'stage 5: the confirmation created a trust connection, so Vikram is delivered'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select results_eq(
  $$ select reason_text from public.intent_deliveries
     where intent_id = '10000000-0000-0000-0000-0000000000d9'
       and recipient_id = auth.uid() $$,
  array['Shared through one trusted connection'::text],
  'stage 5: the recipient can read exactly why this reached them'
);
select results_eq(
  $$ select count(*) from public.intents where id = '10000000-0000-0000-0000-0000000000d9' $$,
  array[1::bigint],
  'stage 5: delivery makes the intent readable to the recipient'
);
select is_empty(
  $$ select 1 from public.intent_private where intent_id = '10000000-0000-0000-0000-0000000000d9' $$,
  'stage 5: delivery reveals nothing private'
);

-- ------------------------------------------------- stage 6: Vikram responds
select lives_ok(
  $$ select public.submit_response('10000000-0000-0000-0000-0000000000d9',
       'I play most evenings, happy to join', '{"level":"intermediate"}'::jsonb,
       '30000000-0000-0000-0000-0000000000d2') $$,
  'stage 6: a delivered recipient responds with one qualification'
);

-- ------------------------------------------------- stage 7: Uma accepts
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select lives_ok(
  $$ select public.decide_response(
       (select id from public.responses where intent_id = '10000000-0000-0000-0000-0000000000d9'),
       'accept', 'live') $$,
  'stage 7: the broadcaster accepts the response'
);
select results_eq(
  $$ select status from public.intents where id = '10000000-0000-0000-0000-0000000000d9' $$,
  array['matched'::public.intent_status],
  'stage 7: acceptance moves the intent to matched'
);
select results_eq(
  $$ select count(*) from public.conversations c
     join public.matches m on m.id = c.match_id
     where m.intent_id = '10000000-0000-0000-0000-0000000000d9' $$,
  array[1::bigint],
  'stage 7: exactly one coordination room opens'
);

-- ------------------------------------------------- stage 8: progressive disclosure
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select is_empty(
  $$ select field_name from public.get_match_disclosures(
       (select id from public.matches where intent_id = '10000000-0000-0000-0000-0000000000d9')) $$,
  'stage 8: acceptance alone discloses nothing'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select lives_ok(
  $$ select public.release_disclosure(
       (select id from public.matches where intent_id = '10000000-0000-0000-0000-0000000000d9'),
       array['exact_address']) $$,
  'stage 8: the broadcaster explicitly releases the exact address'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select results_eq(
  $$ select field_value from public.get_match_disclosures(
       (select id from public.matches where intent_id = '10000000-0000-0000-0000-0000000000d9'))
     where field_name = 'exact_address' $$,
  array['Court 2, 44 Play Lane'::text],
  'stage 8: the released address reaches the accepted participant'
);
select is_empty(
  $$ select 1 from public.get_match_disclosures(
       (select id from public.matches where intent_id = '10000000-0000-0000-0000-0000000000d9'))
     where field_name = 'private_contact' $$,
  'stage 8: the phone number on the same row stays hidden'
);

-- ------------------------------------------------- stage 9: coordination
select lives_ok(
  $$ select public.send_message(
       (select c.id from public.conversations c
        join public.matches m on m.id = c.match_id
        where m.intent_id = '10000000-0000-0000-0000-0000000000d9'),
       'See you at 7', '30000000-0000-0000-0000-0000000000d3') $$,
  'stage 9: the participant messages in the room'
);

reset role;
select results_eq(
  $$ select count(*) from public.notification_jobs $$,
  array[3::bigint],
  'stage 9: response, acceptance, and message each queued exactly one notification'
);
select is_empty(
  $$ select 1 from public.notification_jobs
     where idempotency_key ~ 'badminton|Play Lane|9900000000' $$,
  'stage 9: no notification key leaks intent text, address, or phone'
);

-- ------------------------------------------------- stage 10: resolution and trust
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select lives_ok(
  $$ select public.close_intent('10000000-0000-0000-0000-0000000000d9', 'matched',
       'resolved_through_nearcast') $$,
  'stage 10: the broadcaster resolves the matched intent'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select lives_ok(
  $$ select public.confirm_interaction_outcome(
       (select id from public.matches where intent_id = '10000000-0000-0000-0000-0000000000d9'),
       true, false) $$,
  'stage 10: the participant confirms the interaction happened'
);
select results_eq(
  $$ select completed_count, confirmed_count from public.reliability_aggregates
     where profile_id = '00000000-0000-0000-0000-0000000000d1' and context = 'request' $$,
  $$ values (1::bigint, 1::bigint) $$,
  'stage 10: reliability records one confirmed completion as counted evidence'
);
select throws_ok(
  $$ select public.submit_response('10000000-0000-0000-0000-0000000000d9',
       'Too late?', '{}'::jsonb, '30000000-0000-0000-0000-0000000000d4') $$,
  'stale_state',
  'stage 10: a resolved intent refuses new responses'
);

select * from finish();
rollback;
