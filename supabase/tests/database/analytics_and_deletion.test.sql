begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select has_function('public', 'delete_my_account', 'an account can be deleted');
select has_column('public', 'profiles', 'deleted_at', 'and the tombstone is recorded');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000D1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','leaving@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000D2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','staying@x','',now(),now());

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000D1','Leaving Person'),
  ('00000000-0000-0000-0000-0000000000D2','Staying Person');

insert into public.intents (id, broadcaster_id, category, statement, status, expires_at, published_at)
values ('90000000-0000-0000-0000-0000000000D1','00000000-0000-0000-0000-0000000000D1','social',
        'my live cast','live', now() + interval '1 day', now()),
       ('90000000-0000-0000-0000-0000000000D2','00000000-0000-0000-0000-0000000000D2','social',
        'someone else''s cast','live', now() + interval '1 day', now());

insert into public.responses (intent_id, respondent_id, message)
values ('90000000-0000-0000-0000-0000000000D2','00000000-0000-0000-0000-0000000000D1','I am in');

insert into public.profile_areas (profile_id, name) values
  ('00000000-0000-0000-0000-0000000000D1','indiranagar');
insert into public.profile_interests (profile_id, category) values
  ('00000000-0000-0000-0000-0000000000D1','sports');
insert into public.blocks (blocker_id, blocked_id) values
  ('00000000-0000-0000-0000-0000000000D1','00000000-0000-0000-0000-0000000000D2');

insert into public.device_push_tokens (user_id, token, platform)
values ('00000000-0000-0000-0000-0000000000D1','ExponentPushToken[leaving]','ios');

insert into public.analytics_outbox (event_name, actor_id, properties)
values ('intent_published','00000000-0000-0000-0000-0000000000D1','{"primitive":"request"}'::jsonb),
       ('intent_published','00000000-0000-0000-0000-0000000000D2','{"primitive":"request"}'::jsonb);

-- A client can send an event, and only as itself.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000D2","role":"authenticated"}';

select lives_ok(
  $$insert into public.analytics_outbox (event_name, actor_id, properties)
    values ('intent_shared','00000000-0000-0000-0000-0000000000D2','{"channel":"system"}'::jsonb)$$,
  'a member can send their own analytics event'
);

select throws_ok(
  $$insert into public.analytics_outbox (event_name, actor_id, properties)
    values ('intent_shared','00000000-0000-0000-0000-0000000000D1','{"channel":"system"}'::jsonb)$$,
  '42501',
  'new row violates row-level security policy for table "analytics_outbox"',
  'and cannot forge somebody else''s'
);

select throws_ok(
  $$select 1 from public.analytics_outbox$$,
  '42501',
  'permission denied for table analytics_outbox',
  'nobody can read the outbox from a client'
);

-- Deletion.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000D1","role":"authenticated"}';

select lives_ok(
  $$select public.delete_my_account()$$,
  'a signed-in person can delete their own account'
);

reset role;

select isnt(
  (select deleted_at from public.profiles where id = '00000000-0000-0000-0000-0000000000D1'),
  null,
  'the profile is tombstoned rather than left in place'
);

select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000D1'),
  'deleted account',
  'the name other people saw is gone'
);

select is(
  (select is_restricted from public.profiles where id = '00000000-0000-0000-0000-0000000000D1'),
  true,
  'and every discovery path already filters on is_restricted, so they leave the product at once'
);

select is(
  (select status::text from public.intents where id = '90000000-0000-0000-0000-0000000000D1'),
  'withdrawn',
  'their live casts come down'
);

select is(
  (select status::text from public.responses
    where respondent_id = '00000000-0000-0000-0000-0000000000D1'),
  'withdrawn',
  'and their open requests are withdrawn, so no caster is left deciding'
);

select is_empty(
  $$select 1 from public.device_push_tokens where user_id = '00000000-0000-0000-0000-0000000000D1'$$,
  'their push tokens are removed, so a deleted account stops being notified'
);

-- The screen lists what goes. It has to be true.
select is_empty(
  $$select 1 from public.profile_areas where profile_id = '00000000-0000-0000-0000-0000000000D1'
    union all
    select 1 from public.profile_interests where profile_id = '00000000-0000-0000-0000-0000000000D1'
    union all
    select 1 from public.blocks where blocker_id = '00000000-0000-0000-0000-0000000000D1'$$,
  'the areas, interests and blocks the screen promises to remove are removed'
);

select is(
  (select avatar_path from public.profiles where id = '00000000-0000-0000-0000-0000000000D1'),
  null,
  'and so is the photo'
);

/**
 * MUST-103. The identifier goes and the row stays: a funnel that loses its
 * denominator whenever somebody leaves cannot be read.
 */
select is(
  (select count(*)::int from public.analytics_outbox where actor_id is null),
  1,
  'their analytics identifier is cleared'
);

select is(
  (select count(*)::int from public.analytics_outbox),
  3,
  'and the events themselves are kept, so the counts still add up'
);

select * from finish();
rollback;
