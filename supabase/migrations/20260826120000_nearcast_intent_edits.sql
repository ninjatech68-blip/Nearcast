-- Material-edit history for published intents (MUST-017).
--
-- A broadcaster may correct a published intent, but anyone who already
-- responded agreed to the earlier terms. Every edit that changes price,
-- location, eligibility, time, or the statement itself appends one event that
-- existing respondents can read, and queues one generic notification each.
--
-- The event records the *categories* that changed and nothing else. Copying
-- the new values into an append-only log would put place and price data
-- somewhere the Doc 04 retention policy cannot reach; respondents read the
-- current values from the intent itself, which they are already permitted to
-- see.

-- ============================================================== owner edits

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

  return jsonb_build_object(
    'intent_id', target.id,
    'version', target.version,
    'changed', to_jsonb(categories)
  );
end;
$$;

revoke execute on function public.update_intent(uuid, integer, jsonb) from public, anon;
grant execute on function public.update_intent(uuid, integer, jsonb) to authenticated;

-- ======================================================== history read path

-- The owner policy already covers the whole log. This one adds exactly the
-- material edits, and only for people who can already see the intent: its
-- recipients, respondents, and match participants.
drop policy if exists events_read_material_edits on public.intent_events;
create policy events_read_material_edits on public.intent_events for select to authenticated
using (
  event_type = 'material_edit'
  and private.can_read_intent(intent_id, (select auth.uid()))
);
