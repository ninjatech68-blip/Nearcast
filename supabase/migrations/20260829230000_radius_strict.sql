-- ===============================================================
-- Radius gates for real: no name-match bypass when a point exists.
-- ===============================================================
--
-- in_range fell back to matching the place NAME whenever EITHER side
-- lacked a centroid. So a cast that carried a real point still reached a
-- viewer purely because their area name happened to match, ignoring the
-- radius entirely — the "radius failed" report.
--
-- New rule, tighter and honest:
--   * cast has a point AND the viewer has at least one placed area
--       -> distance only. the radius is the gate, full stop.
--   * otherwise (either side genuinely unplaceable)
--       -> fall back to name equality, because measuring is impossible
--          and treating an unplaceable area as "far" would silently
--          stop delivering.
--
-- Only delivery_for changes. Everything else about the gate is intact.
-- ===============================================================

create or replace function private.delivery_for(viewer_id uuid, intent_row_id uuid)
returns private.delivery_verdict
language plpgsql stable security definer set search_path = '' as $$
declare
  cast_row public.intents;
  context_row public.intent_context;
  radius smallint;
  shared boolean;
  one_link boolean;
  in_range boolean;
  viewer_has_point boolean;
  category_match boolean;
  window_match boolean;
  signals text[] := '{}';
  score smallint := 0;
  code text;
  verdict private.delivery_verdict;
begin
  verdict := (false, 0, null, null, '{}')::private.delivery_verdict;

  select * into cast_row from public.intents where id = intent_row_id;
  if cast_row.id is null then return verdict; end if;
  if cast_row.broadcaster_id = viewer_id then return verdict; end if;
  if private.is_blocked(cast_row.broadcaster_id, viewer_id) then return verdict; end if;
  if cast_row.status not in ('live', 'matched') or cast_row.expires_at <= now() then return verdict; end if;

  select * into context_row from public.intent_context where intent_id = intent_row_id;
  select r.radius_km into radius from public.intent_reach r where r.intent_id = intent_row_id;
  radius := coalesce(radius, 5);

  shared := private.shares_circle(viewer_id, cast_row.broadcaster_id);
  one_link := not shared and private.one_link_away(viewer_id, cast_row.broadcaster_id);

  viewer_has_point := exists (
    select 1 from public.profile_areas a
    where a.profile_id = viewer_id and a.centroid is not null
  );

  if context_row.approximate_geography is not null and viewer_has_point then
    -- BOTH sides placeable: distance is the only gate. no name bypass.
    in_range := exists (
      select 1 from public.profile_areas a
      where a.profile_id = viewer_id
        and a.centroid is not null
        and extensions.ST_DWithin(a.centroid, context_row.approximate_geography, radius * 1000.0)
    );
  else
    -- one side unplaceable: match the name, or the cast could never reach.
    in_range := exists (
      select 1 from public.profile_areas a
      where a.profile_id = viewer_id
        and lower(btrim(a.name)) = lower(btrim(coalesce(context_row.approximate_place, '')))
    );
  end if;

  category_match := exists (
    select 1 from public.profile_interests i
    where i.profile_id = viewer_id and i.category = cast_row.category
  );

  window_match := context_row.coarse_window is not null
    and exists (
      select 1 from public.profiles p
      where p.id = viewer_id and context_row.coarse_window = any(p.active_windows)
    );

  if not (shared or one_link) then
    if not in_range then return verdict; end if;
    if not category_match then return verdict; end if;
  end if;

  if shared then
    score := score + 3; signals := signals || 'your circle vouches'::text; code := 'shared_circle';
  elsif one_link then
    score := score + 2; signals := signals || 'one trusted link away'::text; code := 'one_trusted_link';
  else
    code := 'nearby_interest_match';
  end if;

  if in_range then
    score := score + 1;
    signals := signals || ('near you in ' || coalesce(context_row.approximate_place, 'your area'))::text;
  end if;
  if category_match then
    score := score + 1;
    signals := signals || ('you''re into ' || cast_row.category::text)::text;
  end if;
  if window_match then
    score := score + 1;
    signals := signals || ('you''re usually up for ' || replace(context_row.coarse_window, '-', ' ') || 's')::text;
  end if;

  if array_length(signals, 1) is null then return verdict; end if;

  return (true, score, code, left(array_to_string(signals[1:2], ' · '), 160), signals)::private.delivery_verdict;
end;
$$;
