-- ---------------------------------------------------------------
-- Analytics that can actually be written, and deletion that deletes.
--
-- Two requirements, in one migration because MUST-103 joins them: account
-- deletion must propagate to analytics identifiers.
-- ---------------------------------------------------------------

-- ANALYTICS (MUST-100 to MUST-102)
--
-- `analytics_outbox` had RLS on with no policies and no grant, so no client
-- could write a single event. Four requirements rested on a table nothing
-- could reach.
--
-- Insert only, and only as yourself. A client that could read the outbox
-- could read everyone's funnel; a client that could write someone else's
-- actor_id could forge it. Neither is needed to send an event.
--
-- Content is bounded on the app side by an allow-list built from the
-- documented taxonomy, so a property the taxonomy does not name for its
-- event never arrives. That is the enforcement for MUST-101; this is only
-- the door.
grant insert on public.analytics_outbox to authenticated;

create policy analytics_insert_self on public.analytics_outbox
  for insert to authenticated
  with check (actor_id is null or actor_id = auth.uid());

-- DELETION (MUST-004, MUST-103)
--
-- The delete-account screen wiped the device and returned to sign-in. Its
-- own comment described a server that "tombstones the profile immediately
-- and hard-deletes within 30 days" — and no such call existed. So the
-- account, the casts, the responses and the messages all stayed, while the
-- screen told the person their profile was gone. Untrue, and the rule
-- against fabricating extends to what the app says about itself.
--
-- Tombstone rather than cascade delete, for the reason MUST-054 gives:
-- necessary safety history has to survive. A hard delete here would also
-- take the other side of every conversation and every report made about
-- this person.
--
-- `is_restricted` is set as part of it, deliberately: every discovery and
-- delivery path already filters on it, so a tombstoned account leaves the
-- product immediately without a single read path being rewritten.

alter table public.profiles
  add column deleted_at timestamptz;

comment on column public.profiles.deleted_at is
  'Set by delete_my_account. A retention job hard-deletes these after the '
  'window in the community policy; nothing else reads it.';

create index profiles_deleted_idx on public.profiles (deleted_at)
  where deleted_at is not null;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Live casts come down. Withdrawn rather than deleted, so anyone who had
  -- already responded sees a withdrawn cast instead of a missing one.
  update public.intents
  set status = 'withdrawn', updated_at = now()
  where broadcaster_id = actor
    and status in ('live', 'matched');

  -- Open requests this person sent are withdrawn too, so no caster is left
  -- deciding about somebody who has gone.
  update public.responses
  set status = 'withdrawn', updated_at = now()
  where respondent_id = actor
    and status = 'pending';

  -- MUST-103: the identifier goes, the counts stay. A funnel that loses its
  -- denominator every time somebody leaves cannot be read.
  update public.analytics_outbox
  set actor_id = null
  where actor_id = actor;

  -- Everything the delete screen promises goes, actually goes. These are all
  -- rows about this person only, so removing them rewrites nobody else's
  -- record — which is the line the screen draws between what goes and what
  -- stays.
  delete from public.profile_areas where profile_id = actor;
  delete from public.profile_interests where profile_id = actor;
  delete from public.circle_members where member_id = actor;
  delete from public.blocks where blocker_id = actor;
  delete from public.notification_preferences where profile_id = actor;
  delete from public.profile_private where profile_id = actor;

  -- The tombstone. The name goes because it is the one field of theirs that
  -- other people see; `is_restricted` is what removes them from discovery.
  update public.profiles
  set deleted_at = now(),
      display_name = 'deleted account',
      avatar_path = null,
      active_windows = '{}'::text[],
      is_restricted = true,
      updated_at = now()
  where id = actor;

  -- Device tokens are useless now and would keep a deleted account
  -- receiving pushes until they expired.
  delete from public.device_push_tokens where user_id = actor;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
