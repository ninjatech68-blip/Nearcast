-- Invitation-gated accounts.
--
-- Closed alpha is invite-only, so a signed-in identity is not yet a member. A
-- profile is created only inside `redeem_invite`, which means "has a profile"
-- is the app's membership test and cannot be forged by a client insert.
--
-- Raw invitation tokens are never stored. Only a SHA-256 hash is kept, so a
-- database disclosure does not hand out working invitations.

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

-- Redemption attempts, for rate limiting. Recorded for every attempt, valid or
-- not, so guessing a token is bounded rather than merely discouraged.
create table public.invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  attempted_at timestamptz not null default now()
);

create index invite_attempts_user_time_idx
  on public.invite_attempts (user_id, attempted_at desc);

-- Neither table is client-readable. RLS on with no policies denies every
-- authenticated path; only the definer function below touches them.
alter table public.invitations enable row level security;
alter table public.invite_attempts enable row level security;

-- Membership is granted by redemption, never by the client. A signed-in user
-- can no longer create their own profile row.
drop policy profiles_insert_self on public.profiles;

-- Redemption reports an outcome instead of raising for recoverable failures.
-- This is load-bearing, not stylistic: `raise exception` aborts the whole
-- function call, which would roll back the `invite_attempts` row written
-- moments earlier and leave the rate limit permanently at zero. Returning lets
-- the attempt commit, so guessing is actually bounded.

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

  -- Redemption is idempotent: an already-joined user keeps their profile
  -- rather than consuming a second invitation on a retry.
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
  from public.invite_attempts
  where user_id = actor and attempted_at > now() - interval '1 hour';

  if recent_attempts >= 5 then
    return query select 'rate_limited'::text, null::uuid, null::text;
    return;
  end if;

  insert into public.invite_attempts (user_id) values (actor);

  presented_hash := encode(extensions.digest(btrim(invite_token), 'sha256'), 'hex');

  select * into invitation
  from public.invitations
  where token_hash = presented_hash
  for update;

  -- One generic outcome for missing, expired and already-redeemed tokens, so a
  -- caller cannot probe which invitations exist.
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

revoke execute on function public.redeem_invite(text, text) from public, anon;
grant execute on function public.redeem_invite(text, text) to authenticated;
