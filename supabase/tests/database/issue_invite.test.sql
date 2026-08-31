begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

select has_function('private', 'is_operator', 'the operator check exists');
select has_function('public', 'issue_invite', 'invitations can be issued');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'operator@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pretender@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'joiner@nearcast.local', '', now(), now());

-- Direct database access issues the first invitation. There is no member yet,
-- so this is the only path that can exist at this point.
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

-- The raw token is never stored.
select is_empty(
  $$select 1 from public.invitations where token_hash ~ '^[0-9a-f]{64}$' = false$$,
  'only hashes are stored, never a raw token'
);

-- The token that comes back actually redeems, which is the whole point.
do $$
declare
  handed_out text;
begin
  select invite_token into handed_out from public.issue_invite('round trip');
  create temporary table issued_token as select handed_out as value;
end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}';

select is(
  (select outcome from public.redeem_invite((select value from issued_token), 'Ravi Nair')),
  'redeemed',
  'a token from issue_invite redeems, so the two halves genuinely fit'
);

select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000d3'),
  1,
  'redeeming an issued invitation creates the member profile'
);

-- A member is not an operator.
select throws_ok(
  $$select * from public.issue_invite('from a member')$$,
  '42501',
  'not_authorized',
  'a signed-in member cannot issue invitations'
);

-- The mistake this distinction exists to prevent: user_metadata is writable by
-- the client, so a role kept there would be self-awarded.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated","user_metadata":{"nearcast_role":"operator"}}';

select is(
  private.is_operator(),
  false,
  'a role claimed in user_metadata is not an operator role'
);

select throws_ok(
  $$select * from public.issue_invite('self-awarded')$$,
  '42501',
  'not_authorized',
  'a self-awarded role in user_metadata cannot issue invitations'
);

-- app_metadata is service-role only, so it is the one that counts.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","app_metadata":{"nearcast_role":"operator"}}';

select is(
  private.is_operator(),
  true,
  'a role in app_metadata is an operator role'
);

select is(
  (select count(*)::int from public.issue_invite('from an operator')),
  1,
  'an operator can issue an invitation'
);

-- The outstanding cap.
reset role;
insert into public.invitations (token_hash, expires_at)
select encode(extensions.digest('filler' || generation, 'sha256'), 'hex'), now() + interval '7 days'
from generate_series(1, 50) as generation;

select throws_ok(
  $$select * from public.issue_invite('past the cap')$$,
  '53400',
  'invite_limit_reached',
  'a runaway caller cannot mint an unbounded number of live invitations'
);

select * from finish();
rollback;
