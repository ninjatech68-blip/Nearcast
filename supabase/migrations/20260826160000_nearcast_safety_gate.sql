-- Pre-alpha safety gate (MUST-075, MUST-076, MUST-077; Doc 04).
--
-- Three things Doc 04 requires before anyone is invited: prohibited categories
-- must not become discoverable, minors must not create accounts on their own,
-- and creation and messaging must be rate limited like the other write paths.

-- ================================================== prohibited content

/**
 * Conservative keyword classifier for the four categories Doc 04 prohibits in
 * the MVP. Deliberately narrow: word-bounded, so "method" is not "meth" and
 * "gunning" is not "gun". It will still be wrong sometimes, which is why a
 * match restricts an intent pending review rather than destroying it.
 */
create or replace function private.prohibited_category(candidate text)
returns text language sql immutable set search_path = '' as $$
  select case
    when candidate is null then null
    when candidate ~* '\m(gun|guns|firearm|firearms|pistol|pistols|rifle|rifles|shotgun|shotguns|ammunition|ammo|silencer)\M'
      then 'weapons'
    when candidate ~* '\m(cocaine|heroin|meth|methamphetamine|mdma|ketamine|lsd)\M'
      then 'illegal_substances'
    when candidate ~* '\m(escort|escorts|prostitution)\M|\msexual services\M|\msex work\M'
      then 'exploitative_services'
    when candidate ~* '\munderage\M|\mminors? (?:for|wanted)\M'
      then 'unsafe_minor_contact'
    else null
  end;
$$;

revoke execute on function private.prohibited_category(text) from public, anon, authenticated;

/**
 * Restricts an intent pending review and records why. The safe state is kept
 * in `restricted_from` so a moderator can restore it, and the event carries
 * the category rather than the offending text — the text is still on the
 * intent, where the retention policy can reach it.
 */
create or replace function private.restrict_for_review(target_intent_id uuid, category text)
returns void language plpgsql set search_path = '' as $$
declare
  current_status public.intent_status;
begin
  select status into current_status from public.intents where id = target_intent_id;

  update public.intents
  set status = 'restricted',
      restricted_from = case when current_status in ('live', 'matched') then current_status else 'live' end,
      version = version + 1
  where id = target_intent_id;

  -- No actor: this is the system restricting content, not a person reporting
  -- it, and inventing a reporter would be a fabricated record.
  insert into public.intent_events (intent_id, actor_id, event_type, to_status, metadata)
  values (target_intent_id, null, 'restricted_pending_review', 'restricted',
          jsonb_build_object('category', category));
end;
$$;

revoke execute on function private.restrict_for_review(uuid, text) from public, anon, authenticated;

-- ======================================================== minors gate

alter table public.profile_private
  add column if not exists adult_affirmed_at timestamptz;

-- MUST-076. The affirmation is stored, not a date of birth: it is the evidence
-- the requirement needs, and it is the least personal data that provides it.
-- It lives on `profile_private`, which no other member can read.
create or replace function public.redeem_invite(
  invite_token text,
  chosen_display_name text,
  adult_affirmed boolean
)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_actor();
  invitation public.invitations;
  created public.profiles;
begin
  if adult_affirmed is not true then
    raise exception 'invalid_input' using errcode = '22000';
  end if;

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

  insert into public.profile_private (profile_id, adult_affirmed_at)
  values (actor, now())
  on conflict (profile_id) do update set adult_affirmed_at = now();

  update public.invitations
  set consumed_at = now(), consumed_by = actor
  where id = invitation.id;

  return created;
end;
$$;

-- The two-argument form is gone: an account may not be created without the
-- affirmation, and leaving an unaffirmed path callable would defeat the gate.
drop function if exists public.redeem_invite(text, text);

revoke execute on function public.redeem_invite(text, text, boolean) from public, anon;
grant execute on function public.redeem_invite(text, text, boolean) to authenticated;

-- ============================ write paths, re-declared with the gate applied

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
  recent_publishes integer;
  prohibited text;
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

  -- MUST-077. One account cannot flood the network with intents.
  select count(*) into recent_publishes from public.intents
  where broadcaster_id = actor and published_at > now() - interval '1 hour';
  if recent_publishes >= 12 then
    raise exception 'rate_limited' using errcode = '53400';
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

  -- MUST-075. A prohibited category never becomes discoverable. The intent is
  -- restricted pending review rather than refused outright: the classifier is
  -- keyword-based and will sometimes be wrong, and destroying what someone
  -- wrote on a false positive is worse than holding it for a moderator.
  prohibited := private.prohibited_category(draft.statement);
  if prohibited is not null then
    perform private.restrict_for_review(draft.id, prohibited);
    select * into draft from public.intents where id = draft.id;
  end if;

  perform private.record_idempotent_result(
    actor, 'publish_intent', idempotency_key,
    jsonb_build_object('intent_id', draft.id, 'status', draft.status, 'version', draft.version));

  return draft;
end;
$$;

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
  recent_messages integer;
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

  -- MUST-077. A room stays a conversation, not a firehose.
  select count(*) into recent_messages from public.messages
  where sender_id = actor and created_at > now() - interval '1 hour';
  if recent_messages >= 60 then
    raise exception 'rate_limited' using errcode = '53400';
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

create or replace function public.update_intent(
  target_intent_id uuid,
  expected_version integer,
  changes jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_actor();
  target public.intents;
  context_row public.intent_context;
  allowed text[] := array[
    'statement', 'expires_at', 'starts_at', 'deadline_at',
    'quantity', 'price_minor', 'currency', 'approximate_place', 'requirements'
  ];
  supplied text;
  categories text[] := array[]::text[];
  prohibited text;
  next_statement text;
  next_expires_at timestamptz;
  next_starts_at timestamptz;
  next_deadline_at timestamptz;
  next_quantity numeric;
  next_price_minor bigint;
  next_currency char(3);
  next_place text;
  next_requirements jsonb;
begin
  if changes is null or jsonb_typeof(changes) <> 'object' or changes = '{}'::jsonb then
    raise exception 'invalid_input' using errcode = '22000';
  end if;

  foreach supplied in array array(select jsonb_object_keys(changes)) loop
    if not (supplied = any (allowed)) then
      raise exception 'invalid_input' using errcode = '22000';
    end if;
  end loop;

  select * into target from public.intents where id = target_intent_id for update;

  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if target.broadcaster_id <> actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  -- Editing stops once someone has been accepted: at that point the terms are
  -- being coordinated in a room, not advertised.
  if target.status not in ('draft', 'live') then
    raise exception 'stale_state' using errcode = '40001';
  end if;
  if target.version <> expected_version then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  select * into context_row from public.intent_context where intent_id = target.id for update;
  if context_row.intent_id is null then
    insert into public.intent_context (intent_id) values (target.id)
    returning * into context_row;
  end if;

  -- Current values first, so an absent key means "leave this alone".
  next_statement := target.statement;
  next_expires_at := target.expires_at;
  next_starts_at := context_row.starts_at;
  next_deadline_at := context_row.deadline_at;
  next_quantity := context_row.quantity;
  next_price_minor := context_row.price_minor;
  next_currency := context_row.currency;
  next_place := context_row.approximate_place;
  next_requirements := context_row.requirements;

  if changes ? 'statement' then
    next_statement := btrim(changes ->> 'statement');
    if next_statement is null or char_length(next_statement) < 1 or char_length(next_statement) > 500 then
      raise exception 'invalid_input' using errcode = '22000';
    end if;
  end if;

  if changes ? 'expires_at' then
    begin
      next_expires_at := (changes ->> 'expires_at')::timestamptz;
    exception when others then
      raise exception 'invalid_input' using errcode = '22000';
    end;
    if next_expires_at is null or next_expires_at <= now() then
      raise exception 'invalid_input' using errcode = '22000';
    end if;
  end if;

  if changes ? 'starts_at' then
    begin
      next_starts_at := nullif(changes ->> 'starts_at', '')::timestamptz;
    exception when others then
      raise exception 'invalid_input' using errcode = '22000';
    end;
  end if;

  if changes ? 'deadline_at' then
    begin
      next_deadline_at := nullif(changes ->> 'deadline_at', '')::timestamptz;
    exception when others then
      raise exception 'invalid_input' using errcode = '22000';
    end;
  end if;

  if changes ? 'quantity' then
    begin
      next_quantity := nullif(changes ->> 'quantity', '')::numeric;
    exception when others then
      raise exception 'invalid_input' using errcode = '22000';
    end;
    if next_quantity is not null and next_quantity <= 0 then
      raise exception 'invalid_input' using errcode = '22000';
    end if;
  end if;

  if changes ? 'price_minor' then
    begin
      next_price_minor := nullif(changes ->> 'price_minor', '')::bigint;
    exception when others then
      raise exception 'invalid_input' using errcode = '22000';
    end;
    if next_price_minor is not null and next_price_minor < 0 then
      raise exception 'invalid_input' using errcode = '22000';
    end if;
  end if;

  if changes ? 'currency' then
    next_currency := nullif(btrim(upper(changes ->> 'currency')), '');
    if next_currency is not null and char_length(next_currency) <> 3 then
      raise exception 'invalid_input' using errcode = '22000';
    end if;
  end if;

  -- A price is meaningless without its currency, and the table agrees.
  if (next_price_minor is null) <> (next_currency is null) then
    raise exception 'invalid_input' using errcode = '22000';
  end if;

  if changes ? 'approximate_place' then
    next_place := nullif(btrim(changes ->> 'approximate_place'), '');
    if next_place is not null and char_length(next_place) > 120 then
      raise exception 'invalid_input' using errcode = '22000';
    end if;
  end if;

  if changes ? 'requirements' then
    next_requirements := changes -> 'requirements';
    if jsonb_typeof(next_requirements) <> 'array' then
      raise exception 'invalid_input' using errcode = '22000';
    end if;
  end if;

  if next_starts_at is not null and next_deadline_at is not null
     and next_deadline_at < next_starts_at then
    raise exception 'invalid_input' using errcode = '22000';
  end if;

  -- Which of the documented categories actually moved. A resubmission of the
  -- same values changes nothing and must record nothing.
  if next_statement is distinct from target.statement then
    categories := array_append(categories, 'statement');
  end if;
  if next_expires_at is distinct from target.expires_at
     or next_starts_at is distinct from context_row.starts_at
     or next_deadline_at is distinct from context_row.deadline_at then
    categories := array_append(categories, 'time');
  end if;
  if next_price_minor is distinct from context_row.price_minor
     or next_currency is distinct from context_row.currency then
    categories := array_append(categories, 'price');
  end if;
  if next_place is distinct from context_row.approximate_place then
    categories := array_append(categories, 'location');
  end if;
  if next_requirements is distinct from context_row.requirements
     or next_quantity is distinct from context_row.quantity then
    categories := array_append(categories, 'eligibility');
  end if;

  update public.intents
  set statement = next_statement,
      expires_at = next_expires_at,
      version = version + 1
  where id = target.id
  returning * into target;

  update public.intent_context
  set starts_at = next_starts_at,
      deadline_at = next_deadline_at,
      quantity = next_quantity,
      price_minor = next_price_minor,
      currency = next_currency,
      approximate_place = next_place,
      requirements = next_requirements
  where intent_id = target.id;

  -- A draft has no audience yet, so an edit to one is not a material change to
  -- anything anyone agreed to.
  if target.status = 'live' and array_length(categories, 1) is not null then
    insert into public.intent_events (intent_id, actor_id, event_type, from_status, to_status, metadata)
    values (target.id, actor, 'material_edit', target.status, target.status,
            jsonb_build_object('fields', to_jsonb(categories), 'version', target.version));

    insert into public.notification_jobs (recipient_id, event_type, object_type, object_id, idempotency_key)
    select distinct r.respondent_id, 'intent_material_edit', 'intent', target.id,
           'material_edit:' || target.id::text || ':' || target.version::text || ':' || r.respondent_id::text
    from public.responses r
    where r.intent_id = target.id
      and r.status in ('pending', 'accepted')
      and not private.is_blocked(target.broadcaster_id, r.respondent_id)
    on conflict (idempotency_key) do nothing;
  end if;

  -- An edit must not be a way around the content check.
  prohibited := private.prohibited_category(target.statement);
  if prohibited is not null and target.status <> 'restricted' then
    perform private.restrict_for_review(target.id, prohibited);
    select * into target from public.intents where id = target.id;
  end if;

  return jsonb_build_object(
    'intent_id', target.id,
    'version', target.version,
    'changed', to_jsonb(categories)
  );
end;
$$;
