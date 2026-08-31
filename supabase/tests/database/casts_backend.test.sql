begin;

create extension if not exists pgtap with schema extensions;
select plan(31);

-- ---------------------------------------------------------------
-- shape
-- ---------------------------------------------------------------
select has_table('public', 'profile_areas', 'a viewer has approved areas');
select has_table('public', 'profile_interests', 'and interests, from their own actions');
select has_function('public', 'publish_cast', 'publishing is one server-controlled call');
select has_function('public', 'my_feed', 'the feed is a function, not a client-side query');
select has_column('public', 'intent_deliveries', 'signals',
  'the stored delivery carries every signal that fired, not just the sentence');

-- ---------------------------------------------------------------
-- fixtures: one caster in indiranagar and five viewers around it.
--
--   p2  indiranagar  + sports   -> in range, shared thread
--   p3  indiranagar  + food     -> in range, NO shared thread
--   p4  whitefield   + sports   -> ~12km away, shared thread
--   p5  whitefield   + none     -> ~12km away, but in the caster's circle
--   p6  indiranagar  + sports   -> would qualify, but has blocked the caster
-- ---------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000','authenticated','authenticated', id::text || '@nearcast.local','',now(),now()
from (values
  ('00000000-0000-0000-0000-0000000000f1'::uuid),('00000000-0000-0000-0000-0000000000f2'::uuid),
  ('00000000-0000-0000-0000-0000000000f3'::uuid),('00000000-0000-0000-0000-0000000000f4'::uuid),
  ('00000000-0000-0000-0000-0000000000f5'::uuid),('00000000-0000-0000-0000-0000000000f6'::uuid)
) as t(id);

insert into public.profiles (id, display_name, active_windows) values
  ('00000000-0000-0000-0000-0000000000f1','Piyush Sharma','{}'),
  ('00000000-0000-0000-0000-0000000000f2','Aarav Rao','{weekday-evening}'),
  ('00000000-0000-0000-0000-0000000000f3','Riya Mehta','{}'),
  ('00000000-0000-0000-0000-0000000000f4','Mira Sen','{}'),
  ('00000000-0000-0000-0000-0000000000f5','Dev Kapoor','{}'),
  ('00000000-0000-0000-0000-0000000000f6','Nina Roy','{}');

insert into public.profile_areas (profile_id, name, centroid) values
  ('00000000-0000-0000-0000-0000000000f2','indiranagar', extensions.ST_SetSRID(extensions.ST_MakePoint(77.6408,12.9784),4326)::extensions.geography),
  ('00000000-0000-0000-0000-0000000000f3','indiranagar', extensions.ST_SetSRID(extensions.ST_MakePoint(77.6408,12.9784),4326)::extensions.geography),
  ('00000000-0000-0000-0000-0000000000f4','whitefield',  extensions.ST_SetSRID(extensions.ST_MakePoint(77.7500,12.9698),4326)::extensions.geography),
  ('00000000-0000-0000-0000-0000000000f5','whitefield',  extensions.ST_SetSRID(extensions.ST_MakePoint(77.7500,12.9698),4326)::extensions.geography),
  ('00000000-0000-0000-0000-0000000000f6','indiranagar', extensions.ST_SetSRID(extensions.ST_MakePoint(77.6408,12.9784),4326)::extensions.geography);

insert into public.profile_interests (profile_id, category) values
  ('00000000-0000-0000-0000-0000000000f2','sports'),
  ('00000000-0000-0000-0000-0000000000f3','food'),
  ('00000000-0000-0000-0000-0000000000f4','sports'),
  ('00000000-0000-0000-0000-0000000000f6','sports');

-- dev is in a circle the caster owns
insert into public.circles (id, owner_id, name) values
  ('30000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000f1','badminton gang');
insert into public.circle_members (circle_id, member_id) values
  ('30000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000f5');

-- nina has blocked the caster
insert into public.blocks (blocker_id, blocked_id) values
  ('00000000-0000-0000-0000-0000000000f6','00000000-0000-0000-0000-0000000000f1');

-- ---------------------------------------------------------------
-- publishing
-- ---------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';

select lives_ok(
  $$ select public.publish_cast('sports','badminton after work.','indiranagar',
       5::smallint, now() + interval '2 days',
       12.9784, 77.6408, now() + interval '1 day', 'weekday-evening') $$,
  'the caster publishes in one call'
);

select throws_ok(
  $$ select public.publish_cast('sports','already over.','indiranagar',
       5::smallint, now() - interval '1 hour', 12.9784, 77.6408) $$,
  '23514', 'expiry_in_the_past',
  'a cast that has already expired is refused'
);


select throws_ok(
  $$ select public.publish_cast('sports','too far.','indiranagar',
       500::smallint, now() + interval '1 day', 12.9784, 77.6408) $$,
  '23514', 'radius_out_of_range',
  'an absurd radius is refused at the entry point too'
);

reset role;

select is(
  (select count(*)::int from public.intents where status = 'live'),
  1,
  'exactly one live cast exists'
);

-- the stored point must not be a precise location
select ok(
  (select extensions.ST_X(approximate_geography::extensions.geometry) = round(77.6408::numeric, 3)::double precision
   from public.intent_context limit 1),
  'the pin is rounded before it is stored — a discoverable row never carries an exact location'
);

-- ---------------------------------------------------------------
-- the gate, per viewer
-- ---------------------------------------------------------------
select is(
  (private.delivery_for('00000000-0000-0000-0000-0000000000f2', (select id from public.intents limit 1))).reason_text,
  'near you in indiranagar · you''re into sports',
  'a stranger in range with a shared thread is delivered, and told exactly why'
);

select ok(
  not (private.delivery_for('00000000-0000-0000-0000-0000000000f3', (select id from public.intents limit 1))).deliver,
  'place alone is never enough — a neighbour with no shared thread is not delivered'
);

select ok(
  not (private.delivery_for('00000000-0000-0000-0000-0000000000f4', (select id from public.intents limit 1))).deliver,
  'a shared thread alone is never enough — a stranger 12km outside a 5km cast is not delivered'
);

select is(
  (private.delivery_for('00000000-0000-0000-0000-0000000000f5', (select id from public.intents limit 1))).reason_code,
  'shared_circle',
  'someone in your circle is reached at any distance, radius or not'
);

select ok(
  not (private.delivery_for('00000000-0000-0000-0000-0000000000f5', (select id from public.intents limit 1))).signals
      @> array['near you in indiranagar'],
  'and the reason does not claim a proximity that did not fire'
);

select ok(
  not (private.delivery_for('00000000-0000-0000-0000-0000000000f6', (select id from public.intents limit 1))).deliver,
  'blocking beats every other signal'
);

select ok(
  not (private.delivery_for('00000000-0000-0000-0000-0000000000f1', (select id from public.intents limit 1))).deliver,
  'your own cast is never delivered to you'
);

-- widening the radius reaches the far stranger, and nothing else changes
update public.intent_reach set radius_km = 25;
select ok(
  (private.delivery_for('00000000-0000-0000-0000-0000000000f4', (select id from public.intents limit 1))).deliver,
  'widening the radius reaches the stranger who was out of range'
);
select ok(
  not (private.delivery_for('00000000-0000-0000-0000-0000000000f3', (select id from public.intents limit 1))).deliver,
  'but a wider radius still does not manufacture a shared thread'
);
update public.intent_reach set radius_km = 5;

-- ---------------------------------------------------------------
-- the feed stores what it delivered, and gates reading on it
-- ---------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}';

select is(
  (select count(*)::int from public.intents),
  0,
  'before delivery, a live cast is not readable at all'
);

select is(
  (select count(*)::int from public.my_feed()),
  1,
  'the feed delivers it'
);

select is(
  (select reason_text from public.my_feed()),
  'near you in indiranagar · you''re into sports',
  'and carries the generated reason'
);

select is(
  (select count(*)::int from public.intents),
  1,
  'the delivery is what grants read on the cast — nothing else changed'
);

select is(
  (select count(*)::int from public.intent_deliveries where recipient_id = '00000000-0000-0000-0000-0000000000f2'),
  1,
  'and it is stored, not recomputed per render'
);

select lives_ok(
  $$ select public.hide_cast((select intent_id from public.my_feed() limit 1)) $$,
  'the viewer can swipe it away'
);
select is(
  (select count(*)::int from public.my_feed()),
  0,
  'and it stays gone'
);

-- ---------------------------------------------------------------
-- denied paths on the new tables
-- ---------------------------------------------------------------
select is_empty(
  $$ select * from public.profile_areas where profile_id <> '00000000-0000-0000-0000-0000000000f2' $$,
  'nobody can read anyone else''s areas'
);
select is_empty(
  $$ select * from public.profile_interests where profile_id <> '00000000-0000-0000-0000-0000000000f2' $$,
  'nor anyone else''s interests'
);
select throws_ok(
  $$ insert into public.profile_interests (profile_id, category)
     values ('00000000-0000-0000-0000-0000000000f3','music') $$,
  '42501',
  null,
  'nor write interests onto someone else'
);

reset role;

-- publishing must not depend on a profile already existing: the FK
-- once turned a first-ever cast into a bare "try again". this user has
-- an auth row but deliberately NO profile row.
reset role;
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('00000000-0000-0000-0000-0000000000d9','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fresh@nearcast.local','',now(),now());
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-0000000000d9","role":"authenticated"}';
-- This pair used to assert the opposite: that publish_cast created the
-- missing profile so the cast's foreign key would hold. That convenience
-- was the hole in the invitation gate — it made publishing a way to join a
-- closed alpha, which is why 16 auth users produced 14 profiles nobody had
-- invited. 20260831160000 replaced the insert with a membership check.
select throws_ok(
  $$ select public.publish_cast('food','anyone for dosa?','indiranagar',
       5::smallint, now() + interval '1 day', 12.9784, 77.6408) $$,
  '42501', 'not_a_member',
  'a caster with no profile row is refused: publishing is not a way to join'
);
reset role;
select is_empty(
  $$ select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000d9' $$,
  'and no profile is created behind their back'
);

select * from finish();
rollback;
