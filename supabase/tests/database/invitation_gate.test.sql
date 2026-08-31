begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

select has_table('public', 'invitations', 'invitations are recorded');
select has_table('public', 'invite_attempts', 'so are attempts, for the rate limit');
select has_function('public', 'issue_invite', 'an invitation can be issued');
select has_function('public', 'redeem_invite', 'and redeemed');
select has_function('private', 'is_operator', 'the operator check exists');

-- Membership can no longer be self-granted from the client.
select is_empty(
  $$select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_insert_self'$$,
  'the client can no longer insert its own profile row'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000E1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','operator@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000E2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','joiner@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000E3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stranger@x','',now(),now()),
  ('00000000-0000-0000-0000-0000000000E4','00000000-0000-0000-0000-000000000000','authenticated','authenticated','grandfathered@x','',now(),now());

-- Someone who joined before the gate existed.
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-0000000000E4','Existing Member');

-- Direct database access issues the first invitation: no member exists yet
-- to be its issuer, which is the bootstrap case.
select is(
  (select count(*)::int from public.issue_invite('first tester')),
  1,
  'the project owner can issue the very first invitation'
);

select is(
  (select count(*)::int from public.invitations where issued_by is null),
  1,
  'the first invitation has no issuer, because no member exists to be one'
);

select is(
  (select length(invite_token) from public.issue_invite('length check')),
  64,
  'the token is 32 random bytes of hex'
);

select is_empty(
  $$select 1 from public.invitations where token_hash !~ '^[0-9a-f]{64}$'$$,
  'only hashes are stored, never a raw token'
);

-- The token that comes back must actually redeem, or the two halves do not fit.
do $$
declare handed_out text;
begin
  select invite_token into handed_out from public.issue_invite('round trip');
  create temporary table issued_token as select handed_out as value;
  -- the suite switches role below, and a temp table created as postgres is
  -- not readable by `authenticated` without this.
  grant select on issued_token to authenticated;
end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000E2","role":"authenticated"}';

select is(
  (select outcome from public.redeem_invite((select value from issued_token), 'Ravi Nair')),
  'redeemed',
  'a token from issue_invite redeems'
);

-- Neither table is client-readable: RLS is on with no policies and there is
-- no grant, so a member cannot enumerate or probe invitations at all.
select throws_ok(
  $$select 1 from public.invitations$$,
  '42501',
  'permission denied for table invitations',
  'a signed-in member cannot read the invitations table'
);

reset role;

select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000E2'),
  'Ravi Nair',
  'redemption is what creates the member profile'
);

select is(
  (select count(*)::int from public.invitations
    where redeemed_by = '00000000-0000-0000-0000-0000000000E2' and redeemed_at is not null),
  1,
  'and it consumes exactly one invitation'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000E2","role":"authenticated"}';

-- A second attempt on the same token gets nothing new.
select is(
  (select outcome from public.redeem_invite((select value from issued_token), 'Ravi Nair')),
  'redeemed',
  'redeeming twice is idempotent rather than a second membership'
);

-- Guessing is bounded, and reports rather than raising, so the attempt commits.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000E3","role":"authenticated"}';

select is(
  (select outcome from public.redeem_invite('0000000000000000000000000000000000000000000000000000000000000000', 'Nobody')),
  'invalid_invite',
  'an unknown token is one generic outcome, so invitations cannot be probed'
);

reset role;

select is(
  (select count(*)::int from public.invite_attempts where user_id = '00000000-0000-0000-0000-0000000000E3'),
  1,
  'the failed attempt is recorded, so the rate limit is not decorative'
);

select is_empty(
  $$select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000E3'$$,
  'a failed redemption creates no member'
);

set local role authenticated;

-- Grandfathered members keep working without consuming an invitation.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000E4","role":"authenticated"}';

select is(
  (select outcome from public.redeem_invite('anything at all', 'Existing Member')),
  'redeemed',
  'someone who joined before the gate is still a member'
);

reset role;

select is(
  (select count(*)::int from public.invitations where redeemed_by = '00000000-0000-0000-0000-0000000000E4'),
  0,
  'and consumes no invitation doing it'
);

set local role authenticated;

-- A member is not an operator.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000E2","role":"authenticated"}';

select throws_ok(
  $$select * from public.issue_invite('from a member')$$,
  '42501', 'not_authorized',
  'a signed-in member cannot issue invitations'
);

-- user_metadata is client-writable, so a role kept there is self-awarded.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000E3","role":"authenticated","user_metadata":{"nearcast_role":"operator"}}';

select is(
  private.is_operator(), false,
  'a role claimed in user_metadata is not an operator role'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000E1","role":"authenticated","app_metadata":{"nearcast_role":"operator"}}';

select is(
  private.is_operator(), true,
  'a role in app_metadata is an operator role'
);

-- Publishing no longer enrols the publisher.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000E3","role":"authenticated"}';

select throws_ok(
  $$select * from public.publish_cast('sports', 'Need one more for doubles', 'indiranagar', 5::smallint, now() + interval '1 day')$$,
  '42501', 'not_a_member',
  'publishing is no longer a way to join: it refuses a caster with no profile'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000E2","role":"authenticated"}';

select isnt(
  (select id from public.publish_cast('sports', 'Need one more for doubles', 'indiranagar', 5::smallint, now() + interval '1 day')),
  null,
  'a redeemed member still publishes normally'
);

select * from finish();
rollback;
