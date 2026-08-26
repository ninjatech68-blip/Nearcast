-- Pre-alpha safety gate: prohibited content, the minors gate, and rate limits
-- on creation and messaging (MUST-075, MUST-076, MUST-077).
--
-- Doc 04 requires prohibited categories to be blocked from creation and routed
-- to moderation, and severe categories to be restricted pending review. A
-- keyword classifier will sometimes be wrong, so a match restricts the intent
-- and records why, rather than destroying what someone wrote.
begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

-- ---------------------------------------------------------------- structure
select has_function(
  'private', 'prohibited_category', array['text'],
  'the prohibited-content classifier exists'
);
select has_column(
  'public', 'profile_private', 'adult_affirmed_at',
  'the adult affirmation is stored with private data, not on the discoverable profile'
);
select hasnt_column(
  'public', 'profiles', 'adult_affirmed_at',
  'and never on the profile others can read'
);

-- --------------------------------------------------------------- classifier
select is(
  private.prohibited_category('Selling a pistol, ammunition included'),
  'weapons',
  'weapons are recognised'
);
select is(
  private.prohibited_category('Need cocaine for the weekend'),
  'illegal_substances',
  'illegal substances are recognised'
);
select is(
  private.prohibited_category('Looking for underage company'),
  'unsafe_minor_contact',
  'unsafe minor contact is recognised'
);
select is(
  private.prohibited_category('Need two volunteers to help move books on Saturday'),
  NULL,
  'an ordinary intent is not flagged'
);
select is(
  private.prohibited_category('Sharing my method for a great filter coffee'),
  NULL,
  'a word that merely contains a banned term is not a match'
);

-- ---------------------------------------------------------------- fixtures
delete from public.profiles;
delete from auth.users;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gate1@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gate2@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name, city) values
  ('00000000-0000-0000-0000-0000000000a1', 'Gita Gate', 'Bengaluru');

insert into public.invitations (token_hash, expires_at)
values (encode(extensions.digest('gate-invite', 'sha256'), 'hex'), now() + interval '7 days');

-- ------------------------------------------------------------- minors gate
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';

select throws_ok(
  $$ select public.redeem_invite('gate-invite', 'Ana Applicant', false) $$,
  '22000',
  NULL,
  'an account cannot be created without affirming adulthood'
);

select lives_ok(
  $$ select public.redeem_invite('gate-invite', 'Ana Applicant', true) $$,
  'affirming adulthood creates the profile'
);

reset role;
select isnt_empty(
  $$ select 1 from public.profile_private
     where profile_id = '00000000-0000-0000-0000-0000000000a2' and adult_affirmed_at is not null $$,
  'the affirmation is recorded as evidence, without storing a date of birth'
);

-- ------------------------------------------------------ prohibited content
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action, expires_at)
values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1',
   'offer', 'Selling a rifle with ammunition', 'draft', 'I am interested', now() + interval '3 days'),
  ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1',
   'request', 'Need help carrying a bookshelf upstairs', 'draft', 'Offer help', now() + interval '3 days');

select lives_ok(
  $$ select public.publish_intent('10000000-0000-0000-0000-0000000000a1', 1, 'adjacent_network', false, false,
       '90000000-0000-0000-0000-0000000000a1') $$,
  'publishing a prohibited intent does not error in the caller''s face'
);

reset role;
select results_eq(
  $$ select status, restricted_from from public.intents where id = '10000000-0000-0000-0000-0000000000a1' $$,
  $$ values ('restricted'::public.intent_status, 'live'::public.intent_status) $$,
  'it is restricted rather than published, and the safe state is kept for restoration'
);
select isnt_empty(
  $$ select 1 from public.intent_events
     where intent_id = '10000000-0000-0000-0000-0000000000a1'
       and event_type = 'restricted_pending_review'
       and actor_id is null
       and metadata ->> 'category' = 'weapons' $$,
  'the restriction is routed to moderation as a system event naming the category'
);
select is_empty(
  $$ select 1 from public.intent_deliveries where intent_id = '10000000-0000-0000-0000-0000000000a1' $$,
  'a restricted intent reaches nobody'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$ select public.publish_intent('10000000-0000-0000-0000-0000000000a2', 1, 'adjacent_network', false, false,
       '90000000-0000-0000-0000-0000000000a2') $$,
  'an ordinary intent publishes normally'
);
reset role;
select results_eq(
  $$ select status from public.intents where id = '10000000-0000-0000-0000-0000000000a2' $$,
  array['live'::public.intent_status],
  'and goes live'
);

-- An edit must not be a way around the check.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$ select public.update_intent('10000000-0000-0000-0000-0000000000a2', 2,
       '{"statement":"Actually selling a shotgun"}'::jsonb) $$,
  'editing into prohibited content is accepted by the caller'
);
reset role;
select results_eq(
  $$ select status from public.intents where id = '10000000-0000-0000-0000-0000000000a2' $$,
  array['restricted'::public.intent_status],
  'but restricts the intent, so editing is not a way past the check'
);

-- ------------------------------------------------------------ rate limits
-- Creation: the cap is per hour, counted on published intents.
insert into public.intents (broadcaster_id, primitive, statement, status, response_action, expires_at, published_at)
select '00000000-0000-0000-0000-0000000000a1', 'request', 'Filler intent ' || generation,
       'live', 'Offer help', now() + interval '3 days', now()
from generate_series(1, 12) as generation;

insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action, expires_at)
values ('10000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1',
        'request', 'One intent too many', 'draft', 'Offer help', now() + interval '3 days');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok(
  $$ select public.publish_intent('10000000-0000-0000-0000-0000000000a3', 1, 'adjacent_network', false, false,
       '90000000-0000-0000-0000-0000000000a3') $$,
  '53400',
  NULL,
  'publishing is rate limited, so one account cannot flood the network'
);
reset role;

-- Messaging: the flood vector inside an open room.
insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action, expires_at, published_at)
values ('10000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a1',
        'plan', 'Coordination room fixture', 'matched', 'Request to join', now() + interval '3 days', now());
insert into public.responses (id, intent_id, respondent_id, message, status)
values ('40000000-0000-0000-0000-0000000000a4', '10000000-0000-0000-0000-0000000000a4',
        '00000000-0000-0000-0000-0000000000a2', 'Happy to join', 'accepted');
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id)
values ('50000000-0000-0000-0000-0000000000a4', '10000000-0000-0000-0000-0000000000a4',
        '40000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-0000000000a2');
insert into public.conversations (id, match_id)
values ('60000000-0000-0000-0000-0000000000a4', '50000000-0000-0000-0000-0000000000a4');
insert into public.messages (conversation_id, sender_id, body)
select '60000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a1', 'Message ' || generation
from generate_series(1, 61) as generation;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok(
  $$ select public.send_message('60000000-0000-0000-0000-0000000000a4', 'One message too many',
       '90000000-0000-0000-0000-0000000000a4') $$,
  '53400',
  NULL,
  'messaging is rate limited inside an open room'
);
reset role;

select * from finish();
rollback;
