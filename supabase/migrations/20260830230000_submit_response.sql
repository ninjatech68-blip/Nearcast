-- Responding to an intent.
--
-- One transaction writes the response and queues the broadcaster's
-- notification, so a response can never exist that nobody is told about, and a
-- notification can never point at a response that was rolled back.
--
-- The notification carries object identifiers and an event type only. The
-- table has no column for message text, so a payload cannot leak the response
-- body even by mistake; the suite asserts that rather than assuming it.

create or replace function public.submit_response(
  target_intent uuid,
  response_message text,
  response_qualification jsonb default '{}'::jsonb,
  request_key uuid default null
)
returns table (response_id uuid, response_status public.response_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target public.intents;
  trimmed_message text := btrim(response_message);
  request_fingerprint text;
  stored public.request_idempotency;
  created public.responses;
  existing public.responses;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = actor) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if char_length(trimmed_message) < 1 or char_length(trimmed_message) > 1000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  request_fingerprint := encode(
    extensions.digest(target_intent::text || ':' || trimmed_message, 'sha256'),
    'hex'
  );

  if request_key is not null then
    select * into stored
    from public.request_idempotency i
    where i.actor_id = actor
      and i.operation = 'submit-response'
      and i.request_key = submit_response.request_key;

    if stored.actor_id is not null then
      if stored.fingerprint <> request_fingerprint then
        raise exception 'conflict' using errcode = '23505';
      end if;

      select * into created
      from public.responses
      where id = (stored.result ->> 'response_id')::uuid;

      return query select created.id, created.status;
      return;
    end if;
  end if;

  select * into target from public.intents where id = target_intent for update;

  if target.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  -- Responding to your own intent would be fabricating interest.
  if target.broadcaster_id = actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if target.status <> 'live' or target.expires_at <= now() then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  if private.is_blocked(target.broadcaster_id, actor) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  -- Eligibility is delivery: an intent reaches a person through the reach
  -- graph, and someone it never reached has no standing to respond.
  if not exists (
    select 1 from public.intent_deliveries d
    where d.intent_id = target.id and d.recipient_id = actor and d.hidden_at is null
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  -- A second response from the same person is the same response, not a new
  -- one. Returning the original keeps a retry from looking like a refusal.
  select * into existing
  from public.responses
  where intent_id = target.id and respondent_id = actor;

  if existing.id is not null then
    return query select existing.id, existing.status;
    return;
  end if;

  insert into public.responses (intent_id, respondent_id, message, qualification)
  values (target.id, actor, trimmed_message, coalesce(response_qualification, '{}'::jsonb))
  returning * into created;

  insert into public.notification_jobs (
    recipient_id, event_type, object_type, object_id, idempotency_key
  ) values (
    target.broadcaster_id, 'response_received', 'response', created.id,
    'response_received:' || created.id::text
  );

  insert into public.intent_events (
    intent_id, actor_id, event_type, from_status, to_status
  ) values (
    target.id, actor, 'response_submitted', 'live', 'live'
  );

  if request_key is not null then
    insert into public.request_idempotency (
      actor_id, operation, request_key, fingerprint, result
    ) values (
      actor, 'submit-response', submit_response.request_key, request_fingerprint,
      jsonb_build_object('response_id', created.id)
    );
  end if;

  return query select created.id, created.status;
end;
$$;

revoke execute on function public.submit_response(uuid, text, jsonb, uuid) from public, anon;
grant execute on function public.submit_response(uuid, text, jsonb, uuid) to authenticated;
