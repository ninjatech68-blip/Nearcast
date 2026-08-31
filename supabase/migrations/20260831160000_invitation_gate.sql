-- ---------------------------------------------------------------
-- Membership requires an invitation.
--
-- MUST-001 makes alpha invite-only: a verified identity is not
-- membership, and a profile is what membership means here. Nothing
-- enforced that. Three paths created a profile and none of them asked
-- whether the person had been invited:
--
--   1. the `profiles_insert_self` policy, used by profile-sync's upsert
--   2. `publish_cast`, which created one if the foreign key needed it
--   3. therefore, in effect, any email that could receive a one-time code
--
-- So the closed alpha was open. This closes it: redemption becomes the
-- only path that creates a profile, and the other two are removed.
--
-- Existing members are grandfathered. Anyone who already has a profile
-- keeps it, and `redeem_invite` returns `redeemed` for them rather than
-- consuming an invitation. No invitation rows are backfilled for them:
-- inventing a record of an invitation nobody issued would be a lie in
-- the audit trail, and the honest answer is that they predate the gate.
-- ---------------------------------------------------------------

-- Raw tokens are never stored. Only a SHA-256 hash is kept, so a
-- database disclosure hands out no working invitations.
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  issued_by uuid references public.profiles(id) on delete set null,
  note text check (note is null or char_length(btrim(note)) between 1 and 120),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((redeemed_at is null) = (redeemed_by is null))
);

create index invitations_open_idx
  on public.invitations (expires_at)
  where redeemed_at is null;

-- Every attempt, valid or not, so guessing a token is bounded rather
-- than merely discouraged.
create table public.invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  attempted_at timestamptz not null default now()
);

create index invite_attempts_user_time_idx
  on public.invite_attempts (user_id, attempted_at desc);

-- Neither table is client-readable. RLS on with no policies denies every
-- authenticated path; only the definer functions below touch them.
alter table public.invitations enable row level security;
alter table public.invite_attempts enable row level security;

-- Membership is granted by redemption, never by the client.
drop policy if exists profiles_insert_self on public.profiles;

-- ---------------------------------------------------------------
-- Who may issue an invitation.
--
-- The cohort is approved by the team rather than grown by members, so
-- there is no member quota and no invite button in the app. Two callers
-- are legitimate: direct database access, where `auth.uid()` is null and
-- the caller already holds credentials that could write the table by
-- hand; and a signed-in operator identified by `app_metadata`.
--
-- `app_metadata` and not `user_metadata`: a client can write its own
-- user metadata through `auth.updateUser`, so a role kept there is one
-- any member can award themselves. The suite asserts that path is
-- refused, because it is the mistake this distinction exists to prevent.
-- ---------------------------------------------------------------
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
  if actor is not null and not private.is_operator() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if valid_for <= interval '0' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if trimmed_note is not null and char_length(trimmed_note) > 120 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  -- Not a security boundary: an operator raises it by letting invitations
  -- be redeemed or lapse. It stops a loop or a fat-fingered repeat from
  -- minting thousands of live ways into a closed alpha. Sized to the
  -- cohort the roadmap describes.
  select count(*) into outstanding
  from public.invitations
  where redeemed_at is null and public.invitations.expires_at > now();

  if outstanding >= 50 then
    raise exception 'invite_limit_reached' using errcode = '53400';
  end if;

  -- 32 random bytes as hex: unguessable, and safe in a URL or a chat
  -- message without escaping, which matters because this travels by hand.
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

-- ---------------------------------------------------------------
-- Redemption: the only path that creates a profile.
--
-- Recoverable failures return an outcome instead of raising. That is
-- load-bearing rather than stylistic: `raise exception` aborts the whole
-- call, which would roll back the `invite_attempts` row written moments
-- earlier and leave the rate limit permanently at zero. Returning lets
-- the attempt commit, so guessing is actually bounded.
--
-- One generic outcome covers missing, expired and already-redeemed
-- tokens, so a caller cannot probe which invitations exist.
-- ---------------------------------------------------------------
create or replace function public.redeem_invite(
  invite_token text,
  chosen_display_name text
)
returns table (outcome text, member_id uuid, member_display_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  trimmed_name text := btrim(chosen_display_name);
  presented_hash text;
  recent_attempts integer;
  invitation public.invitations;
  member public.profiles;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Idempotent, and how grandfathered members pass: someone who already
  -- has a profile keeps it rather than consuming a second invitation.
  select * into member from public.profiles where id = actor;
  if member.id is not null then
    return query select 'redeemed'::text, member.id, member.display_name;
    return;
  end if;

  if char_length(trimmed_name) < 1 or char_length(trimmed_name) > 60 then
    return query select 'invalid_input'::text, null::uuid, null::text;
    return;
  end if;

  select count(*) into recent_attempts
  from public.invite_attempts a
  where a.user_id = actor and a.attempted_at > now() - interval '1 hour';

  if recent_attempts >= 10 then
    return query select 'rate_limited'::text, null::uuid, null::text;
    return;
  end if;

  insert into public.invite_attempts (user_id) values (actor);

  presented_hash := encode(extensions.digest(btrim(invite_token), 'sha256'), 'hex');

  select * into invitation
  from public.invitations
  where token_hash = presented_hash
  for update;

  if invitation.id is null
     or invitation.redeemed_at is not null
     or invitation.expires_at <= now() then
    return query select 'invalid_invite'::text, null::uuid, null::text;
    return;
  end if;

  insert into public.profiles (id, display_name)
  values (actor, trimmed_name)
  returning * into member;

  update public.invitations
  set redeemed_at = now(), redeemed_by = actor
  where id = invitation.id;

  return query select 'redeemed'::text, member.id, member.display_name;
end;
$$;

-- ---------------------------------------------------------------
-- Publishing no longer creates a profile.
--
-- The safety net added in 20260828210000 became the hole: it meant
-- publishing granted membership. A caster without a profile is now a
-- caster who never redeemed an invitation, and the honest answer is to
-- refuse rather than to enrol them.
-- ---------------------------------------------------------------
create or replace function public.publish_cast(
  cast_category public.cast_category,
  cast_statement text,
  area_name text,
  cast_radius_km smallint,
  cast_expires_at timestamptz,
  area_latitude double precision default null,
  area_longitude double precision default null,
  cast_starts_at timestamptz default null,
  cast_coarse_window text default null
)
returns public.intents
language plpgsql security definer set search_path = '' as $$
declare
  caster uuid := auth.uid();
  created public.intents;
begin
  if caster is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if cast_expires_at <= now() then
    raise exception 'expiry_in_the_past' using errcode = '23514';
  end if;
  if cast_radius_km is null or cast_radius_km < 1 or cast_radius_km > 100 then
    raise exception 'radius_out_of_range' using errcode = '23514';
  end if;

  -- Membership, not a foreign-key convenience. This block used to insert
  -- the missing profile, which quietly made publishing a way to join a
  -- closed alpha. A caster without a profile never redeemed an
  -- invitation, and the honest answer is to refuse rather than enrol.
  if not exists (select 1 from public.profiles where id = caster) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  insert into public.intents (broadcaster_id, category, statement, status, expires_at, published_at)
  values (caster, cast_category, cast_statement, 'live', cast_expires_at, now())
  returning * into created;

  insert into public.intent_context (intent_id, approximate_place, approximate_geography, starts_at, coarse_window)
  values (
    created.id,
    area_name,
    case
      when area_latitude is null or area_longitude is null then null
      else extensions.ST_SetSRID(
             extensions.ST_MakePoint(round(area_longitude::numeric, 3)::double precision,
                                     round(area_latitude::numeric, 3)::double precision),
             4326)::extensions.geography
    end,
    cast_starts_at,
    cast_coarse_window
  );

  insert into public.intent_reach (intent_id, radius_km) values (created.id, cast_radius_km);

  insert into public.intent_events (intent_id, actor_id, event_type, from_status, to_status)
  values (created.id, caster, 'intent_published', 'draft', 'live');

  return created;
end;
$$;

revoke execute on function private.is_operator() from public, anon;
grant execute on function private.is_operator() to authenticated;
revoke execute on function public.issue_invite(text, interval) from public, anon;
grant execute on function public.issue_invite(text, interval) to authenticated, service_role;
revoke execute on function public.redeem_invite(text, text) from public, anon;
grant execute on function public.redeem_invite(text, text) to authenticated;
