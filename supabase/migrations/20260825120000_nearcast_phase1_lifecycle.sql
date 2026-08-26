-- Nearcast Phase 1: invitation, publish, reach, response, coordination, resolution.
-- Implements the server boundary in docs/16 - API Contracts.md. Every privileged
-- transition lives in a security-definer function; clients never mutate lifecycle
-- state directly. Errors use the stable codes defined in the API contract.

-- ============================================================ enumerations

create type public.resolution_outcome as enum (
  'resolved_through_nearcast',
  'resolved_elsewhere',
  'no_longer_needed',
  'could_not_resolve',
  'withdrawn'
);

create type public.verification_kind as enum ('email', 'phone', 'identity_document');
create type public.verification_state as enum ('pending', 'verified', 'failed', 'expired');
create type public.device_platform as enum ('ios', 'android');

-- ================================================================= tables

-- Invitation-only access for the closed alpha. Tokens are stored hashed so a
-- database read cannot be replayed as a redemption.
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  issued_by uuid references public.profiles(id) on delete set null,
  note text check (char_length(note) <= 200),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((consumed_at is null) = (consumed_by is null))
);

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind public.verification_kind not null,
  state public.verification_state not null default 'pending',
  provider_reference text,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (profile_id, kind),
  check ((state = 'verified') = (verified_at is not null))
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  push_token text not null unique,
  platform public.device_platform not null,
  locale text,
  notify_responses boolean not null default true,
  notify_decisions boolean not null default true,
  notify_messages boolean not null default true,
  notify_expiry boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Contextual follow-through history. Never a single universal score: reliability
-- is stored per intent primitive and is derived only from confirmed outcomes.
create table public.reliability_aggregates (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  context public.intent_primitive not null,
  completed_count bigint not null default 0 check (completed_count >= 0),
  confirmed_count bigint not null default 0 check (confirmed_count >= 0),
  disputed_count bigint not null default 0 check (disputed_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (profile_id, context)
);

-- Immutable enforcement audit. No update or delete policy exists for any role.
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete set null,
  moderator_id uuid not null references public.profiles(id),
  subject_type text not null check (subject_type in ('profile', 'intent', 'response', 'message')),
  subject_id uuid not null,
  action text not null check (action in ('warn', 'remove_content', 'reduce_reach', 'require_verification', 'restrict', 'suspend', 'dismiss')),
  reason_code text not null,
  captured_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Actor-scoped replay protection required by the API contract.
create table public.idempotency_keys (
  actor_id uuid not null references public.profiles(id) on delete cascade,
  operation text not null,
  key uuid not null,
  fingerprint text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (actor_id, operation, key)
);

-- ============================================================= private helpers

create or replace function private.reach_rank(level public.reach_level)
returns integer language sql immutable set search_path = '' as $$
  select case level
    when 'origin_only' then 1
    when 'adjacent_network' then 2
    when 'nearby_relevant' then 3
    when 'broader_approved' then 4
  end;
$$;

create or replace function private.require_actor()
returns uuid language plpgsql stable set search_path = '' as $$
declare actor uuid;
begin
  actor := auth.uid();
  if actor is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return actor;
end;
$$;

create or replace function private.is_moderator()
returns boolean language sql stable set search_path = '' as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb
      -> 'app_metadata' ->> 'role' = 'moderator',
    false
  );
$$;

-- Returns the stored result on an identical replay, raises conflict when the
-- same key is reused for a different request, and records the key otherwise.
create or replace function private.claim_idempotency(
  actor uuid,
  operation_name text,
  key_value uuid,
  request_fingerprint text
)
returns jsonb language plpgsql set search_path = '' as $$
declare existing public.idempotency_keys;
begin
  select * into existing from public.idempotency_keys
  where actor_id = actor and operation = operation_name and key = key_value
  for update;

  if found then
    if existing.fingerprint is distinct from request_fingerprint then
      raise exception 'conflict' using errcode = '23505';
    end if;
    return coalesce(existing.result, '{"replayed":true}'::jsonb);
  end if;

  insert into public.idempotency_keys (actor_id, operation, key, fingerprint)
  values (actor, operation_name, key_value, request_fingerprint);
  return null;
end;
$$;

create or replace function private.record_idempotent_result(
  actor uuid, operation_name text, key_value uuid, payload jsonb
)
returns void language sql set search_path = '' as $$
  update public.idempotency_keys set result = payload
  where actor_id = actor and operation = operation_name and key = key_value;
$$;

create or replace function private.queue_notification(
  recipient uuid, event text, object_type_name text, object uuid
)
returns void language sql set search_path = '' as $$
  insert into public.notification_jobs (recipient_id, event_type, object_type, object_id, idempotency_key)
  values (recipient, event, object_type_name, object, event || ':' || object::text || ':' || recipient::text)
  on conflict (idempotency_key) do nothing;
$$;

create or replace function private.refresh_reliability(subject uuid, subject_context public.intent_primitive)
returns void language sql set search_path = '' as $$
  insert into public.reliability_aggregates as ra (profile_id, context, completed_count, confirmed_count, disputed_count, updated_at)
  select
    subject,
    subject_context,
    count(*) filter (where o.completed and not o.disputed),
    count(*),
    count(*) filter (where o.disputed),
    now()
  from public.interaction_outcomes o
  join public.matches m on m.id = o.match_id
  join public.intents i on i.id = m.intent_id
  where i.primitive = subject_context
    and o.reporter_id <> subject
    and subject in (m.broadcaster_id, m.participant_id)
  on conflict (profile_id, context) do update set
    completed_count = excluded.completed_count,
    confirmed_count = excluded.confirmed_count,
    disputed_count = excluded.disputed_count,
    updated_at = now();
$$;

-- ============================================================ invitation flow

create or replace function public.redeem_invite(invite_token text, chosen_display_name text)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_actor();
  invitation public.invitations;
  created public.profiles;
begin
  if exists (select 1 from public.profiles where id = actor) then
    raise exception 'conflict' using errcode = '23505';
  end if;

  select * into invitation from public.invitations
  where token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
  for update;

  -- One generic error for unknown, expired, and consumed tokens so a caller
  -- cannot probe which invitations exist.
  if invitation.id is null
     or invitation.consumed_at is not null
     or invitation.expires_at <= now() then
    raise exception 'invalid_invitation' using errcode = '42501';
  end if;

  insert into public.profiles (id, display_name)
  values (actor, btrim(chosen_display_name))
  returning * into created;

  update public.invitations
  set consumed_at = now(), consumed_by = actor
  where id = invitation.id;

  return created;
end;
$$;

-- ============================================================= publish intent

create or replace function public.publish_intent(
  draft_intent_id uuid,
  expected_version integer,
  target_reach public.reach_level,
  enable_public_link boolean,
  show_first_name boolean,
  idempotency_key uuid
)
returns public.intents language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_actor();
  draft public.intents;
  fingerprint text;
  replayed jsonb;
begin
  fingerprint := draft_intent_id::text || '|' || target_reach::text || '|'
                 || enable_public_link::text || '|' || show_first_name::text;
  replayed := private.claim_idempotency(actor, 'publish_intent', idempotency_key, fingerprint);
  if replayed is not null then
    select * into draft from public.intents where id = draft_intent_id;
    return draft;
  end if;

  select * into draft from public.intents where id = draft_intent_id for update;

  if draft.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if draft.broadcaster_id <> actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if draft.status <> 'draft' then
    raise exception 'stale_state' using errcode = '40001';
  end if;
  if draft.version <> expected_version then
    raise exception 'stale_state' using errcode = '40001';
  end if;
  if draft.expires_at <= now() then
    raise exception 'invalid_input' using errcode = '22000';
  end if;

  -- Required context and reach rows must exist before an intent is discoverable.
  insert into public.intent_context (intent_id) values (draft.id)
  on conflict (intent_id) do nothing;

  insert into public.intent_reach (intent_id, level, public_link_enabled, show_broadcaster_first_name)
  values (draft.id, target_reach, enable_public_link, show_first_name)
  on conflict (intent_id) do update set
    level = excluded.level,
    public_link_enabled = excluded.public_link_enabled,
    show_broadcaster_first_name = excluded.show_broadcaster_first_name,
    updated_at = now();

  update public.intents
  set status = 'live', published_at = now(), version = version + 1
  where id = draft.id
  returning * into draft;

  insert into public.intent_events (intent_id, actor_id, event_type, from_status, to_status, metadata)
  values (draft.id, actor, 'intent_published', 'draft', 'live',
          jsonb_build_object('reach_level', target_reach));

  perform private.record_idempotent_result(
    actor, 'publish_intent', idempotency_key,
    jsonb_build_object('intent_id', draft.id, 'status', draft.status, 'version', draft.version));

  return draft;
end;
$$;

-- ============================================================== reach control

create or replace function public.change_intent_reach(
  target_intent_id uuid,
  expected_version integer,
  target_level public.reach_level,
  disclosure_confirmed boolean
)
returns public.intent_reach language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_actor();
  target public.intents;
  current_reach public.intent_reach;
begin
  select * into target from public.intents where id = target_intent_id for update;
  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if target.broadcaster_id <> actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if target.version <> expected_version then
    raise exception 'stale_state' using errcode = '40001';
  end if;
  if target.status not in ('live', 'matched') then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  select * into current_reach from public.intent_reach where intent_id = target.id for update;

  -- Reach never widens without an informed action. Narrowing is always allowed.
  if private.reach_rank(target_level) > private.reach_rank(current_reach.level)
     and not disclosure_confirmed then
    raise exception 'disclosure_not_confirmed' using errcode = '42501';
  end if;

  update public.intent_reach
  set level = target_level,
      expanded_at = case
        when private.reach_rank(target_level) > private.reach_rank(current_reach.level)
        then now() else expanded_at end,
      updated_at = now()
  where intent_id = target.id
  returning * into current_reach;

  update public.intents set version = version + 1 where id = target.id;

  insert into public.intent_events (intent_id, actor_id, event_type, metadata)
  values (target.id, actor, 'reach_changed',
          jsonb_build_object('to_level', target_level));

  return current_reach;
end;
$$;

-- ============================================================ close and expire

create or replace function public.close_intent(
  target_intent_id uuid,
  expected_status public.intent_status,
  outcome public.resolution_outcome
)
returns public.intents language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_actor();
  target public.intents;
  next_status public.intent_status;
begin
  select * into target from public.intents where id = target_intent_id for update;
  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if target.broadcaster_id <> actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if target.status <> expected_status then
    raise exception 'stale_state' using errcode = '40001';
  end if;
  if target.status not in ('draft', 'live', 'matched') then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  next_status := (case when outcome = 'withdrawn' then 'withdrawn' else 'resolved' end)::public.intent_status;

  update public.intents
  set status = next_status,
      resolved_at = case when next_status = 'resolved' then now() else resolved_at end,
      version = version + 1
  where id = target.id
  returning * into target;

  -- New responses stop immediately; existing rooms close with the intent.
  update public.conversations c set closed_at = now()
  from public.matches m
  where m.id = c.match_id and m.intent_id = target.id and c.closed_at is null;

  insert into public.intent_events (intent_id, actor_id, event_type, from_status, to_status, metadata)
  values (target.id, actor, 'intent_closed', expected_status, next_status,
          jsonb_build_object('outcome', outcome));

  return target;
end;
$$;

-- Scheduled job. Without this the stored status drifts from reality even though
-- read predicates already hide lapsed intents.
create or replace function public.expire_intents()
returns integer language plpgsql security definer set search_path = '' as $$
declare expired_count integer;
begin
  with lapsed as (
    update public.intents
    set status = 'expired', version = version + 1
    where status in ('live', 'matched') and expires_at <= now()
    returning id, status
  )
  insert into public.intent_events (intent_id, event_type, to_status, metadata)
  select id, 'intent_expired', 'expired', '{}'::jsonb from lapsed;

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

-- ========================================================= origin confirmation

create or replace function public.confirm_intent(requested_share_slug uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_actor();
  target public.intents;
  recent_attempts integer;
begin
  select i.* into target
  from public.intents i
  join public.intent_reach r on r.intent_id = i.id
  where i.share_slug = requested_share_slug
    and i.status = 'live'
    and i.expires_at > now()
    and r.public_link_enabled;

  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if target.broadcaster_id = actor then
    raise exception 'self_confirmation_forbidden' using errcode = '42501';
  end if;
  if private.is_blocked(target.broadcaster_id, actor) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select count(*) into recent_attempts
  from public.intent_confirmations
  where confirmer_id = actor and created_at > now() - interval '1 hour';
  if recent_attempts >= 20 then
    raise exception 'rate_limited' using errcode = '53400';
  end if;

  insert into public.intent_confirmations (intent_id, confirmer_id)
  values (target.id, actor)
  on conflict (intent_id, confirmer_id) do nothing;

  return (select count(*) from public.intent_confirmations where intent_id = target.id);
end;
$$;

-- =================================================================== responses

create or replace function public.submit_response(
  target_intent_id uuid,
  response_message text,
  qualification_answers jsonb,
  idempotency_key uuid
)
returns public.responses language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_actor();
  target public.intents;
  created public.responses;
  fingerprint text;
  replayed jsonb;
  recent integer;
begin
  fingerprint := target_intent_id::text || '|' || md5(response_message);
  replayed := private.claim_idempotency(actor, 'submit_response', idempotency_key, fingerprint);
  if replayed is not null then
    select * into created from public.responses
    where intent_id = target_intent_id and respondent_id = actor;
    return created;
  end if;

  -- MUST-041 caps qualifying questions at two.
  if jsonb_typeof(qualification_answers) <> 'object'
     or (select count(*) from jsonb_object_keys(qualification_answers)) > 2 then
    raise exception 'invalid_input' using errcode = '22000';
  end if;

  select * into target from public.intents where id = target_intent_id;
  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if target.status <> 'live' or target.expires_at <= now() then
    raise exception 'stale_state' using errcode = '40001';
  end if;
  if target.broadcaster_id = actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if private.is_blocked(target.broadcaster_id, actor) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.intent_deliveries
    where intent_id = target.id and recipient_id = actor and hidden_at is null
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select count(*) into recent from public.responses
  where respondent_id = actor and created_at > now() - interval '1 hour';
  if recent >= 30 then
    raise exception 'rate_limited' using errcode = '53400';
  end if;

  insert into public.responses (intent_id, respondent_id, message, qualification)
  values (target.id, actor, response_message, qualification_answers)
  returning * into created;

  perform private.queue_notification(target.broadcaster_id, 'response_received', 'response', created.id);
  perform private.record_idempotent_result(
    actor, 'submit_response', idempotency_key,
    jsonb_build_object('response_id', created.id, 'status', created.status));

  return created;
end;
$$;

create or replace function public.decide_response(
  target_response_id uuid,
  decision text,
  expected_intent_status public.intent_status
)
returns public.responses language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_actor();
  target public.responses;
  parent public.intents;
begin
  if decision not in ('accept', 'decline') then
    raise exception 'invalid_input' using errcode = '22000';
  end if;

  select * into target from public.responses where id = target_response_id for update;
  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  select * into parent from public.intents where id = target.intent_id for update;
  if parent.broadcaster_id <> actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if decision = 'decline' then
    if target.status <> 'pending' then
      raise exception 'stale_state' using errcode = '40001';
    end if;
    update public.responses set status = 'declined' where id = target.id returning * into target;
    insert into public.intent_events (intent_id, actor_id, event_type, metadata)
    values (parent.id, actor, 'response_declined', jsonb_build_object('response_id', target.id));
    -- Declined respondents receive a neutral status with no private reasoning.
    perform private.queue_notification(target.respondent_id, 'response_declined', 'response', target.id);
    return target;
  end if;

  perform public.accept_response(target.id, expected_intent_status);
  select * into target from public.responses where id = target.id;
  perform private.queue_notification(target.respondent_id, 'response_accepted', 'response', target.id);
  return target;
end;
$$;

-- ====================================================== progressive disclosure

create or replace function public.release_disclosure(
  target_match_id uuid,
  field_names text[]
)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_actor();
  target public.matches;
  released integer := 0;
  requested_field text;
begin
  select * into target from public.matches where id = target_match_id;
  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  -- Only the broadcaster owns the private intent fields, so only the
  -- broadcaster may release them.
  if target.broadcaster_id <> actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if target.closed_at is not null then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  foreach requested_field in array field_names loop
    if requested_field not in ('exact_geography', 'exact_address', 'private_contact', 'coordination_notes') then
      raise exception 'invalid_input' using errcode = '22000';
    end if;
    insert into public.match_disclosures (match_id, field_name, released_by)
    values (target.id, requested_field, actor)
    on conflict (match_id, field_name) do nothing;
    released := released + 1;
  end loop;

  return released;
end;
$$;

-- Column-level disclosure cannot be expressed as a row policy, so released
-- fields are projected through this function rather than by opening the row.
create or replace function public.get_match_disclosures(target_match_id uuid)
returns table (field_name text, field_value text)
language sql stable security definer set search_path = '' as $$
  select d.field_name,
         case d.field_name
           when 'exact_address' then p.exact_address
           when 'private_contact' then p.private_contact
           when 'coordination_notes' then p.coordination_notes
           when 'exact_geography' then extensions.st_astext(p.exact_geography)
         end
  from public.match_disclosures d
  join public.matches m on m.id = d.match_id
  join public.intent_private p on p.intent_id = m.intent_id
  where d.match_id = target_match_id
    and auth.uid() in (m.broadcaster_id, m.participant_id)
    and not private.is_blocked(m.broadcaster_id, m.participant_id);
$$;

-- =================================================================== messaging

create or replace function public.send_message(
  target_conversation_id uuid,
  body text,
  idempotency_key uuid
)
returns public.messages language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_actor();
  room public.conversations;
  target public.matches;
  created public.messages;
  fingerprint text;
  replayed jsonb;
begin
  fingerprint := target_conversation_id::text || '|' || md5(body);
  replayed := private.claim_idempotency(actor, 'send_message', idempotency_key, fingerprint);
  if replayed is not null then
    select * into created from public.messages
    where id = (replayed ->> 'message_id')::uuid;
    return created;
  end if;

  select * into room from public.conversations where id = target_conversation_id;
  if room.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if room.closed_at is not null then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  select * into target from public.matches where id = room.match_id;
  if actor not in (target.broadcaster_id, target.participant_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if private.is_blocked(target.broadcaster_id, target.participant_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (room.id, actor, body)
  returning * into created;

  perform private.queue_notification(
    case when actor = target.broadcaster_id then target.participant_id else target.broadcaster_id end,
    'message_received', 'conversation', room.id);
  perform private.record_idempotent_result(
    actor, 'send_message', idempotency_key, jsonb_build_object('message_id', created.id));

  return created;
end;
$$;

-- ====================================================================== safety

create or replace function public.create_report(
  subject_type text,
  subject_id uuid,
  reason_code text,
  details text
)
returns public.reports language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_actor();
  created public.reports;
  recent integer;
begin
  if subject_type not in ('profile', 'intent', 'response', 'message') then
    raise exception 'invalid_input' using errcode = '22000';
  end if;

  select count(*) into recent from public.reports
  where reporter_id = actor and created_at > now() - interval '1 hour';
  if recent >= 10 then
    raise exception 'rate_limited' using errcode = '53400';
  end if;

  -- Evidence is preserved regardless of whether the subject is later removed,
  -- and the caller learns nothing about whether the subject exists.
  insert into public.reports (reporter_id, subject_type, subject_id, reason_code, details)
  values (actor, subject_type, subject_id, reason_code, details)
  returning * into created;

  return created;
end;
$$;

-- ================================================================== resolution

create or replace function public.confirm_interaction_outcome(
  target_match_id uuid,
  completed boolean,
  disputed boolean
)
returns public.interaction_outcomes language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_actor();
  target public.matches;
  parent public.intents;
  created public.interaction_outcomes;
  counterparty uuid;
begin
  select * into target from public.matches where id = target_match_id;
  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if actor not in (target.broadcaster_id, target.participant_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  insert into public.interaction_outcomes (match_id, reporter_id, completed, disputed)
  values (target.id, actor, completed, disputed)
  on conflict (match_id, reporter_id) do update set
    completed = excluded.completed, disputed = excluded.disputed
  returning * into created;

  select * into parent from public.intents where id = target.intent_id;
  counterparty := case when actor = target.broadcaster_id
                       then target.participant_id else target.broadcaster_id end;

  -- Only the counterparty's reliability moves, and only from confirmed outcomes.
  perform private.refresh_reliability(counterparty, parent.primitive);

  return created;
end;
$$;

-- ================================================= row level security policies

alter table public.invitations enable row level security;
alter table public.verifications enable row level security;
alter table public.devices enable row level security;
alter table public.reliability_aggregates enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.idempotency_keys enable row level security;

-- invitations, moderation_actions and idempotency_keys carry no client policy
-- and no client grant. They are reachable only through definer functions.

create policy verifications_read_self on public.verifications for select to authenticated
using (profile_id = auth.uid());

create policy devices_manage_self on public.devices for all to authenticated
using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Contextual reliability is visible to other users by design; it contains no
-- score, only counts derived from confirmed outcomes.
create policy reliability_read_authenticated on public.reliability_aggregates for select to authenticated
using (not private.is_blocked(profile_id, auth.uid()));

-- ---- tighten three foundation read policies that leaned on an implicit subquery

drop policy if exists context_read_visible_intent on public.intent_context;
create policy context_read_visible_intent on public.intent_context for select to authenticated
using (private.can_read_intent(intent_id, auth.uid()));

drop policy if exists reach_read_visible_intent on public.intent_reach;
create policy reach_read_visible_intent on public.intent_reach for select to authenticated
using (private.can_read_intent(intent_id, auth.uid()));

drop policy if exists confirmations_read_visible_intent on public.intent_confirmations;
create policy confirmations_read_visible_intent on public.intent_confirmations for select to authenticated
using (private.can_read_intent(intent_id, auth.uid()));

-- ===================================================================== grants

grant select, insert, update, delete on public.verifications, public.devices to authenticated;
grant select on public.reliability_aggregates to authenticated;

revoke all on public.invitations from anon, authenticated;
revoke all on public.moderation_actions from anon, authenticated;
revoke all on public.idempotency_keys from anon, authenticated;

revoke execute on function private.reach_rank(public.reach_level) from public, anon, authenticated;
revoke execute on function private.require_actor() from public, anon;
revoke execute on function private.is_moderator() from public, anon;
revoke execute on function private.claim_idempotency(uuid, text, uuid, text) from public, anon, authenticated;
revoke execute on function private.record_idempotent_result(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function private.queue_notification(uuid, text, text, uuid) from public, anon, authenticated;
revoke execute on function private.refresh_reliability(uuid, public.intent_primitive) from public, anon, authenticated;

revoke execute on function public.redeem_invite(text, text) from public, anon;
revoke execute on function public.publish_intent(uuid, integer, public.reach_level, boolean, boolean, uuid) from public, anon;
revoke execute on function public.change_intent_reach(uuid, integer, public.reach_level, boolean) from public, anon;
revoke execute on function public.close_intent(uuid, public.intent_status, public.resolution_outcome) from public, anon;
revoke execute on function public.expire_intents() from public, anon, authenticated;
revoke execute on function public.confirm_intent(uuid) from public, anon;
revoke execute on function public.submit_response(uuid, text, jsonb, uuid) from public, anon;
revoke execute on function public.decide_response(uuid, text, public.intent_status) from public, anon;
revoke execute on function public.release_disclosure(uuid, text[]) from public, anon;
revoke execute on function public.get_match_disclosures(uuid) from public, anon;
revoke execute on function public.send_message(uuid, text, uuid) from public, anon;
revoke execute on function public.create_report(text, uuid, text, text) from public, anon;
revoke execute on function public.confirm_interaction_outcome(uuid, boolean, boolean) from public, anon;

grant execute on function public.redeem_invite(text, text) to authenticated;
grant execute on function public.publish_intent(uuid, integer, public.reach_level, boolean, boolean, uuid) to authenticated;
grant execute on function public.change_intent_reach(uuid, integer, public.reach_level, boolean) to authenticated;
grant execute on function public.close_intent(uuid, public.intent_status, public.resolution_outcome) to authenticated;
grant execute on function public.confirm_intent(uuid) to authenticated;
grant execute on function public.submit_response(uuid, text, jsonb, uuid) to authenticated;
grant execute on function public.decide_response(uuid, text, public.intent_status) to authenticated;
grant execute on function public.release_disclosure(uuid, text[]) to authenticated;
grant execute on function public.get_match_disclosures(uuid) to authenticated;
grant execute on function public.send_message(uuid, text, uuid) to authenticated;
grant execute on function public.create_report(text, uuid, text, text) to authenticated;
grant execute on function public.confirm_interaction_outcome(uuid, boolean, boolean) to authenticated;
