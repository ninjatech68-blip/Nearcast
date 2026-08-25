-- Account deletion (MUST-004) and retention jobs (Doc 04 retention table).
--
-- Deletion here is the database half of the delete-account contract in
-- docs/16: it removes or anonymizes the person's data while preserving safety
-- evidence and the other party's history, marks the profile, and records a
-- minimal suppression row. Revoking auth sessions and removing the auth.users
-- row need the service role and belong to the Edge half of B-8 — this
-- function is what that Edge function will call first.

alter table public.profiles add column deleted_at timestamptz;

create table public.account_deletions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id),
  requested_at timestamptz not null default now()
);

alter table public.account_deletions enable row level security;
revoke all on public.account_deletions from anon, authenticated;

-- Every mutation function resolves its actor through this helper, so one
-- change closes all of them to deleted accounts.
create or replace function private.require_actor()
returns uuid language plpgsql stable set search_path = '' as $$
declare actor uuid;
begin
  actor := auth.uid();
  if actor is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if exists (
    select 1 from public.profiles
    where id = actor and deleted_at is not null
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  return actor;
end;
$$;

create or replace function public.delete_account(confirmation text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  target public.profiles;
  suppression_id uuid;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if confirmation is distinct from 'DELETE' then
    raise exception 'invalid_input' using errcode = '22000';
  end if;

  select * into target from public.profiles where id = actor for update;
  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  -- Idempotent: a repeated request returns the existing suppression record.
  if target.deleted_at is not null then
    select id into suppression_id from public.account_deletions where profile_id = actor;
    return suppression_id;
  end if;

  -- Own open intents are withdrawn; their rooms close; drafts vanish whole.
  update public.intents
  set status = 'withdrawn', version = version + 1
  where broadcaster_id = actor and status in ('live', 'matched');

  insert into public.intent_events (intent_id, actor_id, event_type, to_status, metadata)
  select id, actor, 'intent_closed', 'withdrawn', jsonb_build_object('outcome', 'account_deleted')
  from public.intents
  where broadcaster_id = actor and status = 'withdrawn';

  update public.conversations c
  set closed_at = now()
  from public.matches m
  where m.id = c.match_id
    and c.closed_at is null
    and (m.broadcaster_id = actor or m.participant_id = actor);

  delete from public.intents where broadcaster_id = actor and status = 'draft';

  -- Exact location and contact details are personal data: cleared now, ahead
  -- of the normal thirty-day window.
  update public.intent_private p
  set exact_geography = null, exact_address = null,
      private_contact = null, coordination_notes = null,
      updated_at = now()
  from public.intents i
  where i.id = p.intent_id and i.broadcaster_id = actor;

  -- Pending responses vanish; decided ones are redacted so the other party's
  -- match history survives without the person's words.
  delete from public.responses where respondent_id = actor and status = 'pending';
  update public.responses
  set message = 'Deleted by the account owner', qualification = '{}'::jsonb
  where respondent_id = actor;

  update public.messages
  set body = 'Message deleted with the account'
  where sender_id = actor;

  -- Confirmations counted this person; a deleted account may not keep
  -- inflating genuine-support counts.
  delete from public.intent_confirmations where confirmer_id = actor;
  delete from public.intent_deliveries where recipient_id = actor;
  delete from public.devices where profile_id = actor;
  delete from public.verifications where profile_id = actor;
  delete from public.profile_private where profile_id = actor;
  delete from public.reliability_aggregates where profile_id = actor;
  delete from public.idempotency_keys where actor_id = actor;
  delete from public.notification_jobs where recipient_id = actor;
  update public.invitations set issued_by = null where issued_by = actor;
  -- Blocks stay: they protect the other party and carry no personal content.
  -- Reports stay: safety evidence outlives the account (Doc 04).

  update public.profiles
  set display_name = 'Deleted member', city = null, avatar_path = null, deleted_at = now()
  where id = actor;

  insert into public.account_deletions (profile_id) values (actor)
  returning id into suppression_id;

  return suppression_id;
end;
$$;

-- Recreated with one added predicate: a deleted profile is never a candidate.
create or replace function public.generate_deliveries(target_intent_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  target public.intents;
  current_reach public.intent_reach;
  broadcaster_city text;
  inserted integer;
begin
  select * into target from public.intents where id = target_intent_id;
  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if actor is not null and actor <> target.broadcaster_id then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if target.status <> 'live' or target.expires_at <= now() then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  select * into current_reach from public.intent_reach where intent_id = target.id;
  if current_reach.intent_id is null or current_reach.level = 'origin_only' then
    return 0;
  end if;

  select city into broadcaster_city from public.profiles where id = target.broadcaster_id;

  with candidates as (
    select
      p.id as recipient_id,
      case
        when private.has_trust_connection(target.broadcaster_id, p.id)
          then 'adjacent_trust_connection'
        when broadcaster_city is not null and p.city = broadcaster_city
          then 'nearby_interest_match'
        else 'broader_approved_match'
      end as reason_code
    from public.profiles p
    where p.id <> target.broadcaster_id
      and p.deleted_at is null
      and not p.is_restricted
      and not private.is_blocked(target.broadcaster_id, p.id)
  ),
  eligible as (
    select recipient_id, reason_code
    from candidates
    where case reason_code
        when 'adjacent_trust_connection' then private.reach_rank(current_reach.level) >= 2
        when 'nearby_interest_match' then private.reach_rank(current_reach.level) >= 3
        else private.reach_rank(current_reach.level) >= 4
      end
      and not exists (
        select 1 from public.intent_deliveries d
        where d.intent_id = target.id and d.recipient_id = candidates.recipient_id
      )
      and not exists (
        select 1 from public.responses r
        where r.intent_id = target.id and r.respondent_id = candidates.recipient_id
      )
    order by case reason_code
        when 'adjacent_trust_connection' then 1
        when 'nearby_interest_match' then 2
        else 3
      end
    limit 50
  )
  insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text)
  select
    target.id,
    recipient_id,
    reason_code,
    case reason_code
      when 'adjacent_trust_connection' then 'Shared through one trusted connection'
      when 'nearby_interest_match' then 'In your area and relevant to this intent'
      else 'Within the approved broader reach for this intent'
    end
  from eligible
  on conflict (intent_id, recipient_id) do nothing;

  get diagnostics inserted = row_count;

  if inserted > 0 then
    insert into public.intent_events (intent_id, actor_id, event_type, metadata)
    values (target.id, actor, 'deliveries_generated',
            jsonb_build_object('delivered_count', inserted, 'reach_level', current_reach.level));
  end if;

  return inserted;
end;
$$;

-- Scheduled retention per the Doc 04 table. Runs in a trusted server context;
-- clients cannot execute it. Further rows of the table (12-month intent
-- history, 13-month analytics, 24-month moderation evidence) join here as
-- those windows become reachable.
create or replace function public.apply_retention_policy()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  messages_deleted integer;
  locations_cleared integer;
begin
  -- Temporary messages: 90 days after the room closes.
  delete from public.messages m
  using public.conversations c
  where c.id = m.conversation_id
    and c.closed_at is not null
    and c.closed_at < now() - interval '90 days';
  get diagnostics messages_deleted = row_count;

  -- Exact coordination location: 30 days after the intent closes.
  update public.intent_private p
  set exact_geography = null, exact_address = null,
      private_contact = null, coordination_notes = null,
      updated_at = now()
  from public.intents i
  where i.id = p.intent_id
    and i.status in ('resolved', 'expired', 'withdrawn')
    and coalesce(i.resolved_at, i.expires_at) < now() - interval '30 days'
    and (p.exact_geography is not null or p.exact_address is not null
         or p.private_contact is not null or p.coordination_notes is not null);
  get diagnostics locations_cleared = row_count;

  return jsonb_build_object(
    'messages_deleted', messages_deleted,
    'locations_cleared', locations_cleared
  );
end;
$$;

revoke execute on function public.delete_account(text) from public, anon;
grant execute on function public.delete_account(text) to authenticated;
revoke execute on function public.apply_retention_policy() from public, anon, authenticated;
