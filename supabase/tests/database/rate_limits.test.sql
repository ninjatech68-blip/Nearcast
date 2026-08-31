begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select has_table('private', 'rate_events', 'rate-limited actions are recorded');
select has_function('private', 'enforce_rate', 'and a shared check enforces them');

select is(
  (select count(*)::int from pg_trigger
    where tgname in ('rate_limit_intents','rate_limit_responses',
                     'rate_limit_messages','rate_limit_reports')),
  4,
  'every path MUST-077 names is covered by a trigger'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000A9','00000000-0000-0000-0000-000000000000','authenticated','authenticated','busy@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000B9','00000000-0000-0000-0000-000000000000','authenticated','authenticated','quiet@x','',now(),now());

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000A9','Busy Caster'),
  ('00000000-0000-0000-0000-0000000000B9','Quiet One');

/**
 * The owner is not a client. Migrations, the demo seed and this suite all
 * write with no auth.uid(), and rate limiting them would make the fixtures
 * a rate-limit test rather than a schema test.
 */
select lives_ok(
  $$ insert into public.intents (broadcaster_id, category, statement, status, expires_at)
     select '00000000-0000-0000-0000-0000000000A9', 'social', 'seeded ' || g, 'live',
            now() + interval '1 day'
     from generate_series(1, 40) g $$,
  'a write with no authenticated actor is not rate limited'
);

select is(
  (select count(*)::int from private.rate_events),
  0,
  'and records nothing, so it cannot consume a real person''s allowance'
);

-- A real caster, at the limit.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000A9","role":"authenticated"}';

-- Through the real door. A client cannot insert into `intents` at all —
-- RLS forbids it and publish_cast is the only way in — so the trigger is
-- exercised where it actually fires, inside the definer function.
select lives_ok(
  $$ select public.publish_cast('social', 'mine ' || g, 'indiranagar', 5::smallint,
                                now() + interval '1 day')
     from generate_series(1, 10) g $$,
  'ten casts in an hour is allowed'
);

select throws_ok(
  $$ select public.publish_cast('social', 'one too many', 'indiranagar', 5::smallint,
                                now() + interval '1 day') $$,
  '53400', 'rate_limited',
  'the eleventh is refused'
);

-- The limit is per person, not global.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000B9","role":"authenticated"}';

select lives_ok(
  $$ select public.publish_cast('social', 'my first cast', 'indiranagar', 5::smallint,
                                now() + interval '1 day') $$,
  'somebody else is unaffected by their neighbour hitting a limit'
);

-- The window moves.
reset role;
update private.rate_events set occurred_at = now() - interval '2 hours'
where actor_id = '00000000-0000-0000-0000-0000000000A9';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000A9","role":"authenticated"}';

select lives_ok(
  $$ select public.publish_cast('social', 'an hour later', 'indiranagar', 5::smallint,
                                now() + interval '1 day') $$,
  'and the allowance returns once the window has passed'
);

select * from finish();
rollback;
