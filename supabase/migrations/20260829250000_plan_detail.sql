-- ===============================================================
-- plan_detail: the full picture of a plan you are part of.
-- ===============================================================
--
-- "you're in" and "your casts" both only opened a chat. A plan you have
-- joined, or one you posted, deserves a real detail view: what it is,
-- when, where, and who is in it. This returns exactly that, to the
-- people entitled to see it:
--   * the caster (their own plan), or
--   * anyone matched into it (an accepted joiner).
-- Anyone else gets nothing — this is not a public read.
--
-- Location stays approximate. The exact spot is never stored on the
-- intent (product law); matched people settle it in chat. So this
-- returns the approximate place + point, the radius, the window, the
-- category and statement, whether the viewer is the caster, and the
-- matched participants' FIRST names (never more).
-- ===============================================================

create or replace function public.plan_detail(target_intent_id uuid)
returns table (
  intent_id uuid,
  category public.cast_category,
  statement text,
  area text,
  latitude double precision,
  longitude double precision,
  radius_km smallint,
  starts_at timestamptz,
  expires_at timestamptz,
  status public.intent_status,
  caster_id uuid,
  caster_first_name text,
  is_mine boolean,
  participant_count integer,
  participant_names text[]
)
language plpgsql security definer set search_path = '' as $$
declare
  viewer uuid := auth.uid();
  is_caster boolean;
  is_participant boolean;
begin
  if viewer is null then raise exception 'not_authenticated' using errcode = '42501'; end if;

  select (i.broadcaster_id = viewer) into is_caster
  from public.intents i where i.id = target_intent_id;
  if is_caster is null then raise exception 'plan_not_found' using errcode = 'P0002'; end if;

  is_participant := exists (
    select 1 from public.matches m
    where m.intent_id = target_intent_id and m.participant_id = viewer and m.closed_at is null
  );
  if not is_caster and not is_participant then
    raise exception 'not_a_participant' using errcode = '42501';
  end if;

  return query
  select
    i.id,
    i.category,
    i.statement,
    c.approximate_place,
    case when c.approximate_geography is null then null
         else extensions.ST_Y(c.approximate_geography::extensions.geometry) end,
    case when c.approximate_geography is null then null
         else extensions.ST_X(c.approximate_geography::extensions.geometry) end,
    r.radius_km,
    c.starts_at,
    i.expires_at,
    i.status,
    i.broadcaster_id,
    split_part(p.display_name, ' ', 1),
    (i.broadcaster_id = viewer),
    (select count(*)::int from public.matches m
       where m.intent_id = i.id and m.closed_at is null),
    coalesce((
      select array_agg(split_part(pp.display_name, ' ', 1) order by m.created_at)
      from public.matches m
      join public.profiles pp on pp.id = m.participant_id
      where m.intent_id = i.id and m.closed_at is null
    ), '{}')
  from public.intents i
  join public.profiles p on p.id = i.broadcaster_id
  left join public.intent_context c on c.intent_id = i.id
  left join public.intent_reach r on r.intent_id = i.id
  where i.id = target_intent_id;
end;
$$;
grant execute on function public.plan_detail(uuid) to authenticated;

-- ---------------------------------------------------------------
-- edit a cast — only while nobody has engaged with it.
-- ---------------------------------------------------------------
-- A posted cast can be corrected until someone has acted on it. The
-- moment a request or match exists, the words people responded to are
-- frozen: editing them out from under a joiner would be a bait and
-- switch. So this refuses once any response exists.
create or replace function public.edit_cast(
  target_intent_id uuid,
  new_statement text,
  new_category public.cast_category
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
  cast_owner uuid;
  response_count integer;
begin
  if owner is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select broadcaster_id into cast_owner from public.intents where id = target_intent_id;
  if cast_owner is null then raise exception 'plan_not_found' using errcode = 'P0002'; end if;
  if cast_owner <> owner then raise exception 'not_authorized' using errcode = '42501'; end if;
  if char_length(btrim(new_statement)) < 1 or char_length(btrim(new_statement)) > 500 then
    raise exception 'statement_out_of_range' using errcode = '23514';
  end if;

  select count(*) into response_count from public.responses where intent_id = target_intent_id;
  if response_count > 0 then
    raise exception 'cast_has_engagement' using errcode = '23514';
  end if;

  update public.intents
  set statement = btrim(new_statement), category = new_category, updated_at = now()
  where id = target_intent_id;
end;
$$;
grant execute on function public.edit_cast(uuid, text, public.cast_category) to authenticated;
