begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

select has_table('public', 'invitations', 'invitations table exists');
select has_table('public', 'invite_attempts', 'redemption attempts are recorded');
select has_function('public', 'redeem_invite', 'the redemption mutation exists');
select hasnt_column('public', 'invitations', 'token', 'raw invitation tokens are not stored');
select has_column('public', 'invitations', 'token_hash', 'only a token hash is stored');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'invited@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'expired@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reuse@nearcast.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'guesser@nearcast.local', '', now(), now());

insert into public.invitations (token_hash, expires_at) values
  (encode(extensions.digest('valid-token', 'sha256'), 'hex'), now() + interval '7 days'),
  (encode(extensions.digest('expired-token', 'sha256'), 'hex'), now() - interval '1 minute'),
  (encode(extensions.digest('used-token', 'sha256'), 'hex'), now() + interval '7 days');

-- A signed-in identity is not yet a member.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}';

select throws_ok(
  $$insert into public.profiles (id, display_name)
    values ('00000000-0000-0000-0000-000000000011', 'Self Made')$$,
  '42501',
  null,
  'a signed-in user cannot create their own profile without an invitation'
);

select throws_ok(
  $$select 1 from public.invitations$$,
  '42501',
  null,
  'invitations are not readable by an authenticated client'
);

select is(
  (select member_display_name from public.redeem_invite('valid-token', '  Asha Rao  ')),
  'Asha Rao',
  'a valid invitation creates the member profile and trims the name'
);

-- Inspect as owner: `authenticated` deliberately has no grant on invitations.
reset role;
select isnt_empty(
  $$select 1 from public.invitations
    where redeemed_by = '00000000-0000-0000-0000-000000000011' and redeemed_at is not null$$,
  'the invitation is marked redeemed by its user'
);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}';

-- Redemption is idempotent for an existing member.
select is(
  (select member_id from public.redeem_invite('valid-token', 'Asha Rao')),
  '00000000-0000-0000-0000-000000000011'::uuid,
  'redeeming again returns the existing profile'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000012","role":"authenticated"}';

select is(
  (select outcome from public.redeem_invite('expired-token', 'Late Arrival')),
  'invalid_invite',
  'an expired invitation is refused'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000013","role":"authenticated"}';

select is(
  (select outcome from public.redeem_invite('valid-token', 'Second Comer')),
  'invalid_invite',
  'an already-redeemed invitation cannot be reused'
);

select is(
  (select outcome from public.redeem_invite('valid-token', '   ')),
  'invalid_input',
  'a blank display name is refused'
);

-- Guessing is bounded: the sixth attempt within the hour is refused.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000014","role":"authenticated"}';

select is(
  (select outcome from public.redeem_invite('wrong-1', 'Guesser')), 'invalid_invite',
  'guess 1 is refused as invalid'
);
select is(
  (select outcome from public.redeem_invite('wrong-2', 'Guesser')), 'invalid_invite',
  'guess 2 is refused as invalid'
);
select is(
  (select outcome from public.redeem_invite('wrong-3', 'Guesser')), 'invalid_invite',
  'guess 3 is refused as invalid'
);
select is(
  (select outcome from public.redeem_invite('wrong-4', 'Guesser')), 'invalid_invite',
  'guess 4 is refused as invalid'
);
select is(
  (select outcome from public.redeem_invite('wrong-5', 'Guesser')), 'invalid_invite',
  'guess 5 is refused as invalid'
);

-- The attempt rows must survive each refusal, or the limit never accumulates.
select is(
  (select outcome from public.redeem_invite('wrong-6', 'Guesser')),
  'rate_limited',
  'the sixth attempt within the hour is rate limited'
);

select is_empty(
  $$select 1 from public.profiles where id = '00000000-0000-0000-0000-000000000014'$$,
  'a failed redeemer never receives a profile'
);

reset role;
select is(
  (select count(*)::int from public.invite_attempts
   where user_id = '00000000-0000-0000-0000-000000000014'),
  5,
  'every refused guess is recorded, so the limit actually accumulates'
);

select * from finish();
rollback;
