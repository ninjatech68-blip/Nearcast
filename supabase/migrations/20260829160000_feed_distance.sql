-- ===============================================================
-- my_feed() also returns how far away a cast is.
-- ===============================================================
--
-- The feed showed the cast's approximate place NAME. Testers are
-- spread across cities, and a name they do not know ("hsr") tells them
-- nothing about whether they can get there — "1.2 km away" does.
--
-- Both points are already approximate: the viewer's approved-area
-- centroid and the cast's `intent_context.approximate_geography`. The
-- distance between two approximate centres is coarser than either, and
-- coarser still because it is ROUNDED HERE, to the nearest 50 m, before
-- it leaves the database. Repeated reads therefore cannot be
-- multilaterated into a sharper position than the approximate point
-- the caster already agreed to publish.
--
-- Null when either side has no point — an area typed before the picker
-- existed, say. The app then falls back to the place name rather than
-- inventing a number.
--
-- The minimum across the viewer's approved areas is the honest one:
-- delivery matched this cast against whichever of their areas was in
-- range, so that is the area they will be travelling from.
-- ===============================================================

drop function if exists public.my_feed();

create or replace function public.my_feed()
returns table (
  intent_id uuid,
  category public.cast_category,
  statement text,
  area text,
  starts_at timestamptz,
  expires_at timestamptz,
  caster_id uuid,
  caster_first_name text,
  reason_text text,
  signals text[],
  score smallint,
  distance_m integer
)
language plpgsql security definer set search_path = '' as $$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  perform private.materialise_deliveries(viewer);

  return query
    select
      i.id,
      i.category,
      i.statement,
      c.approximate_place,
      c.starts_at,
      i.expires_at,
      i.broadcaster_id,
      split_part(p.display_name, ' ', 1),
      d.reason_text,
      d.signals,
      d.score,
      (
        select (round(min(extensions.ST_Distance(a.centroid, c.approximate_geography)) / 50.0) * 50)::integer
        from public.profile_areas a
        where a.profile_id = viewer
          and a.centroid is not null
          and c.approximate_geography is not null
      )
    from public.intent_deliveries d
    join public.intents i on i.id = d.intent_id
    join public.profiles p on p.id = i.broadcaster_id
    left join public.intent_context c on c.intent_id = i.id
    where d.recipient_id = viewer
      and d.hidden_at is null
      and i.status in ('live', 'matched')
      and i.expires_at > now()
      and not private.is_blocked(i.broadcaster_id, viewer)
    order by d.score desc, i.published_at desc;
end;
$$;

grant execute on function public.my_feed() to authenticated;
