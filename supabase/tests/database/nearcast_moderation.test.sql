-- Moderation queue and moderator tooling (MUST-074, Doc 04 Moderation States).
--
-- Authorisation comes from app metadata, never user metadata, because user
-- metadata is client-writable. Every action leaves an immutable audit row, and
-- a restriction keeps the safe state so it can be undone.
begin;

create extension if not exists pgtap with schema extensions;
select plan(25);

-- ---------------------------------------------------------------- structure
select has_function('public', 'moderation_queue', array[]::text[], 'the queue exists');
select has_function(
  'public', 'moderate_report', array['uuid', 'text', 'text'],
  'report decisions are a server-owned operation'
);
select has_function(
  'public', 'restore_intent', array['uuid', 'text'],
  'a restriction can be undone'
);
select results_eq(
  $$ select unnest(enum_range(null::public.report_status))::text order by 1 $$,
  $$ values ('actioned'), ('dismissed'), ('escalated'), ('open'), ('restricted') $$,
  'the five documented moderation states exist, and no undocumented sixth'
);

-- ---------------------------------------------------------------- fixtures
delete from public.profiles;
delete from auth.users;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mod@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reporter@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'subject@nearcast.local', '', now(), now());

insert into public.profiles (id, display_name, city) values
  ('00000000-0000-0000-0000-0000000000d1', 'Mo Derator', 'Bengaluru'),
  ('00000000-0000-0000-0000-0000000000d2', 'Rita Reporter', 'Bengaluru'),
  ('00000000-0000-0000-0000-0000000000d3', 'Sam Subject', 'Bengaluru');

-- A live intent that was reported, and one the content check already held.
insert into public.intents (id, broadcaster_id, primitive, statement, status, restricted_from, response_action, expires_at, published_at)
values
  ('10000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d3',
   'offer', 'Reported but ordinary looking', 'live', null, 'I am interested', now() + interval '3 days', now()),
  ('10000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d3',
   'offer', 'Selling a rifle with ammunition', 'restricted', 'live', 'I am interested', now() + interval '3 days', now());
insert into public.intent_events (intent_id, actor_id, event_type, to_status, metadata)
values ('10000000-0000-0000-0000-0000000000d2', null, 'restricted_pending_review', 'restricted',
        jsonb_build_object('category', 'weapons'));

insert into public.reports (id, reporter_id, subject_type, subject_id, reason_code)
values ('70000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2',
        'intent', '10000000-0000-0000-0000-0000000000d1', 'prohibited_goods');

-- ------------------------------------------------------------- authority
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select throws_ok(
  $$ select * from public.moderation_queue() $$,
  '42501',
  NULL,
  'an ordinary member cannot read the moderation queue'
);
select throws_ok(
  $$ select public.moderate_report('70000000-0000-0000-0000-0000000000d1', 'dismiss', 'no_violation') $$,
  '42501',
  NULL,
  'an ordinary member cannot decide a report'
);

-- Authorisation must come from app metadata. User metadata is client-writable,
-- so a claim placed there must not grant anything.
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated","user_metadata":{"role":"moderator"}}';
select throws_ok(
  $$ select * from public.moderation_queue() $$,
  '42501',
  NULL,
  'a moderator claim in user metadata grants nothing'
);

-- ------------------------------------------------------------------ queue
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","app_metadata":{"role":"moderator"}}';
select isnt_empty(
  $$ select 1 from public.moderation_queue() where item_id = '70000000-0000-0000-0000-0000000000d1' $$,
  'an open report is queued for review'
);
select isnt_empty(
  $$ select 1 from public.moderation_queue()
     where item_id = '10000000-0000-0000-0000-0000000000d2' and kind = 'restricted_intent' $$,
  'content the classifier held is queued too, so nothing is restricted and forgotten'
);
select isnt_empty(
  $$ select 1 from public.moderation_queue()
     where item_id = '10000000-0000-0000-0000-0000000000d2' and reason_code = 'weapons' $$,
  'the queue says why the content was held'
);

-- --------------------------------------------------------------- decisions
select lives_ok(
  $$ select public.moderate_report('70000000-0000-0000-0000-0000000000d1', 'dismiss', 'no_violation') $$,
  'a moderator can dismiss a report'
);
reset role;
select results_eq(
  $$ select status from public.reports where id = '70000000-0000-0000-0000-0000000000d1' $$,
  array['dismissed'::public.report_status],
  'the report is marked dismissed'
);
select results_eq(
  $$ select moderator_id, action, reason_code, subject_type from public.moderation_actions
     where report_id = '70000000-0000-0000-0000-0000000000d1' $$,
  $$ values ('00000000-0000-0000-0000-0000000000d1'::uuid, 'dismiss'::text, 'no_violation'::text, 'intent'::text) $$,
  'the decision leaves an audit row naming actor, action, reason and object'
);
select isnt_empty(
  $$ select 1 from public.moderation_actions
     where report_id = '70000000-0000-0000-0000-0000000000d1' and captured_state <> '{}'::jsonb $$,
  'the audit row captures the state at the time of the decision'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","app_metadata":{"role":"moderator"}}';
select throws_ok(
  $$ select public.moderate_report('70000000-0000-0000-0000-0000000000d1', 'dismiss', 'no_violation') $$,
  '40001',
  NULL,
  'a report that has already been decided cannot be decided again'
);
select throws_ok(
  $$ select public.moderate_report('70000000-0000-0000-0000-0000000000d1', 'delete_everything', 'no_violation') $$,
  '22000',
  NULL,
  'an action outside the documented set is refused'
);

-- ------------------------------------------------------- restrict and restore
reset role;
insert into public.reports (id, reporter_id, subject_type, subject_id, reason_code)
values ('70000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d2',
        'intent', '10000000-0000-0000-0000-0000000000d1', 'prohibited_goods');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","app_metadata":{"role":"moderator"}}';
select lives_ok(
  $$ select public.moderate_report('70000000-0000-0000-0000-0000000000d2', 'restrict', 'prohibited_goods') $$,
  'a moderator can restrict the reported intent'
);
reset role;
select results_eq(
  $$ select status, restricted_from from public.intents where id = '10000000-0000-0000-0000-0000000000d1' $$,
  $$ values ('restricted'::public.intent_status, 'live'::public.intent_status) $$,
  'the intent is restricted and its safe state is kept for restoration'
);
select results_eq(
  $$ select status from public.reports where id = '70000000-0000-0000-0000-0000000000d2' $$,
  array['restricted'::public.report_status],
  'and the report moves to the restricted state'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","app_metadata":{"role":"moderator"}}';
select lives_ok(
  $$ select public.restore_intent('10000000-0000-0000-0000-0000000000d1', 'reviewed_no_violation') $$,
  'a restriction can be lifted'
);
reset role;
select results_eq(
  $$ select status, restricted_from from public.intents where id = '10000000-0000-0000-0000-0000000000d1' $$,
  $$ values ('live'::public.intent_status, null::public.intent_status) $$,
  'restoring returns the intent to the state it was restricted from'
);
select isnt_empty(
  $$ select 1 from public.moderation_actions
     where subject_id = '10000000-0000-0000-0000-0000000000d1' and action = 'restore' $$,
  'and the restoration is audited like any other action'
);

-- ------------------------------------------------ what a reporter may learn
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select isnt_empty(
  $$ select 1 from public.reports where id = '70000000-0000-0000-0000-0000000000d1' $$,
  'a reporter can see that their own report exists'
);
select throws_ok(
  $$ select 1 from public.moderation_actions $$,
  '42501',
  NULL,
  'but never the enforcement detail behind it'
);
select throws_ok(
  $$ update public.reports set status = 'dismissed' where id = '70000000-0000-0000-0000-0000000000d1' $$,
  '42501',
  NULL,
  'and cannot decide their own report'
);
reset role;

select * from finish();
rollback;
