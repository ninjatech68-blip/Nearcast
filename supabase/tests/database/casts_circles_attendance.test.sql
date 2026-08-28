begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

-- ---------------------------------------------------------------
-- shape
-- ---------------------------------------------------------------
select has_table('public', 'circles', 'circles table exists');
select has_table('public', 'circle_members', 'circle membership has its own table');
select has_table('public', 'presence_reports', 'presence reports have their own table');
select hasnt_table('public', 'intent_private', 'the exact-spot table is gone with the feature');
select hasnt_table('public', 'match_disclosures', 'staged private-field release is gone with it');
select has_function('public', 'attendance_outcome', array['uuid', 'uuid', 'timestamptz'],
  'the attendance rules are enforced in the database, not only the client');

-- ---------------------------------------------------------------
-- fixtures: a caster and two joiners on a plan that started two days
-- ago, so the 24h confirmation window has closed.
-- ---------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','caster@nearcast.local','',now(),now()),
  ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','joiner-a@nearcast.local','',now(),now()),
  ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','joiner-b@nearcast.local','',now(),now()),
  ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stranger@nearcast.local','',now(),now());

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-000000000001','Piyush Sharma'),
  ('00000000-0000-0000-0000-000000000002','Aarav Rao'),
  ('00000000-0000-0000-0000-000000000003','Riya Mehta'),
  ('00000000-0000-0000-0000-000000000004','Mira Sen');

insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at, slots_wanted)
values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','sports',
        'badminton after work. need two.','live', now() + interval '2 days', now(), 2);
insert into public.intent_context (intent_id, approximate_place, starts_at)
values ('10000000-0000-0000-0000-000000000001','indiranagar', now() - interval '2 days');
insert into public.intent_reach (intent_id, level)
values ('10000000-0000-0000-0000-000000000001','adjacent_network');

insert into public.responses (id, intent_id, respondent_id, message) values
  ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','in'),
  ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','in'),
  ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','in');

-- ---------------------------------------------------------------
-- slots: a cast fills, and stays live until it does
-- ---------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

select lives_ok(
  $$ select public.accept_response('20000000-0000-0000-0000-000000000001','live') $$,
  'the caster can accept the first joiner'
);
select results_eq(
  $$ select status::text from public.intents where id = '10000000-0000-0000-0000-000000000001' $$,
  array['live'::text],
  'one seat of two filled leaves the cast live, so it stays in other feeds'
);

select lives_ok(
  $$ select public.accept_response('20000000-0000-0000-0000-000000000002','live') $$,
  'the caster can accept the second joiner'
);
select results_eq(
  $$ select status::text from public.intents where id = '10000000-0000-0000-0000-000000000001' $$,
  array['matched'::text],
  'the seat that fills the cast closes it'
);

-- the second seat closed the cast, so the third ask is refused on the
-- status check before it ever reaches the ceiling. either way it is
-- refused; this asserts the reason it actually gives.
select throws_ok(
  $$ select public.accept_response('20000000-0000-0000-0000-000000000003','live') $$,
  '40001',
  'stale_intent_state',
  'a third accept on a two-slot cast is refused — the cast already closed'
);

-- ---------------------------------------------------------------
-- attendance: the five outcomes
-- ---------------------------------------------------------------
reset role;

select is(
  public.attendance_outcome('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'),
  'unverified'::public.attendance_result,
  'silence never creates a fact — nobody reported, nothing happened'
);

insert into public.presence_reports (intent_id, reporter_id, subject_id, report)
values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','showed');
select is(
  public.attendance_outcome('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'),
  'receipt'::public.attendance_result,
  'unanimous showed is a receipt'
);

insert into public.presence_reports (intent_id, reporter_id, subject_id, report)
values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','no_show');
select is(
  public.attendance_outcome('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'),
  'disputed'::public.attendance_result,
  'conflicting reports go to no-penalty, never to a flake'
);

insert into public.presence_reports (intent_id, reporter_id, subject_id, report)
values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','no_show');
select is(
  public.attendance_outcome('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003'),
  'flake'::public.attendance_result,
  'unanimous absence after the window closes is a flake'
);

update public.matches set cancelled_at = (now() - interval '2 days') - interval '5 hours'
where intent_id = '10000000-0000-0000-0000-000000000001'
  and participant_id = '00000000-0000-0000-0000-000000000003';
select is(
  public.attendance_outcome('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003'),
  'withdrawn'::public.attendance_result,
  'backing out before the cutoff is withdrawal, never a flake'
);

-- ---------------------------------------------------------------
-- privacy: the denied paths
-- ---------------------------------------------------------------
insert into public.circles (id, owner_id, name)
values ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','badminton gang');
insert into public.circle_members (circle_id, member_id)
values ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
select results_eq(
  $$ select count(*) from public.circle_members $$,
  array[1::bigint],
  'the circle owner can read their own membership list'
);

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
select is_empty(
  $$ select circle_id from public.circle_members $$,
  'a MEMBER cannot see that they are in a circle — membership is never disclosed'
);
select is_empty(
  $$ select id from public.circles $$,
  'a member cannot see the circle itself either'
);
select is_empty(
  $$ select report from public.presence_reports $$,
  'the SUBJECT of a report cannot see who reported them'
);
select is(
  public.attendance_outcome('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'),
  'disputed'::public.attendance_result,
  'the outcome stays readable even though the reporters do not'
);

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}';
select is_empty(
  $$ select circle_id from public.circle_members $$,
  'an outsider sees no membership at all'
);

-- vouching for someone you have no receipt with is refused by policy
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok(
  $$ insert into public.circle_members (circle_id, member_id)
     values ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004') $$,
  '42501',
  null,
  'vouching for someone you have never made a plan with is refused'
);

select * from finish();
rollback;
