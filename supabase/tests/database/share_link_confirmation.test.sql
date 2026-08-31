begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

select has_function('public', 'get_public_intent', 'a share link resolves to a public projection');
select has_function('public', 'confirm_intent', 'a signed-in recipient can confirm');
select has_function('public', 'viewer_has_confirmed', 'and can tell whether they already did');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000F1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','caster@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000F2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','recipient@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000F3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000F4','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stranger@x','',now(),now());

-- F4 signs in but never redeemed an invitation, so has no profile.
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000F1','Asha Rao'),
  ('00000000-0000-0000-0000-0000000000F2','Dev Mehta'),
  ('00000000-0000-0000-0000-0000000000F3','Mira Sen');

insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at, share_slug)
values
  ('90000000-0000-0000-0000-0000000000F1','00000000-0000-0000-0000-0000000000F1','sports',
   'Need one more for doubles on Thursday','live', now() + interval '2 days', now(),
   'aa000000-0000-0000-0000-0000000000F1'),
  ('90000000-0000-0000-0000-0000000000F2','00000000-0000-0000-0000-0000000000F1','sports',
   'Link is switched off for this one','live', now() + interval '2 days', now(),
   'aa000000-0000-0000-0000-0000000000F2'),
  ('90000000-0000-0000-0000-0000000000F3','00000000-0000-0000-0000-0000000000F1','sports',
   'This one is withdrawn','withdrawn', now() + interval '2 days', now(),
   'aa000000-0000-0000-0000-0000000000F3');

insert into public.intent_context (intent_id, approximate_place) values
  ('90000000-0000-0000-0000-0000000000F1','indiranagar'),
  ('90000000-0000-0000-0000-0000000000F2','indiranagar'),
  ('90000000-0000-0000-0000-0000000000F3','indiranagar');

insert into public.intent_reach (intent_id, radius_km, public_link_enabled, show_broadcaster_first_name) values
  ('90000000-0000-0000-0000-0000000000F1', 5, true, true),
  ('90000000-0000-0000-0000-0000000000F2', 5, false, true),
  ('90000000-0000-0000-0000-0000000000F3', 5, true, true);

-- MUST-022: a link recipient sees the intent before signing in at all.
set local role anon;

select is(
  (select statement from public.get_public_intent('aa000000-0000-0000-0000-0000000000F1')),
  'Need one more for doubles on Thursday',
  'an anonymous recipient can read the intent the link points at'
);

select is(
  (select confirmation_count::int from public.get_public_intent('aa000000-0000-0000-0000-0000000000F1')),
  0,
  'and an honest zero when nobody has confirmed'
);

select is_empty(
  $$select 1 from public.get_public_intent('aa000000-0000-0000-0000-0000000000F2')$$,
  'a cast with the public link switched off is not readable by slug'
);

select is_empty(
  $$select 1 from public.get_public_intent('aa000000-0000-0000-0000-0000000000F3')$$,
  'nor is a withdrawn one'
);

-- The projection carries nothing private. This is the assertion that
-- would fail if someone widened it later.
reset role;
create temporary view public_shape as
  select * from public.get_public_intent('aa000000-0000-0000-0000-0000000000F1');

select set_eq(
  $$select column_name::text from information_schema.columns where table_name = 'public_shape'$$,
  $$values ('id'),('share_slug'),('category'),('statement'),('slots_wanted'),('seats_taken'),
           ('expires_at'),('published_at'),('starts_at'),('deadline_at'),('quantity'),
           ('price_minor'),('currency'),('approximate_place'),('broadcaster_first_name'),
           ('confirmation_count')$$,
  'the public projection carries no coordinate, address, contact or confirmer'
);

-- MUST-023: confirming requires a signed-in member.
set local role anon;

select throws_ok(
  $$select * from public.confirm_intent('aa000000-0000-0000-0000-0000000000F1')$$,
  '42501',
  'permission denied for function confirm_intent',
  'an anonymous reader cannot confirm'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000F4","role":"authenticated"}';

select throws_ok(
  $$select * from public.confirm_intent('aa000000-0000-0000-0000-0000000000F1')$$,
  '42501', 'not_a_member',
  'a signed-in stranger who never redeemed an invitation cannot confirm'
);

-- A genuine confirmation.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000F2","role":"authenticated"}';

select is(
  (select confirmation_count::int from public.confirm_intent('aa000000-0000-0000-0000-0000000000F1')),
  1,
  'a member confirms, and the count reflects one real person'
);

select is(
  (select viewer_has_confirmed from public.confirm_intent('aa000000-0000-0000-0000-0000000000F1')),
  true,
  'and the viewer is told it was theirs'
);

-- MUST-024: unique people, not clicks.
select is(
  (select confirmation_count::int from public.confirm_intent('aa000000-0000-0000-0000-0000000000F1')),
  1,
  'confirming twice is still one confirmation'
);

select is(
  public.viewer_has_confirmed('aa000000-0000-0000-0000-0000000000F1'),
  true,
  'a viewer can tell they already confirmed'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000F3","role":"authenticated"}';

select is(
  (select confirmation_count::int from public.confirm_intent('aa000000-0000-0000-0000-0000000000F1')),
  2,
  'a second person makes it two'
);

select is(
  public.viewer_has_confirmed('aa000000-0000-0000-0000-0000000000F2'),
  false,
  'and a cast nobody confirmed reads as not confirmed'
);

/**
 * The leak this migration closes. `confirmations_read_visible_intent` let
 * any authenticated user read every row, and the row carries confirmer_id,
 * so the origin circle's membership was enumerable — the exact thing
 * MUST-023 exists to prevent.
 */
select is(
  (select count(*)::int from public.intent_confirmations),
  1,
  'a member reads only their own confirmation, never anyone else''s'
);

select is(
  (select confirmer_id from public.intent_confirmations),
  '00000000-0000-0000-0000-0000000000F3'::uuid,
  'and the one they read is theirs'
);

-- The caster can reach their own slug, and only their own.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000F1","role":"authenticated"}';

select is(
  (select share_slug from public.my_casts() where intent_id = '90000000-0000-0000-0000-0000000000F1'),
  'aa000000-0000-0000-0000-0000000000F1'::uuid,
  'a caster gets the share slug for their own cast, so a link can be built'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000F2","role":"authenticated"}';

select is_empty(
  $$select 1 from public.my_casts()$$,
  'and nobody else can read a slug through it'
);

-- Self-confirmation would be fabricating support.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000F1","role":"authenticated"}';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000F1","role":"authenticated"}';

select throws_ok(
  $$select * from public.confirm_intent('aa000000-0000-0000-0000-0000000000F1')$$,
  '42501', 'not_authorized',
  'a caster cannot confirm their own cast'
);

select throws_ok(
  $$select * from public.confirm_intent('aa000000-0000-0000-0000-0000000000F3')$$,
  'P0002', 'not_found',
  'a withdrawn cast cannot be confirmed'
);

select * from finish();
rollback;
