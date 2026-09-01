begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Every UPDATE policy here answers "is this my row?" and none of them answers
-- "is this my column?". These are the four places where that gap let the owner
-- of a row rewrite the key that decides what the row means. Each assertion
-- below fails against the schema as it stood before
-- 20260831090000_column_scoped_write_grants.sql.

-- A casts. D was delivered A's cast and joined it. C's cast was never
-- delivered to D. B was never anywhere near either.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000A1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000B1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000C1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000D1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000A1','Aarav Rao'),
  ('00000000-0000-0000-0000-0000000000B1','Bhavna Iyer'),
  ('00000000-0000-0000-0000-0000000000C1','Chetan Das'),
  ('00000000-0000-0000-0000-0000000000D1','Divya Nair');

insert into public.intents (id, broadcaster_id, primitive, statement, status, response_action, expires_at, published_at) values
  ('00000000-0000-0000-0000-00000000CA51','00000000-0000-0000-0000-0000000000A1','plan',
   'badminton after work.','live','Join', now() + interval '2 days', now()),
  ('00000000-0000-0000-0000-00000000CA52','00000000-0000-0000-0000-0000000000C1','plan',
   'chetan private cast, never delivered to divya.','live','Join', now() + interval '2 days', now());

insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text) values
  ('00000000-0000-0000-0000-00000000CA51','00000000-0000-0000-0000-0000000000D1',
   'adjacent_trust_connection','shared through one trusted connection');

insert into public.responses (id, intent_id, respondent_id, message) values
  ('00000000-0000-0000-0000-00000000E5B1','00000000-0000-0000-0000-00000000CA51',
   '00000000-0000-0000-0000-0000000000D1','count me in');

insert into public.matches (intent_id, response_id, broadcaster_id, participant_id) values
  ('00000000-0000-0000-0000-00000000CA51','00000000-0000-0000-0000-00000000E5B1',
   '00000000-0000-0000-0000-0000000000A1','00000000-0000-0000-0000-0000000000D1');

-- a moderator restricts D
update public.profiles set is_restricted = true where id = '00000000-0000-0000-0000-0000000000D1';

-- D files an honest no_show about A, who was in the plan with them
insert into public.presence_reports (intent_id, reporter_id, subject_id, report) values
  ('00000000-0000-0000-0000-00000000CA51','00000000-0000-0000-0000-0000000000D1',
   '00000000-0000-0000-0000-0000000000A1','no_show');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000D1","role":"authenticated"}';

-- ---------------------------------------------------------------
-- the escalations are refused
-- ---------------------------------------------------------------

select is_empty(
  $$ select statement from public.intents where id = '00000000-0000-0000-0000-00000000CA52' $$,
  'to begin with, D cannot read a cast that was never delivered to them'
);

select throws_ok(
  $$ update public.intent_deliveries set intent_id = '00000000-0000-0000-0000-00000000CA52' where recipient_id = auth.uid() $$,
  '42501', null,
  'a recipient cannot repoint their delivery row at another cast'
);

select throws_ok(
  $$ update public.responses set intent_id = '00000000-0000-0000-0000-00000000CA52' where respondent_id = auth.uid() $$,
  '42501', null,
  'a respondent cannot repoint their response at another cast'
);

select is_empty(
  $$ select statement from public.intents where id = '00000000-0000-0000-0000-00000000CA52' $$,
  'and so the cast stays unreadable after both attempts'
);

select throws_ok(
  $$ update public.profiles set is_restricted = false where id = auth.uid() $$,
  '42501', null,
  'a restricted account cannot clear its own restriction'
);

select results_eq(
  $$ select is_restricted from public.profiles where id = auth.uid() $$,
  array[true],
  'the moderation decision survives the attempt'
);

select throws_ok(
  $$ update public.presence_reports set subject_id = '00000000-0000-0000-0000-0000000000B1' where reporter_id = auth.uid() $$,
  '42501', null,
  'a reporter cannot move their no_show onto someone who was never in the plan'
);

select results_eq(
  $$ select subject_id from public.presence_reports where reporter_id = auth.uid() $$,
  array['00000000-0000-0000-0000-0000000000A1'::uuid],
  'the verdict still points at the person it was filed about'
);

-- ---------------------------------------------------------------
-- everything a person is genuinely entitled to still works
-- ---------------------------------------------------------------

select lives_ok(
  $$ update public.intent_deliveries set hidden_at = now(), feedback = 'not_relevant' where recipient_id = auth.uid() $$,
  'a recipient can still hide a cast and mark it not relevant'
);

select lives_ok(
  $$ update public.profiles set display_name = 'Divya N' where id = auth.uid() $$,
  'a person can still edit their display name'
);

select lives_ok(
  $$ update public.responses set message = 'running ten minutes late' where respondent_id = auth.uid() $$,
  'a respondent can still edit their own message'
);

select lives_ok(
  $$ update public.responses set status = 'withdrawn' where respondent_id = auth.uid() $$,
  'a respondent can still withdraw'
);

select lives_ok(
  $$ update public.presence_reports set report = 'showed' where reporter_id = auth.uid() $$,
  'a reporter can still change their mind about what happened'
);

reset role;

-- ---------------------------------------------------------------
-- and no table is left with a blanket update grant on these columns
-- ---------------------------------------------------------------

select is_empty(
  $$
  select table_name || '.' || column_name
    from information_schema.column_privileges
   where grantee = 'authenticated'
     and privilege_type = 'UPDATE'
     and table_schema = 'public'
     and (table_name, column_name) in (
       ('intent_deliveries','intent_id'), ('intent_deliveries','recipient_id'),
       ('profiles','is_restricted'),
       ('responses','intent_id'), ('responses','respondent_id'),
       ('presence_reports','subject_id'), ('presence_reports','intent_id'),
       ('message_receipts','message_id'), ('message_receipts','recipient_id')
     )
  $$,
  'no key or moderation column on these tables is writable by authenticated'
);

select * from finish();
rollback;
