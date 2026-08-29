begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

select has_function('public','my_circles','list my circles');
select has_function('public','create_circle','create one');
select has_function('public','add_to_circle','vouch someone in');
select has_function('public','remove_from_circle','remove them');
select has_function('public','vouches_for_me','see who vouches for me');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','g1@x','',now(),now()),
  ('00000000-0000-0000-0000-00000000c002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','g2@x','',now(),now()),
  ('00000000-0000-0000-0000-00000000c003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','g3@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000c001','Me Owner'),
  ('00000000-0000-0000-0000-00000000c002','Riya Mehta'),
  ('00000000-0000-0000-0000-00000000c003','Stranger Sam');

-- G1 owns a circle
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-00000000c001","role":"authenticated"}';
select lives_ok($$ select public.create_circle('badminton crew') $$, 'create a circle');
select is((select count(*)::int from public.my_circles()), 1, 'it shows up (one row, no members yet)');

-- cannot add G2 without a receipt
select throws_ok(
  format($$ select public.add_to_circle(%L, '00000000-0000-0000-0000-00000000c002') $$,
    (select circle_id from public.my_circles() limit 1)),
  '42501', 'needs_receipt',
  'vouching is locked without a receipt together'
);
reset role;

-- give G1 and G2 a mutual receipt on a past plan
insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at)
values ('10000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000c001','sports','x','matched', now()+interval '1 day', now()-interval '3 days');
insert into public.intent_context (intent_id, approximate_place, starts_at) values ('10000000-0000-0000-0000-00000000c001','indiranagar', now()-interval '2 days');
insert into public.responses (id,intent_id,respondent_id,message,status) values ('20000000-0000-0000-0000-00000000c001','10000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000c002','in','accepted');
insert into public.matches (intent_id,response_id,broadcaster_id,participant_id) values ('10000000-0000-0000-0000-00000000c001','20000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000c002');
insert into public.presence_reports (intent_id,reporter_id,subject_id,report) values
  ('10000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000c002','showed'),
  ('10000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000c002','00000000-0000-0000-0000-00000000c001','showed');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-00000000c001","role":"authenticated"}';
select lives_ok(
  format($$ select public.add_to_circle(%L, '00000000-0000-0000-0000-00000000c002') $$,
    (select circle_id from public.my_circles() limit 1)),
  'with a receipt, vouching works'
);
select is((select member_first_name from public.my_circles() where member_id is not null limit 1), 'Riya', 'the member shows with their name');
select throws_ok(
  format($$ select public.add_to_circle(%L, '00000000-0000-0000-0000-00000000c001') $$,
    (select circle_id from public.my_circles() limit 1)),
  '23514', 'cannot_add_self', 'you cannot add yourself'
);
reset role;

-- G2 sees G1 vouches for them; but cannot read G1's circle directly
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-00000000c002","role":"authenticated"}';
select is((select count(*)::int from public.vouches_for_me()), 1, 'G2 sees one voucher');
select is((select voucher_first_name from public.vouches_for_me() limit 1), 'Me', 'named by the voucher (never the circle)');
select is_empty($$ select * from public.circle_members where member_id='00000000-0000-0000-0000-00000000c002' $$,
  'but G2 cannot read the circle_members row directly (RLS)');
reset role;

-- remove
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-00000000c001","role":"authenticated"}';
select lives_ok(
  format($$ select public.remove_from_circle(%L, '00000000-0000-0000-0000-00000000c002') $$,
    (select circle_id from public.my_circles() limit 1)),
  'the owner can remove a member'
);
reset role;

select * from finish();
rollback;
