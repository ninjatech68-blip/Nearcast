begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

select has_function('public', 'decline_response', 'the decline mutation exists');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'first@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'second@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-000000000061', 'Asha Rao'),
  ('00000000-0000-0000-0000-000000000062', 'Dev Mehta'),
  ('00000000-0000-0000-0000-000000000063', 'Mira Sen');

insert into public.intents (
  id, broadcaster_id, primitive, statement, status, response_action,
  expires_at, published_at, share_slug, version
) values (
  '10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000061',
  'request', 'Need two helpers for Saturday', 'live', 'Offer help',
  now() + interval '1 day', now(), '20000000-0000-0000-0000-0000000000c1', 1
);
insert into public.intent_context (intent_id) values ('10000000-0000-0000-0000-0000000000c1');
insert into public.intent_private (intent_id, exact_address, private_contact)
values ('10000000-0000-0000-0000-0000000000c1', '42 Private Lane', '+910000000000');

insert into public.responses (id, intent_id, respondent_id, message, status) values
  ('30000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-000000000062', 'Happy to help', 'pending'),
  ('30000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-000000000063', 'Also free', 'pending');

set local role authenticated;

-- A respondent sees their own response and no one else's.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000062","role":"authenticated"}';

select is(
  (select count(*)::int from public.responses),
  1,
  'a respondent cannot see competing responses'
);

select is(
  (select id from public.responses),
  '30000000-0000-0000-0000-0000000000c1'::uuid,
  'the one visible response is their own'
);

-- The broadcaster sees every response to their own intent.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000061","role":"authenticated"}';

select is(
  (select count(*)::int from public.responses),
  2,
  'the broadcaster reads every response to their intent'
);

-- Only the broadcaster may decide.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000063","role":"authenticated"}';

select throws_ok(
  $$select public.decline_response('30000000-0000-0000-0000-0000000000c1', 'pending')$$,
  '42501', null, 'a non-owner cannot decline a response'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000061","role":"authenticated"}';

select throws_ok(
  $$select public.decline_response('30000000-0000-0000-0000-0000000000c2', 'accepted')$$,
  '40001', null, 'a decision against an unexpected status is refused'
);

select is(
  (select response_status from public.decline_response('30000000-0000-0000-0000-0000000000c2', 'pending')),
  'declined',
  'the broadcaster can decline a pending response'
);

select is(
  (select response_status from public.decline_response('30000000-0000-0000-0000-0000000000c2', 'pending')),
  'declined',
  'declining again confirms the outcome instead of failing'
);

reset role;

select isnt_empty(
  $$select 1 from public.notification_jobs
    where event_type = 'response_declined'
      and recipient_id = '00000000-0000-0000-0000-000000000063'$$,
  'the declined respondent is notified'
);

select is_empty(
  $$select 1 from public.notification_jobs
    where event_type = 'response_declined' and idempotency_key ilike '%Also free%'$$,
  'the decline notification carries no message text'
);

-- A declined respondent learns the outcome and nothing more.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000063","role":"authenticated"}';

select is(
  (select status::text from public.responses where id = '30000000-0000-0000-0000-0000000000c2'),
  'declined',
  'the declined respondent sees a neutral declined status'
);

select hasnt_column('public', 'responses', 'decline_reason',
  'there is no column in which a private reason could be stored');

-- Acceptance.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000061","role":"authenticated"}';

select isnt_empty(
  $$select 1 from public.accept_response('30000000-0000-0000-0000-0000000000c1', 'live')$$,
  'the broadcaster can accept a pending response'
);

select is(
  (select count(*)::int from public.accept_response('30000000-0000-0000-0000-0000000000c1', 'matched')),
  1,
  'an identical retry returns the existing match rather than creating a second'
);

reset role;

select is(
  (select count(*)::int from public.matches
   where intent_id = '10000000-0000-0000-0000-0000000000c1'),
  1,
  'exactly one match exists for the intent'
);

select is(
  (select count(*)::int from public.conversations c
   join public.matches m on m.id = c.match_id
   where m.intent_id = '10000000-0000-0000-0000-0000000000c1'),
  1,
  'exactly one conversation exists for the intent'
);

select isnt_empty(
  $$select 1 from public.notification_jobs
    where event_type = 'response_accepted'
      and recipient_id = '00000000-0000-0000-0000-000000000062'$$,
  'the accepted respondent is notified'
);

-- No private field is released by acceptance alone.
select is_empty(
  $$select 1 from public.match_disclosures$$,
  'acceptance releases no private field on its own'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000062","role":"authenticated"}';

select is_empty(
  $$select 1 from public.intent_private
    where intent_id = '10000000-0000-0000-0000-0000000000c1'$$,
  'an accepted participant still cannot read the private details'
);

select * from finish();
rollback;
