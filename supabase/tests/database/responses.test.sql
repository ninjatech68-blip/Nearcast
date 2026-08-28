begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select has_function('public', 'respond_to_cast', 'joining is a server call');
select has_function('public', 'decline_response', 'the caster can decline');
select has_function('public', 'withdraw_response', 'the joiner can withdraw');
select has_function('public', 'my_casts', 'the caster reads their own casts');
select has_function('public', 'pending_joins_on_my_casts', 'and who is waiting on them');

-- caster A, joiner B, both in indiranagar and into sports
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000A1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000B1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@x','',now(),now());
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000A1','Aarav Rao'),
  ('00000000-0000-0000-0000-0000000000B1','Riya Mehta');
insert into public.profile_areas (profile_id, name, centroid) values
  ('00000000-0000-0000-0000-0000000000B1','indiranagar', extensions.ST_SetSRID(extensions.ST_MakePoint(77.6408,12.9784),4326)::extensions.geography);
insert into public.profile_interests (profile_id, category) values ('00000000-0000-0000-0000-0000000000B1','sports');

-- A publishes
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000A1","role":"authenticated"}';
select public.publish_cast('sports','badminton after work.','indiranagar', 5::smallint, now() + interval '2 days', 12.9784, 77.6408, now() + interval '1 day', 'weekday-evening');
reset role;

-- B sees it (materialises the delivery), then joins
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000B1","role":"authenticated"}';
select is((select count(*)::int from public.my_feed()), 1, 'B is delivered the cast');
select lives_ok(
  $$ select public.respond_to_cast((select intent_id from public.intent_deliveries where recipient_id='00000000-0000-0000-0000-0000000000B1' limit 1), 'in! i play weekly.') $$,
  'B can ask to join a cast delivered to them'
);
reset role;

-- the request shows up for A, exactly once
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000A1","role":"authenticated"}';
select is((select count(*)::int from public.pending_joins_on_my_casts()), 1, 'A sees one request waiting');
select is((select joiner_first_name from public.pending_joins_on_my_casts() limit 1), 'Riya', 'and it names the joiner');
select is((select pending_count from public.my_casts() limit 1), 1::bigint, 'A''s own cast row shows one pending');
select throws_ok(
  $$ select public.respond_to_cast((select id from public.intents where broadcaster_id='00000000-0000-0000-0000-0000000000A1' limit 1), 'me too') $$,
  '23514', 'cannot_join_own_cast',
  'a caster cannot join their own cast'
);

-- A accepts → a match and a conversation exist, and the request clears
select lives_ok(
  $$ select public.accept_response((select response_id from public.pending_joins_on_my_casts() limit 1), 'live') $$,
  'A accepts the request'
);
select is((select count(*)::int from public.pending_joins_on_my_casts()), 0, 'the request is no longer pending');
select is((select count(*)::int from public.matches where intent_id in (select id from public.intents where broadcaster_id='00000000-0000-0000-0000-0000000000A1')), 1, 'a match exists');
select isnt_empty(
  $$ select 1 from public.conversations c join public.matches m on m.id=c.match_id where m.broadcaster_id='00000000-0000-0000-0000-0000000000A1' $$,
  'and a conversation was opened for the plan'
);
reset role;

-- B now sees the accepted state in joins_i_sent
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000B1","role":"authenticated"}';
select is((select status::text from public.joins_i_sent() limit 1), 'accepted', 'B sees their request was accepted');
reset role;

select * from finish();
rollback;
