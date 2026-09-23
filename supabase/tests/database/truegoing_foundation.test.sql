-- TrueGoing foundation: structure, RLS and privacy invariants (docs/truegoing/05 §11).
-- Invariants covered here: 1, 2, 4, 5, 6, 7 (creation guard), 8, 10, 15, 16.
-- The rest are written with the RPCs that make them testable (see docs/truegoing/07).
begin;

create extension if not exists pgtap with schema extensions;
select plan(79);

-- ---------------------------------------------------------------------------
-- Fixtures (as the database owner)
-- ---------------------------------------------------------------------------
-- H host (man, unverified) · J joiner (woman, unverified) · O outsider
-- M verified man · W verified woman · B blocked-by-host
insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'h@truegoing.test', now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'j@truegoing.test', now(), now()),
  ('00000000-0000-0000-0000-0000000000a3', 'authenticated', 'authenticated', 'o@truegoing.test', now(), now()),
  ('00000000-0000-0000-0000-0000000000a4', 'authenticated', 'authenticated', 'm@truegoing.test', now(), now()),
  ('00000000-0000-0000-0000-0000000000a5', 'authenticated', 'authenticated', 'w@truegoing.test', now(), now()),
  ('00000000-0000-0000-0000-0000000000a6', 'authenticated', 'authenticated', 'b@truegoing.test', now(), now());

insert into public.profiles (id, display_name, city, verified_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'Harpreet Singh', 'Chandigarh', null),
  ('00000000-0000-0000-0000-0000000000a2', 'Jasleen Kaur', 'Chandigarh', null),
  ('00000000-0000-0000-0000-0000000000a3', 'Omar Ali', 'Mohali', null),
  ('00000000-0000-0000-0000-0000000000a4', 'Manav Sood', 'Chandigarh', now()),
  ('00000000-0000-0000-0000-0000000000a5', 'Wamiqa Rana', 'Chandigarh', now()),
  ('00000000-0000-0000-0000-0000000000a6', 'Bilal Khan', 'Chandigarh', null);

insert into public.profile_private (profile_id, birth_date, gender) values
  ('00000000-0000-0000-0000-0000000000a1', '1990-01-01', 'man'),
  ('00000000-0000-0000-0000-0000000000a2', '1995-01-01', 'woman'),
  ('00000000-0000-0000-0000-0000000000a3', '1992-01-01', 'undisclosed'),
  ('00000000-0000-0000-0000-0000000000a4', '1991-01-01', 'man'),
  ('00000000-0000-0000-0000-0000000000a5', '1993-01-01', 'woman'),
  ('00000000-0000-0000-0000-0000000000a6', '1994-01-01', 'man');

-- P1: live plan by H, delivered to J and M.  P2: live women-only plan by W,
-- delivered to J (unverified woman) and M (verified man).  P3: H's draft.
insert into public.plans (id, host_id, type, text, emoji, starts_at, ends_at, capacity, area_name, city)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'plan',
   'Badminton tonight', '🏸', now() + interval '3 hours', now() + interval '5 hours', 4, 'Sector 8', 'Chandigarh'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1', 'plan',
   'Coffee walk', '☕', now() + interval '1 day', now() + interval '1 day 2 hours', 3, 'Sector 17', 'Chandigarh');
insert into public.plans (id, host_id, type, text, emoji, starts_at, ends_at, capacity, area_name, city, women_only, verified_only)
values
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a5', 'plan',
   'Evening run', '🏃', now() + interval '4 hours', now() + interval '5 hours', 6, 'Sukhna Lake', 'Chandigarh', true, true);

insert into public.plan_private (plan_id, exact_point, exact_address) values
  ('10000000-0000-0000-0000-000000000001', 'SRID=4326;POINT(76.78416 30.74263)', 'Court 3, Sector 8 Sports Complex'),
  ('10000000-0000-0000-0000-000000000002', 'SRID=4326;POINT(76.81872 30.74219)', 'Lake gate 2'),
  ('10000000-0000-0000-0000-000000000003', 'SRID=4326;POINT(76.77941 30.73952)', 'Plaza fountain');

update public.plans set status = 'live', published_at = now()
where id in ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');

insert into public.plan_deliveries (plan_id, profile_id, reason_code, reason_text, reach_level_at_delivery) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', 'nearby', 'Near you', 'nearby'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a4', 'nearby', 'Near you', 'nearby'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'nearby', 'Near you', 'nearby'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a4', 'nearby', 'Near you', 'nearby');

insert into public.conversations (id, plan_id) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');
insert into public.plan_members (plan_id, profile_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a4');
insert into public.conversation_members (conversation_id, profile_id) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1'),
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a4');
insert into public.messages (conversation_id, sender_id, kind, body) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'text', 'See you at 8');

insert into public.blocks (blocker_id, blocked_id) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a6');
insert into public.plan_deliveries (plan_id, profile_id, reason_code, reason_text, reach_level_at_delivery) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a6', 'nearby', 'Near you', 'nearby');

-- ---------------------------------------------------------------------------
-- Structure
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0, 'RLS is enabled on every public table');

select has_table('public', t, format('table %s exists', t)) from unnest(array[
  'profiles', 'profile_private', 'profile_settings', 'interests', 'profile_interests', 'devices',
  'blocks', 'connections', 'plans', 'plan_private', 'plan_members', 'plan_requests',
  'plan_deliveries', 'plan_events', 'conversations', 'conversation_threads',
  'conversation_members', 'messages', 'notification_jobs', 'reports', 'moderation_actions',
  'analytics_outbox'
]) as t;

select hasnt_table('public', 'intents', 'the old intents model is gone');

-- Invariant 1: no user location anywhere.
select is(
  (select count(*)::int from information_schema.columns
   where table_schema = 'public'
     and table_name in ('profiles', 'profile_private', 'profile_settings', 'devices')
     and (udt_name in ('geography', 'geometry')
          or column_name ~ '(^|_)(lat|lng|lon|latitude|longitude|coords?|point)($|_)')),
  0, 'invariant 1: profile and device tables hold no coordinates');

-- ---------------------------------------------------------------------------
-- Invariant 2: public place is grid-snapped and close to the exact spot
-- ---------------------------------------------------------------------------
select ok(
  (select bool_and(
     p.snapped_point is not null
     and extensions.st_distance(p.snapped_point, pp.exact_point) <= 450
     and extensions.st_equals(
       p.snapped_point::extensions.geometry,
       extensions.st_snaptogrid(p.snapped_point::extensions.geometry, 0.0027)))
   from public.plans p join public.plan_private pp on pp.plan_id = p.id),
  'invariant 2: every plan with a spot has a snapped point on the grid within 450 m');

select ok(
  (select bool_and(char_length(cell) = 6) from public.plans where snapped_point is not null),
  'invariant 2: every snapped plan has a geohash-6 cell');

select ok(
  (select extensions.st_distance(p.snapped_point, pp.exact_point) > 0
   from public.plans p join public.plan_private pp on pp.plan_id = p.id
   where p.id = '10000000-0000-0000-0000-000000000001'),
  'invariant 2: the snapped point is not the exact spot');

select throws_ok(
  $$ insert into public.plans (host_id, type, text, emoji, starts_at, ends_at, capacity, area_name, city, status)
     values ('00000000-0000-0000-0000-0000000000a1', 'plan', 'No place', '📍',
             now() + interval '1 hour', now() + interval '2 hours', 2, 'Sector 1', 'Chandigarh', 'live') $$,
  '23514', null, 'a live plan cannot exist without a snapped place');

-- ---------------------------------------------------------------------------
-- Invariant 4: every delivery has a reason
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.plan_deliveries (plan_id, profile_id, reason_code, reason_text)
     values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a3', 'nearby', null) $$,
  '23502', null, 'invariant 4: a delivery without reason text is rejected');

select throws_ok(
  $$ insert into public.plan_deliveries (plan_id, profile_id, reason_code, reason_text)
     values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a3', 'nearby', '  ') $$,
  '23514', null, 'invariant 4: a blank reason is rejected');

-- ---------------------------------------------------------------------------
-- Invariant 6 (owner side) and invariant 7 (creation guard)
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ update public.plans set reach_level = 'friends' where id = '10000000-0000-0000-0000-000000000001' $$,
  'P0001', 'cannot_narrow', 'invariant 6: reach cannot be narrowed, even by the owner role');

select lives_ok(
  $$ update public.plans set reach_level = 'city' where id = '10000000-0000-0000-0000-000000000003' $$,
  'invariant 6: reach can be widened');

select throws_ok(
  $$ insert into public.plans (host_id, type, text, emoji, starts_at, ends_at, capacity, area_name, city, women_only, verified_only)
     values ('00000000-0000-0000-0000-0000000000a1', 'plan', 'Women walk', '🚶',
             now() + interval '1 hour', now() + interval '2 hours', 4, 'Sector 9', 'Chandigarh', true, true) $$,
  'P0001', 'women_only_not_allowed', 'invariant 7: a man cannot create a women-only plan');

select throws_ok(
  $$ insert into public.plans (host_id, type, text, emoji, starts_at, ends_at, capacity, area_name, city, women_only, verified_only)
     values ('00000000-0000-0000-0000-0000000000a2', 'plan', 'Women walk', '🚶',
             now() + interval '1 hour', now() + interval '2 hours', 4, 'Sector 9', 'Chandigarh', true, true) $$,
  'P0001', 'women_only_not_allowed', 'invariant 7: an unverified woman cannot create a women-only plan');

select throws_ok(
  $$ insert into public.plans (host_id, type, text, emoji, starts_at, ends_at, capacity, area_name, city, women_only, verified_only)
     values ('00000000-0000-0000-0000-0000000000a5', 'plan', 'Women walk', '🚶',
             now() + interval '1 hour', now() + interval '2 hours', 4, 'Sector 9', 'Chandigarh', true, false) $$,
  '23514', null, 'invariant 7: women-only forces verified-only');

select throws_ok(
  $$ insert into public.plans (host_id, type, text, emoji, starts_at, ends_at, capacity, area_name, city)
     values ('00000000-0000-0000-0000-0000000000a1', 'ask', 'Help moving a sofa', '🛋️',
             now() + interval '1 hour', now() + interval '2 hours', 3, 'Sector 9', 'Chandigarh') $$,
  '23514', null, 'asks and offers are limited to one accepted person');

-- ---------------------------------------------------------------------------
-- Invariant 15: payload hygiene
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.notification_jobs (profile_id, type, payload, idempotency_key)
     values ('00000000-0000-0000-0000-0000000000a1', 'member_joined',
             '{"type":"member_joined","text":"Badminton tonight"}', 'k1') $$,
  '23514', null, 'invariant 15: push payloads cannot carry text');

select lives_ok(
  $$ insert into public.notification_jobs (profile_id, type, payload, idempotency_key)
     values ('00000000-0000-0000-0000-0000000000a1', 'member_joined',
             '{"type":"member_joined","plan_id":"10000000-0000-0000-0000-000000000001"}', 'k2') $$,
  'invariant 15: push payloads with IDs only are accepted');

select throws_ok(
  $$ insert into public.analytics_outbox (profile_id, event, properties)
     values ('00000000-0000-0000-0000-0000000000a1', 'plan.view', '{"display_name":"Harpreet"}') $$,
  '23514', null, 'invariant 15: analytics cannot carry names');

select throws_ok(
  $$ insert into public.plan_events (plan_id, event_type, metadata)
     values ('10000000-0000-0000-0000-000000000001', 'edited', '{"exact_address":"Court 3"}') $$,
  '23514', null, 'plan events cannot carry the exact address');

-- ---------------------------------------------------------------------------
-- Anonymous access
-- ---------------------------------------------------------------------------
set local role anon;
select throws_ok($$ select count(*) from public.plans $$, '42501', null, 'anon cannot read plans');
select throws_ok($$ select count(*) from public.profiles $$, '42501', null, 'anon cannot read profiles');
reset role;

-- ---------------------------------------------------------------------------
-- As J: joiner, unverified woman, delivered P1 and P2
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);

select results_eq(
  $$ select id::text from public.plans order by id $$,
  array['10000000-0000-0000-0000-000000000001'],
  'a delivered recipient sees the live plan and not the women-only plan (unverified)');

select is_empty($$ select 1 from public.plan_private $$, 'a recipient cannot read any exact spot');

-- Invariant 8: J has no relationship with anyone but can see P1's host.
select results_eq(
  $$ select id::text from public.profiles order by id $$,
  array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2'],
  'invariant 8: profiles readable are self and the host of a plan you can see');

select is_empty($$ select 1 from public.profile_private where profile_id <> auth.uid() $$,
  'another person''s private profile is never readable');

-- Invariant 5: no re-pointing or direct feedback writes.
select throws_ok(
  $$ update public.plan_deliveries set plan_id = '10000000-0000-0000-0000-000000000003' $$,
  '42501', null, 'invariant 5: a recipient cannot re-point a delivery');
select throws_ok(
  $$ update public.plan_deliveries set hidden_at = now() $$,
  '42501', null, 'invariant 5: delivery changes go through RPCs only');
select throws_ok(
  $$ update public.plan_requests set plan_id = '10000000-0000-0000-0000-000000000003' $$,
  '42501', null, 'invariant 5: a requester cannot re-point a request');
select throws_ok(
  $$ insert into public.plan_deliveries (plan_id, profile_id, reason_code, reason_text)
     values ('10000000-0000-0000-0000-000000000003', auth.uid(), 'nearby', 'Near you') $$,
  '42501', null, 'a user cannot deliver a plan to themselves');
select throws_ok(
  $$ insert into public.plan_members (plan_id, profile_id)
     values ('10000000-0000-0000-0000-000000000001', auth.uid()) $$,
  '42501', null, 'joining goes through RPCs only');

-- Invariant 10: no self-unrestriction or self-verification.
select throws_ok(
  $$ update public.profiles set is_restricted = false where id = auth.uid() $$,
  '42501', null, 'invariant 10: a user cannot change their restriction');
select throws_ok(
  $$ update public.profiles set verified_at = now() where id = auth.uid() $$,
  '42501', null, 'invariant 10: a user cannot verify themselves');
select throws_ok(
  $$ update public.profile_private set birth_date = '2000-01-01' where profile_id = auth.uid() $$,
  '42501', null, 'birth date is not client-writable');
select lives_ok(
  $$ update public.profiles set display_name = 'Jasleen K' where id = auth.uid() $$,
  'a user can edit their own name');
select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a1' and display_name = 'Harpreet Singh'),
  1, 'a user cannot rename someone else (row unchanged)');
update public.profiles set display_name = 'Hacked' where id = '00000000-0000-0000-0000-0000000000a1';
reset role;
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'Harpreet Singh', 'an update aimed at another profile changes nothing');

-- ---------------------------------------------------------------------------
-- As M: verified man, member of P1, delivered P2 (women-only)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);

select results_eq(
  $$ select id::text from public.plans order by id $$,
  array['10000000-0000-0000-0000-000000000001'],
  'a verified man never sees a women-only plan, even with a delivery');
select is(
  (select count(*)::int from public.messages),
  1, 'a member reads the plan chat');
select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, kind, body)
     values ('30000000-0000-0000-0000-000000000001', auth.uid(), 'text', 'On my way') $$,
  'a member can post a text message');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, kind, body)
     values ('30000000-0000-0000-0000-000000000001', auth.uid(), 'system', 'Spot unlocked') $$,
  '42501', null, 'a member cannot post system messages');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, kind, body)
     values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'text', 'Spoof') $$,
  '42501', null, 'a member cannot post as someone else');
select is_empty($$ select 1 from public.plan_private $$, 'a member cannot read the exact spot directly');
reset role;

-- ---------------------------------------------------------------------------
-- As W: verified woman, delivered nothing, hosts P2
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
select results_eq(
  $$ select id::text from public.plans order by id $$,
  array['10000000-0000-0000-0000-000000000002'],
  'a host sees their own plan and nothing undelivered');
reset role;

-- ---------------------------------------------------------------------------
-- As H: host of P1 and draft P3
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.plan_private),
  2, 'a host reads the exact spot of their own plans');
select throws_ok(
  $$ update public.plans set reach_level = 'city' where id = '10000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'invariant 6: a host cannot change reach directly');
select throws_ok(
  $$ update public.plans set status = 'cancelled' where id = '10000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'status changes go through RPCs only');
select lives_ok(
  $$ update public.plans set text = 'Coffee walk by the plaza' where id = '10000000-0000-0000-0000-000000000003' $$,
  'a host can edit their own draft');
select is(
  (select count(*)::int from public.plans where id = '10000000-0000-0000-0000-000000000003' and text = 'Coffee walk by the plaza'),
  1, 'the draft edit took effect');
select throws_ok(
  $$ insert into public.plans (host_id, type, text, emoji, starts_at, ends_at, capacity, area_name, city, status)
     values (auth.uid(), 'plan', 'Straight to live', '🎯', now() + interval '1 hour', now() + interval '2 hours', 2, 'Sector 1', 'Chandigarh', 'live') $$,
  '42501', null, 'a client cannot create a plan that is already live');
select is_empty(
  $$ select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000a6' $$,
  'a person you blocked is not readable');
select is(
  (select count(*)::int from public.blocks),
  1, 'the blocker sees their block');
reset role;

-- ---------------------------------------------------------------------------
-- As B: blocked by H but holding a delivery of H's plan
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a6","role":"authenticated"}', true);
select is_empty($$ select 1 from public.plans $$, 'a blocked person cannot see the blocker''s plan despite a delivery');
select is_empty($$ select 1 from public.blocks $$, 'the blocked person cannot see the block');
reset role;

-- ---------------------------------------------------------------------------
-- Invariant 16: an outsider reads nothing
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is(
  (select (select count(*) from public.plans) + (select count(*) from public.plan_private)
        + (select count(*) from public.plan_members) + (select count(*) from public.plan_requests)
        + (select count(*) from public.plan_deliveries) + (select count(*) from public.messages)
        + (select count(*) from public.conversations) + (select count(*) from public.conversation_members))::int,
  0, 'invariant 16: an outsider reads no plans, spots, members, requests, deliveries or chats');
select results_eq(
  $$ select id::text from public.profiles $$,
  array['00000000-0000-0000-0000-0000000000a3'],
  'invariant 8: an outsider can read only their own profile');
select throws_ok($$ select count(*) from public.notification_jobs $$, '42501', null, 'clients cannot read the push queue');
select throws_ok($$ select count(*) from public.analytics_outbox $$, '42501', null, 'clients cannot read analytics');
reset role;

select * from finish();
rollback;
