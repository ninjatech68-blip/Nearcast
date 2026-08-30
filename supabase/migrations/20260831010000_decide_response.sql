-- Deciding a response.
--
-- Acceptance already exists as `accept_response`. This adds the other half of
-- the decision, and it exists as a server function for the same reason: the
-- respondent must learn the outcome, and a client-side status update could
-- change the row without ever queueing that notification.
--
-- A declined respondent is told the outcome and nothing else. The responses
-- table has no column for a reason, so there is nothing to leak: a decline
-- cannot carry a justification a broadcaster wrote in private.

create or replace function public.decline_response(
  target_response uuid,
  expected_status public.response_status
)
returns table (response_id uuid, response_status public.response_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  selected public.responses;
  parent public.intents;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into selected from public.responses where id = target_response for update;

  if selected.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  select * into parent from public.intents where id = selected.intent_id;

  if parent.broadcaster_id <> actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  -- Idempotent on a repeat, so a retry confirms the outcome rather than
  -- reporting a stale state the broadcaster cannot act on.
  if selected.status = 'declined' then
    return query select selected.id, selected.status;
    return;
  end if;

  if selected.status <> expected_status or selected.status <> 'pending' then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  update public.responses
  set status = 'declined', updated_at = now()
  where id = target_response
  returning * into selected;

  insert into public.notification_jobs (
    recipient_id, event_type, object_type, object_id, idempotency_key
  ) values (
    selected.respondent_id, 'response_declined', 'response', selected.id,
    'response_declined:' || selected.id::text
  );

  return query select selected.id, selected.status;
end;
$$;

revoke execute on function public.decline_response(uuid, public.response_status) from public, anon;
grant execute on function public.decline_response(uuid, public.response_status) to authenticated;

-- Acceptance queues the respondent's notification too, in the same transaction
-- that creates the match and the room. Without this an accepted respondent
-- would have a coordination room open and no reason to look at it.

create or replace function public.accept_response(
  response_to_accept uuid,
  expected_intent_status public.intent_status
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_response public.responses;
  selected_intent public.intents;
  accepted_match public.matches;
begin
  select * into selected_response
  from public.responses
  where id = response_to_accept
  for update;

  if selected_response.id is null then
    raise exception 'response_not_found' using errcode = 'P0002';
  end if;

  select * into selected_intent
  from public.intents
  where id = selected_response.intent_id
  for update;

  if selected_intent.broadcaster_id <> auth.uid() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into accepted_match
  from public.matches
  where response_id = selected_response.id;

  if accepted_match.id is not null then
    return accepted_match;
  end if;

  if selected_intent.status <> expected_intent_status or selected_intent.status <> 'live' then
    raise exception 'stale_intent_state' using errcode = '40001';
  end if;

  if selected_response.status <> 'pending' then
    raise exception 'response_not_pending' using errcode = '23514';
  end if;

  if private.is_blocked(selected_intent.broadcaster_id, selected_response.respondent_id) then
    raise exception 'blocked_relationship' using errcode = '42501';
  end if;

  insert into public.matches (
    intent_id, response_id, broadcaster_id, participant_id
  ) values (
    selected_intent.id, selected_response.id, selected_intent.broadcaster_id, selected_response.respondent_id
  ) returning * into accepted_match;

  update public.responses set status = 'accepted'
  where id = selected_response.id;

  update public.intents set status = 'matched', version = version + 1
  where id = selected_intent.id;

  insert into public.conversations (match_id, expires_at)
  values (
    accepted_match.id,
    greatest(selected_intent.expires_at, now()) + interval '24 hours'
  );

  insert into public.intent_events (
    intent_id, actor_id, event_type, from_status, to_status
  ) values (
    selected_intent.id, auth.uid(), 'response_accepted', 'live', 'matched'
  );

  insert into public.notification_jobs (
    recipient_id, event_type, object_type, object_id, idempotency_key
  ) values (
    selected_response.respondent_id, 'response_accepted', 'response', selected_response.id,
    'response_accepted:' || selected_response.id::text
  );

  return accepted_match;
end;
$$;

revoke execute on function public.accept_response(uuid, public.intent_status) from public, anon;
grant execute on function public.accept_response(uuid, public.intent_status) to authenticated;
