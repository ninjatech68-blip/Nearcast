-- ---------------------------------------------------------------
-- A person's public profile, for a live app.
--
-- Person screens (a caster's sheet, a chat header, receipt names) read
-- fixtures today, so in a real deployment they break on a real user id
-- or show a raw uuid. This is the one read that makes them live: a
-- person's first name, their attendance record, how long they have
-- cast, the trust distance to the viewer, and whether the viewer has a
-- receipt with them (the vouch gate). Only public, safety-relevant
-- facts — never contact details, never an exact location.
-- ---------------------------------------------------------------

/** the viewer's trust distance to a person, as a short phrase. */
create or replace function private.trust_phrase(viewer uuid, person uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when viewer = person then 'you'
    when private.shares_circle(viewer, person) then 'in your circle'
    when private.one_link_away(viewer, person) then 'one trusted link away'
    else 'not in your network'
  end;
$$;

/**
 * A person's public profile relative to the viewer. SECURITY DEFINER
 * so it can total attendance across plans the viewer can't see —
 * returning only the counts, never the plans.
 */
create or replace function public.get_public_profile(target uuid)
returns table (
  id uuid,
  first_name text,
  area text,
  receipts integer,
  flakes integer,
  member_since timestamptz,
  trust_phrase text,
  has_receipt_with_viewer boolean
)
language sql stable security definer set search_path = '' as $$
  with plans as (
    -- every past plan this person was in, either side
    select i.id
    from public.intents i
    join public.intent_context ctx on ctx.intent_id = i.id
    where ctx.starts_at is not null and ctx.starts_at < now()
      and (
        i.broadcaster_id = target
        or exists (select 1 from public.matches m where m.intent_id = i.id and m.participant_id = target)
      )
  ),
  outcomes as (
    select public.attendance_outcome(p.id, target) as outcome from plans p
  )
  select
    target,
    split_part(p.display_name, ' ', 1),
    (select a.name from public.profile_areas a where a.profile_id = target order by a.created_at limit 1),
    (select count(*)::int from outcomes where outcome = 'receipt'),
    (select count(*)::int from outcomes where outcome = 'flake'),
    (select min(i.published_at) from public.intents i where i.broadcaster_id = target),
    private.trust_phrase(auth.uid(), target),
    private.has_receipt_with(auth.uid(), target)
  from public.profiles p
  where p.id = target
    and not private.is_blocked(target, auth.uid());
$$;

revoke execute on function private.trust_phrase(uuid, uuid) from public, anon;
grant execute on function public.get_public_profile(uuid) to authenticated;
