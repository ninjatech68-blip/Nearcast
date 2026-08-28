-- ---------------------------------------------------------------
-- Responses on the backend: the join → accept/decline → withdraw loop.
--
-- This is what turns a shared feed into two people making a plan. A
-- joiner asks in; the caster sees it on their own cast and accepts or
-- declines; accepting (via the existing accept_response) creates the
-- match and the conversation. Until now every step of that lived in a
-- device-local store and never crossed between phones.
--
-- The write paths are SECURITY DEFINER because each re-checks an
-- invariant the RLS policy also enforces, so the client gets a named
-- error ("blocked", "not the caster") instead of a bare policy denial.
-- The read paths return the caster's own casts and the responses on
-- them, which the RLS on the base tables already permits — they exist
-- for clean, shaped rows rather than multi-join client queries.
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- 1. joining
-- ---------------------------------------------------------------

/**
 * Ask to join a cast. Idempotent on (intent, respondent): asking twice
 * updates the note rather than erroring, and re-asking after a
 * withdrawal or decline re-opens the request. Returns the response id.
 */
create or replace function public.respond_to_cast(target_intent_id uuid, note text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  responder uuid := auth.uid();
  the_cast public.intents;
  response_id uuid;
begin
  if responder is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if char_length(btrim(note)) < 1 or char_length(btrim(note)) > 1000 then
    raise exception 'note_out_of_range' using errcode = '23514';
  end if;

  select * into the_cast from public.intents where id = target_intent_id;
  if the_cast.id is null then
    raise exception 'cast_not_found' using errcode = 'P0002';
  end if;
  if the_cast.broadcaster_id = responder then
    raise exception 'cannot_join_own_cast' using errcode = '23514';
  end if;
  if the_cast.status <> 'live' or the_cast.expires_at <= now() then
    raise exception 'cast_not_live' using errcode = '23514';
  end if;
  if private.is_blocked(the_cast.broadcaster_id, responder) then
    raise exception 'blocked_relationship' using errcode = '42501';
  end if;
  -- you can only ask in on a cast that actually reached you
  if not exists (
    select 1 from public.intent_deliveries d
    where d.intent_id = target_intent_id and d.recipient_id = responder
  ) then
    raise exception 'cast_not_delivered' using errcode = '42501';
  end if;

  insert into public.responses (intent_id, respondent_id, message, status)
  values (target_intent_id, responder, btrim(note), 'pending')
  on conflict (intent_id, respondent_id)
  do update set message = excluded.message, status = 'pending', updated_at = now()
  returning id into response_id;

  return response_id;
end;
$$;

-- ---------------------------------------------------------------
-- 2. declining and withdrawing
-- ---------------------------------------------------------------

/** the caster says no. silent to the joiner, per product law. */
create or replace function public.decline_response(target_response_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  caster uuid := auth.uid();
  the_cast_owner uuid;
begin
  if caster is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select i.broadcaster_id into the_cast_owner
  from public.responses r join public.intents i on i.id = r.intent_id
  where r.id = target_response_id;
  if the_cast_owner is null then
    raise exception 'response_not_found' using errcode = 'P0002';
  end if;
  if the_cast_owner <> caster then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  update public.responses set status = 'declined', updated_at = now()
  where id = target_response_id and status = 'pending';
end;
$$;

/** the joiner takes back a request they sent. silent to the caster. */
create or replace function public.withdraw_response(target_response_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  responder uuid := auth.uid();
begin
  if responder is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.responses set status = 'withdrawn', updated_at = now()
  where id = target_response_id and respondent_id = responder and status = 'pending';
end;
$$;

-- ---------------------------------------------------------------
-- 3. the caster's own casts, and who wants in
-- ---------------------------------------------------------------

/** casts I authored that are still active, newest first. */
create or replace function public.my_casts()
returns table (
  intent_id uuid,
  category public.cast_category,
  statement text,
  area text,
  starts_at timestamptz,
  expires_at timestamptz,
  status public.intent_status,
  pending_count bigint,
  matched_count bigint
)
language sql security definer set search_path = '' as $$
  select
    i.id,
    i.category,
    i.statement,
    c.approximate_place,
    c.starts_at,
    i.expires_at,
    i.status,
    (select count(*) from public.responses r where r.intent_id = i.id and r.status = 'pending'),
    (select count(*) from public.matches m where m.intent_id = i.id and m.closed_at is null)
  from public.intents i
  left join public.intent_context c on c.intent_id = i.id
  where i.broadcaster_id = auth.uid()
    and i.status in ('live', 'matched')
    and i.expires_at > now()
  order by i.published_at desc nulls last, i.created_at desc;
$$;

/** pending requests on my casts — who is waiting on me to decide. */
create or replace function public.pending_joins_on_my_casts()
returns table (
  response_id uuid,
  intent_id uuid,
  cast_statement text,
  joiner_id uuid,
  joiner_first_name text,
  note text,
  created_at timestamptz
)
language sql security definer set search_path = '' as $$
  select
    r.id,
    i.id,
    i.statement,
    r.respondent_id,
    split_part(p.display_name, ' ', 1),
    r.message,
    r.created_at
  from public.responses r
  join public.intents i on i.id = r.intent_id
  join public.profiles p on p.id = r.respondent_id
  where i.broadcaster_id = auth.uid()
    and r.status = 'pending'
    and not private.is_blocked(auth.uid(), r.respondent_id)
  order by r.created_at desc;
$$;

/** requests I sent that are still open — who I am waiting on. */
create or replace function public.joins_i_sent()
returns table (
  response_id uuid,
  intent_id uuid,
  cast_statement text,
  caster_id uuid,
  caster_first_name text,
  status public.response_status,
  created_at timestamptz
)
language sql security definer set search_path = '' as $$
  select
    r.id,
    i.id,
    i.statement,
    i.broadcaster_id,
    split_part(p.display_name, ' ', 1),
    r.status,
    r.created_at
  from public.responses r
  join public.intents i on i.id = r.intent_id
  join public.profiles p on p.id = i.broadcaster_id
  where r.respondent_id = auth.uid()
    and r.status in ('pending', 'accepted')
  order by r.created_at desc;
$$;

grant execute on function public.respond_to_cast(uuid, text) to authenticated;
grant execute on function public.decline_response(uuid) to authenticated;
grant execute on function public.withdraw_response(uuid) to authenticated;
grant execute on function public.my_casts() to authenticated;
grant execute on function public.pending_joins_on_my_casts() to authenticated;
grant execute on function public.joins_i_sent() to authenticated;
