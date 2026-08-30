-- Owner lifecycle: edit, withdraw, resolve, expire.
--
-- Every transition is a server-controlled function guarded by an expected
-- version, so two devices editing the same intent cannot silently overwrite one
-- another. Withdraw and resolve are idempotent rather than version-strict on a
-- repeat: a retry after a dropped connection should confirm the outcome the
-- person asked for, not report a stale state they cannot act on.
--
-- New responses already stop for non-live intents through
-- `responses_insert_recipient`, which requires status 'live' and a future
-- expiry. The suite asserts that rather than adding a second gate.

-- Material edits ------------------------------------------------------------
-- MUST-017 requires an edit that materially changes price, location,
-- eligibility or time to be visible to existing respondents. The changed field
-- names are recorded on the event so that surfacing them later reads from
-- history rather than from a diff nobody kept.

create or replace function public.update_intent(
  target_intent uuid,
  expected_version integer,
  new_statement text,
  new_response_action text,
  new_expires_at timestamptz,
  new_starts_at timestamptz default null,
  new_deadline_at timestamptz default null,
  new_quantity numeric default null,
  new_price_minor bigint default null,
  new_currency char(3) default null,
  new_approximate_place text default null,
  new_requirements jsonb default '[]'::jsonb
)
returns table (intent_status public.intent_status, intent_version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_intent public.intents;
  current_context public.intent_context;
  trimmed_statement text := btrim(new_statement);
  trimmed_action text := btrim(new_response_action);
  trimmed_place text := nullif(btrim(new_approximate_place), '');
  material text[] := array[]::text[];
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into current_intent from public.intents where id = target_intent for update;

  if current_intent.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if current_intent.broadcaster_id <> actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if current_intent.version <> expected_version then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  if current_intent.status <> 'live' then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  if char_length(trimmed_statement) < 1 or char_length(trimmed_statement) > 500
     or char_length(trimmed_action) < 1 or char_length(trimmed_action) > 40 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if new_expires_at <= now() then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if (new_price_minor is null) <> (new_currency is null) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  select * into current_context from public.intent_context where intent_id = target_intent;

  if current_intent.expires_at is distinct from new_expires_at
     or current_context.starts_at is distinct from new_starts_at
     or current_context.deadline_at is distinct from new_deadline_at then
    material := material || array['time']::text[];
  end if;

  if current_context.price_minor is distinct from new_price_minor
     or current_context.currency is distinct from new_currency then
    material := material || array['price']::text[];
  end if;

  if current_context.approximate_place is distinct from trimmed_place then
    material := material || array['location']::text[];
  end if;

  if current_context.requirements is distinct from coalesce(new_requirements, '[]'::jsonb)
     or current_context.quantity is distinct from new_quantity then
    material := material || array['eligibility']::text[];
  end if;

  update public.intents
  set statement = trimmed_statement,
      response_action = trimmed_action,
      expires_at = new_expires_at,
      version = version + 1,
      updated_at = now()
  where id = target_intent
  returning * into current_intent;

  update public.intent_context
  set starts_at = new_starts_at,
      deadline_at = new_deadline_at,
      quantity = new_quantity,
      price_minor = new_price_minor,
      currency = new_currency,
      approximate_place = trimmed_place,
      requirements = coalesce(new_requirements, '[]'::jsonb)
  where intent_id = target_intent;

  insert into public.intent_events (
    intent_id, actor_id, event_type, from_status, to_status, metadata
  ) values (
    target_intent,
    actor,
    case when array_length(material, 1) is null then 'intent_edited'
         else 'intent_edited_materially' end,
    'live',
    'live',
    jsonb_build_object('material_changes', to_jsonb(material))
  );

  return query select current_intent.status, current_intent.version;
end;
$$;

-- Closing an intent ---------------------------------------------------------

create or replace function private.close_intent(
  target_intent uuid,
  expected_version integer,
  next_status public.intent_status
)
returns table (intent_status public.intent_status, intent_version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_intent public.intents;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into current_intent from public.intents where id = target_intent for update;

  if current_intent.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if current_intent.broadcaster_id <> actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  -- Idempotent on a repeat: a retry after a dropped connection should confirm
  -- the outcome that was asked for, not report a stale state.
  if current_intent.status = next_status then
    return query select current_intent.status, current_intent.version;
    return;
  end if;

  if current_intent.version <> expected_version then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  if current_intent.status not in ('live', 'matched') then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  update public.intents
  set status = next_status,
      version = version + 1,
      resolved_at = case when next_status = 'resolved' then now() else resolved_at end,
      updated_at = now()
  where id = target_intent
  returning * into current_intent;

  insert into public.intent_events (
    intent_id, actor_id, event_type, from_status, to_status
  ) values (
    target_intent, actor,
    case when next_status = 'resolved' then 'intent_resolved' else 'intent_withdrawn' end,
    current_intent.status, next_status
  );

  return query select current_intent.status, current_intent.version;
end;
$$;

create or replace function public.withdraw_intent(
  target_intent uuid,
  expected_version integer
)
returns table (intent_status public.intent_status, intent_version integer)
language sql
security definer
set search_path = ''
as $$
  select * from private.close_intent(target_intent, expected_version, 'withdrawn');
$$;

create or replace function public.resolve_intent(
  target_intent uuid,
  expected_version integer
)
returns table (intent_status public.intent_status, intent_version integer)
language sql
security definer
set search_path = ''
as $$
  select * from private.close_intent(target_intent, expected_version, 'resolved');
$$;

-- Expiry sweep --------------------------------------------------------------
-- Lapsed intents stop accepting responses by policy already, which compares
-- against the clock. This only settles the stored status so owner screens and
-- history agree with what the policies are already enforcing.

create or replace function public.expire_intents()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_count integer;
begin
  with lapsed as (
    update public.intents
    set status = 'expired', version = version + 1, updated_at = now()
    where status in ('live', 'matched') and expires_at <= now()
    returning id, status
  ), noted as (
    insert into public.intent_events (intent_id, actor_id, event_type, to_status)
    select lapsed.id, null, 'intent_expired', 'expired' from lapsed
    returning 1
  )
  select count(*) into expired_count from noted;

  return expired_count;
end;
$$;

revoke execute on function public.update_intent(
  uuid, integer, text, text, timestamptz, timestamptz, timestamptz, numeric,
  bigint, char(3), text, jsonb
) from public, anon;
grant execute on function public.update_intent(
  uuid, integer, text, text, timestamptz, timestamptz, timestamptz, numeric,
  bigint, char(3), text, jsonb
) to authenticated;

revoke execute on function private.close_intent(uuid, integer, public.intent_status) from public, anon, authenticated;
revoke execute on function public.withdraw_intent(uuid, integer) from public, anon;
grant execute on function public.withdraw_intent(uuid, integer) to authenticated;
revoke execute on function public.resolve_intent(uuid, integer) from public, anon;
grant execute on function public.resolve_intent(uuid, integer) to authenticated;
revoke execute on function public.expire_intents() from public, anon, authenticated;
