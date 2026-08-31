-- Issuing an invitation.
--
-- Redemption existed from the start; issuance did not, so no invitation could
-- be created by any path and nobody could join. The only way in was hand-
-- writing a SHA-256 hash into the table, which is exactly the operation a
-- person should never do by hand: get it wrong and the token silently does not
-- work, with no way to tell which half was wrong.
--
-- The raw token is generated here and returned exactly once. It is never
-- stored, never logged and never recoverable: a lost invitation is reissued,
-- not looked up. That is the same property `redeem_invite` relies on when it
-- compares hashes, and it means a database disclosure hands out no working
-- invitations.
--
-- Who may call this.
--
-- The alpha cohort is approved by the team rather than grown by members
-- (Roadmap: 30-50 adults from one dense network; Plan 05: "invite only the
-- approved Bengaluru cohort"). So there is no member-facing quota and no
-- invite button in the app. Two callers are legitimate:
--
--   * Direct database access — the SQL editor or psql with the project's own
--     credentials. `auth.uid()` is null there. This grants nothing new: a
--     caller holding those credentials can already write the table directly,
--     so refusing them here would only push them back to hand-built hashes.
--   * A signed-in operator, identified by `app_metadata`.
--
-- `app_metadata` and not `user_metadata`, deliberately. A client can write its
-- own `user_metadata` through `auth.updateUser`, so a role kept there is a role
-- any member can award themselves. Only the service role can write
-- `app_metadata`. The test suite asserts the `user_metadata` path is refused,
-- because that is the mistake this distinction exists to prevent.

create or replace function private.is_operator()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'nearcast_role') = 'operator',
    false
  );
$$;

-- Outstanding unredeemed invitations are capped.
--
-- Not a security boundary — an operator can raise it by redeeming or expiring
-- what is outstanding. It is a guard against a loop or a fat-fingered repeat
-- minting thousands of live tokens, each of which is a working way into a
-- closed alpha. The cap matches the cohort the roadmap describes.
create or replace function public.issue_invite(
  invite_note text default null,
  valid_for interval default interval '14 days'
)
returns table (invite_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  outstanding integer;
  raw_token text;
  trimmed_note text := nullif(btrim(coalesce(invite_note, '')), '');
  issued_expiry timestamptz;
begin
  -- A signed-in caller must be an operator. A caller with no identity reached
  -- this through the project's own credentials; see the header.
  if actor is not null and not private.is_operator() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if valid_for <= interval '0' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if trimmed_note is not null and char_length(trimmed_note) > 120 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  select count(*) into outstanding
  from public.invitations
  where redeemed_at is null and public.invitations.expires_at > now();

  if outstanding >= 50 then
    raise exception 'invite_limit_reached' using errcode = '53400';
  end if;

  -- 32 random bytes as hex: unguessable, and safe in a URL or a chat message
  -- without escaping, which matters because this travels by hand.
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  issued_expiry := now() + valid_for;

  insert into public.invitations (token_hash, issued_by, note, expires_at)
  values (
    encode(extensions.digest(raw_token, 'sha256'), 'hex'),
    -- An operator need not be a member; the first invitation has no issuer.
    (select id from public.profiles where id = actor),
    trimmed_note,
    issued_expiry
  );

  return query select raw_token, issued_expiry;
end;
$$;

-- Anon is refused outright rather than by the check above: an unauthenticated
-- caller also has no `auth.uid()`, and the check treats a missing identity as
-- direct database access. Removing the grant is what makes that safe.
revoke execute on function private.is_operator() from public, anon;
grant execute on function private.is_operator() to authenticated;
revoke execute on function public.issue_invite(text, interval) from public, anon;
grant execute on function public.issue_invite(text, interval) to authenticated, service_role;
