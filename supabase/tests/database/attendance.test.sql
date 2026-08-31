begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select has_function('public', 'report_presence', 'presence can be reported');
select has_function('public', 'plans_to_report', 'and I can see who I owe a report on');
select has_function('public', 'my_receipts', 'and my own outcomes');
select has_function('public', 'shared_history_with', 'and shared history with a person');

-- caster A + joiner B, a plan that STARTED two days ago (window open path)
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000E1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ea@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000E2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','eb@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000E3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ec@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000E1','Aarav Rao'),
  ('00000000-0000-0000-0000-0000000000E2','Riya Mehta'),
  ('00000000-0000-0000-0000-0000000000E3','Nosy Stranger');

insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at)
values ('10000000-0000-0000-0000-0000000000E1','00000000-0000-0000-0000-0000000000E1','sports','badminton.','matched', now() + interval '1 day', now() - interval '3 days');
insert into public.intent_context (intent_id, approximate_place, starts_at)
values ('10000000-0000-0000-0000-0000000000E1','indiranagar', now() - interval '2 days');
insert into public.responses (id, intent_id, respondent_id, message, status)
values ('20000000-0000-0000-0000-0000000000E1','10000000-0000-0000-0000-0000000000E1','00000000-0000-0000-0000-0000000000E2','in','accepted');
insert into public.matches (intent_id, response_id, broadcaster_id, participant_id)
values ('10000000-0000-0000-0000-0000000000E1','20000000-0000-0000-0000-0000000000E1','00000000-0000-0000-0000-0000000000E1','00000000-0000-0000-0000-0000000000E2');

-- both owe a report on the other
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000E1","role":"authenticated"}';
select is((select count(*)::int from public.plans_to_report()), 1, 'A owes one report');
select is((select subject_first_name from public.plans_to_report() limit 1), 'Riya', 'on Riya');
select lives_ok(
  $$ select public.report_presence('10000000-0000-0000-0000-0000000000E1','00000000-0000-0000-0000-0000000000E2','showed') $$,
  'A reports B showed'
);
select is((select count(*)::int from public.plans_to_report()), 0, 'and no longer owes it');
select throws_ok(
  $$ select public.report_presence('10000000-0000-0000-0000-0000000000E1','00000000-0000-0000-0000-0000000000E1','showed') $$,
  '23514', 'cannot_report_self', 'nobody reports themselves'
);
reset role;

-- B reports A showed too → both are receipts
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000E2","role":"authenticated"}';
select public.report_presence('10000000-0000-0000-0000-0000000000E1','00000000-0000-0000-0000-0000000000E1','showed');
select is(
  (select outcome::text from public.my_receipts() limit 1),
  'receipt',
  'B earns a receipt once both reported showed'
);
select is(
  (select other_names from public.my_receipts() limit 1),
  array['Aarav'],
  'and the receipt names who else was there'
);
reset role;

-- shared history between A and B: one plan, one mutual receipt
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000E1","role":"authenticated"}';
select is(
  (select plans from public.shared_history_with('00000000-0000-0000-0000-0000000000E2')),
  1, 'A and B share one past plan'
);
select is(
  (select receipts from public.shared_history_with('00000000-0000-0000-0000-0000000000E2')),
  1, 'and one mutual receipt'
);
reset role;

-- a stranger cannot report on a plan they were not in
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000E3","role":"authenticated"}';
select throws_ok(
  $$ select public.report_presence('10000000-0000-0000-0000-0000000000E1','00000000-0000-0000-0000-0000000000E1','no_show') $$,
  '42501', 'not_a_party', 'an outsider cannot report on a plan they were not in'
);
reset role;

select * from finish();
rollback;
