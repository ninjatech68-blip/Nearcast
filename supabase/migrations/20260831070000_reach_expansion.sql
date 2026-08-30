-- Controlled reach expansion.
--
-- Widening reach is the one action that shows an intent to people who could not
-- see it a moment ago, so it is gated three ways: the caller must name the
-- level they believe is current, name the level they want, and confirm they
-- have seen what the change discloses. Any of the three missing is an implicit
-- expansion, which the product rules forbid.
--
-- Narrowing needs none of that. Taking something back is always immediately
-- available: requiring a confirmation to reduce exposure would make the safer
-- action the harder one.

create or replace function private.reach_rank(level public.reach_level)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case level
    when 'origin_only' then 0
    when 'adjacent_network' then 1
    when 'nearby_relevant' then 2
    when 'broader_approved' then 3
  end;
$$;

create or replace function public.change_intent_reach(
  target_intent uuid,
  expected_level public.reach_level,
  target_level public.reach_level,
  disclosure_confirmed boolean default false
)
returns table (level public.reach_level, intent_version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  source public.intents;
  current_reach public.intent_reach;
  is_expansion boolean;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into source from public.intents where id = target_intent for update;

  if source.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if source.broadcaster_id <> actor then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if source.status <> 'live' then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  select * into current_reach from public.intent_reach where intent_id = target_intent for update;

  -- The caller must be acting on the level they actually see. Without this a
  -- stale screen could widen reach a second time without anyone intending it.
  if current_reach.level <> expected_level then
    raise exception 'stale_state' using errcode = '40001';
  end if;

  if current_reach.level = target_level then
    return query select current_reach.level, source.version;
    return;
  end if;

  is_expansion := private.reach_rank(target_level) > private.reach_rank(current_reach.level);

  if is_expansion and not disclosure_confirmed then
    raise exception 'disclosure_not_confirmed' using errcode = '42501';
  end if;

  update public.intent_reach
  set level = target_level,
      expanded_at = case when is_expansion then now() else expanded_at end,
      updated_at = now()
  where intent_id = target_intent;

  update public.intents
  set version = version + 1, updated_at = now()
  where id = target_intent
  returning * into source;

  insert into public.intent_events (
    intent_id, actor_id, event_type, from_status, to_status, metadata
  ) values (
    target_intent,
    actor,
    case when is_expansion then 'reach_expanded' else 'reach_reduced' end,
    source.status,
    source.status,
    jsonb_build_object(
      'from_level', current_reach.level::text,
      'to_level', target_level::text
    )
  );

  -- An expansion that reached nobody new would be a promise unkept, so the
  -- deliveries it authorises are materialised in the same transaction.
  if is_expansion then
    perform public.generate_deliveries(target_intent);
  end if;

  return query select target_level, source.version;
end;
$$;

revoke execute on function private.reach_rank(public.reach_level) from public, anon, authenticated;
revoke execute on function public.change_intent_reach(
  uuid, public.reach_level, public.reach_level, boolean
) from public, anon;
grant execute on function public.change_intent_reach(
  uuid, public.reach_level, public.reach_level, boolean
) to authenticated;
