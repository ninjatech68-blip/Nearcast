begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select has_function('public','plan_detail','plan detail reader exists');
select has_function('public','edit_cast','edit-cast exists');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pdc@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pdj@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pdo@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000c1','Caster Cee'),
  ('00000000-0000-0000-0000-0000000000c2','Joiner Jay'),
  ('00000000-0000-0000-0000-0000000000c3','Outsider Oh');

insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at) values
  ('d0000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c1','sports','badminton at seven','live', now()+interval '2 days', now());
insert into public.intent_context (intent_id, approximate_place, approximate_geography, starts_at) values
  ('d0000000-0000-0000-0000-0000000000a1','indiranagar', extensions.ST_SetSRID(extensions.ST_MakePoint(77.64,12.97),4326)::extensions.geography, now()+interval '1 day');
insert into public.intent_reach (intent_id, radius_km) values ('d0000000-0000-0000-0000-0000000000a1', 5);

-- joiner matches in
insert into public.responses (id, intent_id, respondent_id, message, status) values
  ('d0000000-0000-0000-0000-0000000000b1','d0000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c2','in','accepted');
insert into public.matches (id, intent_id, response_id, broadcaster_id, participant_id) values
  ('d0000000-0000-0000-0000-0000000000e1','d0000000-0000-0000-0000-0000000000a1','d0000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c2');

-- caster sees full detail incl the participant
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is((select statement from public.plan_detail('d0000000-0000-0000-0000-0000000000a1')), 'badminton at seven', 'caster reads their plan');
select is((select participant_names from public.plan_detail('d0000000-0000-0000-0000-0000000000a1')), array['Joiner'], 'participants are listed by first name');
-- editing is refused once someone has engaged
select throws_ok(
  $$ select public.edit_cast('d0000000-0000-0000-0000-0000000000a1'::uuid, 'new words', 'sports') $$,
  '23514', 'cast_has_engagement', 'a cast with a response cannot be edited');
reset role;

-- an outsider cannot read it
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select throws_ok(
  $$ select * from public.plan_detail('d0000000-0000-0000-0000-0000000000a1'::uuid) $$,
  '42501', 'not_a_participant', 'someone not in the plan is refused');
reset role;

select finish();
rollback;
