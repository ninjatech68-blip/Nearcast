-- ===============================================================
-- Coordination: L4 (a receipt needs both) and L13 (a window widens
-- only by agreement), asserted by running the functions.
-- ===============================================================
--
-- Written before the schema. The shape being asserted:
--
--   A publishes, B asks to join, A accepts  -> one pair thread
--   the thread expires 24h AFTER the activity, never 24h after it
--   opens -- a cast five days out would otherwise lose its thread
--   four days before the thing it exists to arrange
--
--   widening the window needs both; narrowing and ending need one
--   a refusal is never reported as a refusal
--   a refused proposal cannot be re-made in the same window
--
--   both confirm they met -> a receipt settles -> a vouch becomes
--   possible. One confirmation alone is worth nothing.
-- ===============================================================

begin;
create extension if not exists pgtap with schema extensions;
select plan(39);

-- --------------------------------------------------------------
-- personas: A casts, B joins, C is unrelated
-- --------------------------------------------------------------
insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a'),
  ('bbbbbbbb-0000-0000-0000-00000000000b'),
  ('cccccccc-0000-0000-0000-00000000000c');
insert into public.people (id, display_name) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'Aarav'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'Bhavna'),
  ('cccccccc-0000-0000-0000-00000000000c', 'Chetan');
insert into public.person_verification (person_id, phone_e164, verified_at) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', '+910000000001', now()),
  ('bbbbbbbb-0000-0000-0000-00000000000b', '+910000000002', now()),
  ('cccccccc-0000-0000-0000-00000000000c', '+910000000003', now());
insert into public.person_areas (person_id, name, centroid) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'Indiranagar', extensions.ST_Point(77.6408, 12.9784)::extensions.geography),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'Domlur',      extensions.ST_Point(77.6390, 12.9610)::extensions.geography),
  ('cccccccc-0000-0000-0000-00000000000c', 'Domlur',      extensions.ST_Point(77.6390, 12.9610)::extensions.geography);
insert into public.person_interests (person_id, category) values
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'sports'),
  ('cccccccc-0000-0000-0000-00000000000c', 'sports');

-- the activity is 6 hours out
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.publish_cast('sports', 'badminton after work.', 2,
  now() + interval '6 hours', 'nearby', 12.9784, 77.6408, 'the court', 3000);

reset role;
create temporary table t as select id, happens_at from public.casts limit 1;
grant select on t to authenticated;

-- ===============================================================
-- accepting a join request opens exactly one pair thread
-- ===============================================================
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select lives_ok(
  $$ select public.request_to_join((select id from t), 'in') $$,
  'the recipient asks to join');

reset role;
create temporary table r as
  select id from public.join_requests where person_id = 'bbbbbbbb-0000-0000-0000-00000000000b';
grant select on r to authenticated;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok(
  $$ select public.accept_join_request((select id from r)) $$,
  '42501', null, 'a stranger cannot accept someone else''s join request');

set local "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select throws_ok(
  $$ select public.accept_join_request((select id from r)) $$,
  '42501', null, 'nor can the requester accept their own');

set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok(
  $$ select public.accept_join_request((select id from r)) $$,
  'the caster accepts');

reset role;
create temporary table th as
  select id, expires_at, window_tier from public.threads limit 1;
grant select on th to authenticated;

select is(
  (select count(*)::integer from public.threads), 1,
  'exactly one thread exists');
select results_eq(
  $$ select p.display_name from public.threads t
       join public.people p on p.id in (t.caster_id, t.joiner_id)
      order by p.display_name $$,
  $$ values ('Aarav'), ('Bhavna') $$,
  'and it is the pair, nobody else');

-- ===============================================================
-- L13  the clock starts at the activity, not at the thread
-- ===============================================================
select is(
  (select expires_at from th),
  (select happens_at + interval '24 hours' from t),
  'L13 the window is 24h AFTER the activity, not after the thread opened');
select cmp_ok(
  (select expires_at from th), '>', now() + interval '24 hours',
  'L13 so a thread for a future activity outlives a bare 24 hours');
select col_not_null('public', 'threads', 'expires_at',
  'L13 a thread with no expiry cannot exist');

-- ===============================================================
-- L13  widening needs both; narrowing and ending need one
-- ===============================================================
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok(
  $$ select public.propose_window((select id from th), 'week') $$,
  'either party may propose a wider window');
select is(
  (select expires_at from public.threads), (select expires_at from th),
  'L13 proposing alone changes nothing');
select throws_ok(
  $$ select public.respond_to_window((select id from th), true) $$,
  '42501', null, 'L13 the proposer cannot accept their own proposal');

set local "request.jwt.claims" = '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok(
  $$ select public.respond_to_window((select id from th), true) $$,
  '42501', null, 'L13 nor can a non-party');

-- declining
set local "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select lives_ok(
  $$ select public.respond_to_window((select id from th), false) $$,
  'the other party may decline');
select is(
  (select expires_at from public.threads), (select expires_at from th),
  'L13 a declined proposal leaves the window untouched');
select is_empty(
  $$ select 1 from public.messages
      where is_system
        and (body ilike '%declin%' or body ilike '%refus%' or body ilike '%reject%') $$,
  'a refusal is never reported as a refusal');

-- cooldown: the same window cannot be asked for twice
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok(
  $$ select public.propose_window((select id from th), 'week') $$,
  '23514', null, 'L13 a refused proposal cannot be re-made in the same window');

-- accepting
set local "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select lives_ok(
  $$ select public.propose_window((select id from th), 'month') $$,
  'the other party may propose instead');
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok(
  $$ select public.respond_to_window((select id from th), true) $$,
  'and this one is accepted');
select cmp_ok(
  (select expires_at from public.threads), '>', now() + interval '25 days',
  'L13 both agreed, so the window widened');
select is(
  (select window_tier::text from public.threads), 'month',
  'L13 and the tier records what was agreed');

-- there is no tier past a month
select is_empty(
  $$ select 1 from unnest(enum_range(null::public.chat_window)) e
      where e::text not in ('initial','week','month') $$,
  'L13 no window wider than one month exists');

-- narrowing is unilateral
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok(
  $$ select public.narrow_window((select id from th), 'week') $$,
  'L13 narrowing needs only one of them');
select is(
  (select window_tier::text from public.threads), 'week',
  'L13 and takes effect immediately');

-- ===============================================================
-- messages live inside the window, and inside the pair
-- ===============================================================
set local "request.jwt.claims" = '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok(
  $$ select public.send_message((select id from th), 'hello') $$,
  '42501', null, 'a non-party cannot send');
select is_empty(
  $$ select 1 from public.messages where thread_id = (select id from th) and not is_system $$,
  'and a non-party sees no messages');

set local "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select lives_ok(
  $$ select public.send_message((select id from th), 'see you at 7') $$,
  'a party can send');
select is(
  (select count(*)::integer from public.messages
    where thread_id = (select id from th) and not is_system), 1,
  'and the message lands');
select lives_ok(
  $$ select public.mark_read((select id from th)) $$,
  'a party can mark the thread read');

-- ===============================================================
-- L4  a receipt needs both, and nothing less
-- ===============================================================
-- confirming before the activity is meaningless
set local "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select throws_ok(
  $$ select public.confirm_met((select id from th)) $$,
  '23514', null, 'L4 you cannot confirm a meeting that has not happened');

-- move the activity into the past
reset role;
update public.casts set happens_at = now() - interval '1 hour';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select lives_ok(
  $$ select public.confirm_met((select id from th)) $$,
  'one of them confirms');
select is_empty(
  $$ select 1 from public.plan_receipts where settled_at is not null $$,
  'L4 one confirmation settles nothing');
select throws_ok(
  $$ select public.vouch_for('aaaaaaaa-0000-0000-0000-00000000000a') $$,
  '23514', null, 'L5 and no vouch is possible yet');
select lives_ok(
  $$ select public.confirm_met((select id from th)) $$,
  'L4 confirming twice is harmless');
select is_empty(
  $$ select 1 from public.plan_receipts where settled_at is not null $$,
  'L4 and still settles nothing -- it takes two people, not two taps');

set local "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok(
  $$ select public.confirm_met((select id from th)) $$,
  'the other confirms');
select is(
  (select count(*)::integer from public.plan_receipts where settled_at is not null), 1,
  'L4 now the receipt settles');

set local "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select lives_ok(
  $$ select public.vouch_for('aaaaaaaa-0000-0000-0000-00000000000a') $$,
  'L5 and the vouch that was refused now works');

-- ===============================================================
-- the write surface stays closed
-- ===============================================================
reset role;
select is_empty(
  $$ select table_name || '.' || privilege_type
       from information_schema.table_privileges
      where grantee in ('authenticated','anon')
        and table_schema = 'public'
        and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES') $$,
  'L1 the coordination tables added no write privilege');

select * from finish();
rollback;
