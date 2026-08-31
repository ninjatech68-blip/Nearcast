begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- A (caster) posts two casts; B joins both; A accepts both.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000A1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pa@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000B1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pb@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000A1','Aay'),
  ('00000000-0000-0000-0000-0000000000B1','Bee');

insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000A1','sports','badminton','live', now()+interval '2 days', now()),
  ('20000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000A1','food','dinner','live', now()+interval '2 days', now());
-- B must have a delivery to respond; seed both
insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text, score, signals) values
  ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000B1','demo_seed','x',1,'{x}'),
  ('20000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000B1','demo_seed','x',1,'{x}');

-- B responds to both
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000B1","role":"authenticated"}';
select public.respond_to_cast('10000000-0000-0000-0000-0000000000a1'::uuid, 'in for badminton');
select public.respond_to_cast('20000000-0000-0000-0000-0000000000a2'::uuid, 'in for dinner');
reset role;

-- A accepts both
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000A1","role":"authenticated"}';
select public.accept_response((select id from public.responses where intent_id='10000000-0000-0000-0000-0000000000a1'), 'live');
select public.accept_response((select id from public.responses where intent_id='20000000-0000-0000-0000-0000000000a2'), 'live');

-- ONE conversation for the pair, not two
select is(
  (select count(*)::int from public.my_conversations()),
  1, 'two plans with the same person share ONE chat');

-- it knows both plans
select is(
  (select plan_count::int from public.my_conversations() limit 1),
  2, 'the single chat carries both plans');

-- the second accept dropped a system note naming the new plan
select is(
  (select count(*)::int from public.messages m
     join public.conversations c on c.id = m.conversation_id
    where c.person_low = least('00000000-0000-0000-0000-0000000000A1'::uuid,'00000000-0000-0000-0000-0000000000B1'::uuid)
      and m.is_system and m.body like 'you%also on:%'),
  1, 'joining a second plan posts a note into the existing chat');
reset role;

-- B also sees exactly one chat with A
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000B1","role":"authenticated"}';
select is(
  (select count(*)::int from public.my_conversations()),
  1, 'the other side sees the one shared chat too');
reset role;

select finish();
rollback;
