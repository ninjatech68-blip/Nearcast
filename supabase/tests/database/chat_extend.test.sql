begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ex1@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ex2@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000e1','Caster'),
  ('00000000-0000-0000-0000-0000000000e2','Joiner');
insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000e1','sports','a plan','matched', now()+interval '2 days', now());
insert into public.responses (id, intent_id, respondent_id, message, status) values
  ('aaaaaaaa-0000-0000-0000-0000000000b1','aaaaaaaa-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000e2','in','accepted');
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id) values
  ('bbbbbbbb-0000-0000-0000-0000000000a1','aaaaaaaa-0000-0000-0000-0000000000a1','aaaaaaaa-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000e2');
insert into public.conversations (id, match_id, person_low, person_high, mode, expires_at) values
  ('cccccccc-0000-0000-0000-0000000000a1','bbbbbbbb-0000-0000-0000-0000000000a1',
   least('00000000-0000-0000-0000-0000000000e1'::uuid,'00000000-0000-0000-0000-0000000000e2'::uuid),
   greatest('00000000-0000-0000-0000-0000000000e1'::uuid,'00000000-0000-0000-0000-0000000000e2'::uuid),
   'day', now()+interval '1 day');
update public.matches set conversation_id = 'cccccccc-0000-0000-0000-0000000000a1'
  where id = 'bbbbbbbb-0000-0000-0000-0000000000a1';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';

-- asking for LONGER only proposes
select lives_ok(
  $$ select public.set_conversation_mode('cccccccc-0000-0000-0000-0000000000a1'::uuid, 'week') $$,
  'either party may ask for a longer window');
select is(
  (select mode::text from public.conversations where id = 'cccccccc-0000-0000-0000-0000000000a1'),
  'day', 'asking alone does NOT extend the window');
select is(
  (select proposed_mode::text from public.conversations where id = 'cccccccc-0000-0000-0000-0000000000a1'),
  'week', 'the ask is recorded as a proposal');

-- the proposer cannot be both sides of "you both agreed"
select throws_ok(
  $$ select public.respond_to_mode_proposal('cccccccc-0000-0000-0000-0000000000a1'::uuid, true) $$,
  '42501', 'proposer_cannot_accept',
  'the person who asked cannot accept their own proposal');

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';

-- the other side accepting is what actually changes it
select lives_ok(
  $$ select public.respond_to_mode_proposal('cccccccc-0000-0000-0000-0000000000a1'::uuid, true) $$,
  'the other party may accept');
select is(
  (select mode::text from public.conversations where id = 'cccccccc-0000-0000-0000-0000000000a1'),
  'week', 'both agreeing is what extends the window');
select is(
  (select proposed_mode from public.conversations where id = 'cccccccc-0000-0000-0000-0000000000a1'),
  null, 'the proposal is cleared once answered');

-- pulling your own exposure IN never needs permission
select lives_ok(
  $$ select public.set_conversation_mode('cccccccc-0000-0000-0000-0000000000a1'::uuid, 'day') $$,
  'shortening the window applies immediately');
select is(
  (select mode::text from public.conversations where id = 'cccccccc-0000-0000-0000-0000000000a1'),
  'day', 'a shorter window takes effect without the other side');

reset role;
select finish();
rollback;
