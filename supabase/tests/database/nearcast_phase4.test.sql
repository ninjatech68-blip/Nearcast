-- Phase 4 start: account deletion and retention.
-- Deletion removes or anonymizes the person's data while preserving safety
-- evidence and the other party's history; retention applies the Doc 04 table.
begin;

create extension if not exists pgtap with schema extensions;
select plan(26);

-- ---------------------------------------------------------------- structure
select has_table('public', 'account_deletions', 'suppression record table exists');
select has_column('public', 'profiles', 'deleted_at', 'profiles carry a deletion mark');
select has_function('public', 'delete_account', array['text'], 'account deletion exists');
select has_function('public', 'apply_retention_policy', array[]::text[], 'retention job exists');

-- ---------------------------------------------------------------- fixtures
delete from public.profiles;
delete from auth.users;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'leaver@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stayer@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name, city) values
  ('00000000-0000-0000-0000-0000000000c1', 'Lata Leaver', 'Bengaluru'),
  ('00000000-0000-0000-0000-0000000000c2', 'Sami Stayer', 'Bengaluru');

insert into public.profile_private (profile_id, phone_e164)
values ('00000000-0000-0000-0000-0000000000c1', '+911234567890');

-- Lata owns a live intent with private details, and a draft.
insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action, expires_at, published_at)
values
  ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1',
   'request', 'Need a lift on Saturday', 'live', 'Offer help', now() + interval '3 days', now()),
  ('10000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c1',
   'offer', 'Draft never published', 'draft', 'I am interested', now() + interval '3 days', null);
insert into public.intent_private (intent_id, exact_address, private_contact)
values ('10000000-0000-0000-0000-0000000000c1', '9 Hidden Row', '+919999999999');
insert into public.intent_reach (intent_id, level)
values ('10000000-0000-0000-0000-0000000000c1', 'adjacent_network');

-- Sami owns a live intent; Lata is delivered, confirmed, and matched on it.
insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action, expires_at, published_at)
values ('10000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c2',
        'plan', 'Morning run group', 'live', 'Request to join', now() + interval '3 days', now());
insert into public.intent_confirmations (intent_id, confirmer_id)
values ('10000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c1');
insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text)
values ('10000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c1',
        'adjacent_trust_connection', 'Shared through one trusted connection');
insert into public.responses (id, intent_id, respondent_id, message, status)
values ('40000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000c3',
        '00000000-0000-0000-0000-0000000000c1', 'Count me in every Tuesday', 'accepted');
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id)
values ('50000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000c3',
        '40000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2',
        '00000000-0000-0000-0000-0000000000c1');
insert into public.conversations (id, match_id)
values ('60000000-0000-0000-0000-0000000000c1', '50000000-0000-0000-0000-0000000000c1');
insert into public.messages (conversation_id, sender_id, body)
values
  ('60000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'My number is 12345'),
  ('60000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2', 'See you there');

-- Lata filed a safety report; the evidence must outlive her account.
insert into public.reports (reporter_id, subject_type, subject_id, reason_code)
values ('00000000-0000-0000-0000-0000000000c1', 'intent', '10000000-0000-0000-0000-0000000000c3', 'spam');

-- ------------------------------------------------------------- guard rails
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select throws_ok(
  $$ select public.delete_account('yes please') $$,
  'invalid_input',
  'deletion demands the exact confirmation word'
);

-- --------------------------------------------------------------- deletion
select lives_ok(
  $$ select public.delete_account('DELETE') $$,
  'the account owner can delete with confirmation'
);

reset role;
select results_eq(
  $$ select display_name, city from public.profiles where id = '00000000-0000-0000-0000-0000000000c1' $$,
  $$ values ('Deleted member'::text, null::text) $$,
  'the profile is anonymized, not fabricated'
);
select isnt_empty(
  $$ select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000c1' and deleted_at is not null $$,
  'the deletion mark is set'
);
select is_empty(
  $$ select 1 from public.profile_private where profile_id = '00000000-0000-0000-0000-0000000000c1' $$,
  'private contact data is deleted'
);
select results_eq(
  $$ select status from public.intents where id = '10000000-0000-0000-0000-0000000000c1' $$,
  array['withdrawn'::public.intent_status],
  'the live intent is withdrawn'
);
select is_empty(
  $$ select 1 from public.intents where id = '10000000-0000-0000-0000-0000000000c2' $$,
  'the unpublished draft is deleted entirely'
);
select is_empty(
  $$ select 1 from public.intent_private
     where intent_id = '10000000-0000-0000-0000-0000000000c1'
       and (exact_address is not null or private_contact is not null) $$,
  'exact location and contact fields on owned intents are cleared'
);
select is_empty(
  $$ select 1 from public.intent_confirmations where confirmer_id = '00000000-0000-0000-0000-0000000000c1' $$,
  'origin confirmations no longer count a deleted account'
);
select is_empty(
  $$ select 1 from public.intent_deliveries where recipient_id = '00000000-0000-0000-0000-0000000000c1' $$,
  'deliveries targeting the deleted account are removed'
);
select results_eq(
  $$ select message from public.responses where id = '40000000-0000-0000-0000-0000000000c1' $$,
  array['Deleted by the account owner'::text],
  'an accepted response is redacted, preserving the match record'
);
select results_eq(
  $$ select body from public.messages
     where conversation_id = '60000000-0000-0000-0000-0000000000c1'
       and sender_id = '00000000-0000-0000-0000-0000000000c1' $$,
  array['Message deleted with the account'::text],
  'messages the person sent are redacted'
);
select results_eq(
  $$ select body from public.messages
     where conversation_id = '60000000-0000-0000-0000-0000000000c1'
       and sender_id = '00000000-0000-0000-0000-0000000000c2' $$,
  array['See you there'::text],
  'the other party keeps their own messages'
);
select isnt_empty(
  $$ select 1 from public.reports where reporter_id = '00000000-0000-0000-0000-0000000000c1' $$,
  'safety evidence the person filed is preserved'
);
select isnt_empty(
  $$ select 1 from public.account_deletions where profile_id = '00000000-0000-0000-0000-0000000000c1' $$,
  'a minimal suppression record exists'
);

-- deletion is idempotent
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select lives_ok(
  $$ select public.delete_account('DELETE') $$,
  'repeating the deletion returns the existing record instead of failing'
);
select throws_ok(
  $$ select public.submit_response('10000000-0000-0000-0000-0000000000c3', 'back again',
       '{}'::jsonb, '30000000-0000-0000-0000-0000000000c9') $$,
  'not_authorized',
  'a deleted account can no longer act'
);

-- a deleted profile never re-enters delivery generation
reset role;
select is_empty(
  $$ select 1 from public.profiles p
     where p.deleted_at is not null
       and exists (
         select 1 from public.intent_deliveries d where d.recipient_id = p.id
       ) $$,
  'no delivery row targets a deleted profile'
);

-- ---------------------------------------------------------------- retention
-- An old closed conversation with messages past the 90-day window,
-- and an old resolved intent whose exact location has passed 30 days.
insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action,
                            created_at, expires_at, published_at, resolved_at)
values ('10000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c2',
        'request', 'Old resolved request', 'resolved', 'Offer help',
        now() - interval '200 days', now() - interval '150 days',
        now() - interval '200 days', now() - interval '120 days');
insert into public.intent_private (intent_id, exact_address)
values ('10000000-0000-0000-0000-0000000000c4', '77 Ancient Lane');

update public.conversations set closed_at = now() - interval '120 days'
where id = '60000000-0000-0000-0000-0000000000c1';

select results_eq(
  $$ select (public.apply_retention_policy() ->> 'messages_deleted')::int >= 2 $$,
  array[true],
  'messages past ninety days after closure are deleted'
);
select is_empty(
  $$ select 1 from public.messages where conversation_id = '60000000-0000-0000-0000-0000000000c1' $$,
  'the aged room is empty after retention'
);
select is_empty(
  $$ select 1 from public.intent_private
     where intent_id = '10000000-0000-0000-0000-0000000000c4' and exact_address is not null $$,
  'exact location past thirty days after closure is cleared'
);
select isnt_empty(
  $$ select 1 from public.intent_private where intent_id = '10000000-0000-0000-0000-0000000000c1' $$,
  'recently closed intents keep their row until their window passes'
);

select * from finish();
rollback;
