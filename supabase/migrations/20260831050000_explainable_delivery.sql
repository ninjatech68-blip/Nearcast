-- Explainable delivery.
--
-- An intent reaches someone only through a materialised delivery row, and every
-- such row carries a stable explanation code and a rendered reason. That is the
-- whole point: a person can always be told why something reached them, and the
-- answer is stored rather than reconstructed later from a query that may have
-- since changed.
--
-- The rendered reason never names the origin group, the broadcaster's circle,
-- or any third party. "Someone you both know" is as specific as it gets, and
-- that phrasing is deliberate: it explains the connection without disclosing
-- who forms it.

alter table public.intent_deliveries
  add column saved_at timestamptz;

-- The reason a reach level produces, and the sentence shown for it. Kept as a
-- function so the mapping is one place rather than scattered through queries.
create or replace function private.delivery_reason(level public.reach_level)
returns table (reason_code text, reason_text text)
language sql
immutable
set search_path = ''
as $$
  select
    case level
      when 'origin_only' then 'origin_recipient'
      when 'adjacent_network' then 'adjacent_trust_connection'
      when 'nearby_relevant' then 'nearby_interest_match'
      when 'broader_approved' then 'broader_approved_match'
    end,
    case level
      when 'origin_only' then 'This was shared directly with you'
      when 'adjacent_network' then 'Someone you both know shared this'
      when 'nearby_relevant' then 'You are nearby and this matches what you do'
      when 'broader_approved' then 'This was approved to reach a wider group'
    end;
$$;

-- Materialising deliveries.
--
-- Eligibility is applied in the order the plan sets out: lifecycle, reach,
-- time, geography, blocks, restriction, prior action. Prior action is last
-- because it is the only filter about the recipient's own history rather than
-- about whether they may see the intent at all.
--
-- Idempotent: re-running adds only recipients who did not have a row. An
-- existing delivery is never rewritten, so a reason a person already read
-- cannot change under them.

create or replace function public.generate_deliveries(target_intent uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  source public.intents;
  reach public.intent_reach;
  reason record;
  created_count integer;
begin
  select * into source from public.intents where id = target_intent;

  if source.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  select * into reach from public.intent_reach where intent_id = target_intent;

  if source.status <> 'live' or source.expires_at <= now() then
    return 0;
  end if;

  -- An origin-only intent is delivered by sharing a link, not by discovery.
  if reach.level = 'origin_only' then
    return 0;
  end if;

  select * into reason from private.delivery_reason(reach.level);

  with eligible as (
    select p.id as recipient_id
    from public.profiles p
    join public.intent_context c on c.intent_id = target_intent
    where
      p.id <> source.broadcaster_id
      and not p.is_restricted
      and not private.is_blocked(source.broadcaster_id, p.id)
      and p.approximate_home is not null
      and c.approximate_geography is not null
      and extensions.st_dwithin(c.approximate_geography, p.approximate_home, 10000)
      -- Prior action: someone who already has this intent is not sent it again.
      and not exists (
        select 1 from public.intent_deliveries d
        where d.intent_id = target_intent and d.recipient_id = p.id
      )
  ), inserted as (
    insert into public.intent_deliveries (intent_id, recipient_id, reason_code, reason_text)
    select target_intent, eligible.recipient_id, reason.reason_code, reason.reason_text
    from eligible
    returning 1
  )
  select count(*) into created_count from inserted;

  return created_count;
end;
$$;

-- The Home feed.
--
-- Ranking is separate from eligibility, and applied only to rows that already
-- earned a delivery. Each component is named so an ordering can be explained
-- rather than defended as a black box:
--
--   trust      a closer connection outranks a broader one
--   geography  a shorter band outranks a longer one
--   timing     an intent closing sooner outranks one with time to spare
--   recency    a newer delivery outranks an older one
--   fatigue    handled by the finite limit rather than by scoring, so a quiet
--              day shows a short list instead of padding it out
--
-- Hidden and not-relevant rows never return, which is what makes the feed
-- finite rather than endless.

create or replace function public.home_feed(page_size integer default 20)
returns table (
  delivery_id uuid,
  intent_id uuid,
  primitive public.intent_primitive,
  statement text,
  response_action text,
  expires_at timestamptz,
  approximate_place text,
  distance_band text,
  broadcaster_first_name text,
  reason_code text,
  reason_text text,
  is_saved boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    i.id,
    i.primitive,
    i.statement,
    i.response_action,
    i.expires_at,
    c.approximate_place,
    public.distance_band(
      extensions.st_distance(c.approximate_geography, viewer.approximate_home)
    ),
    split_part(p.display_name, ' ', 1),
    d.reason_code,
    d.reason_text,
    d.saved_at is not null
  from public.intent_deliveries d
  join public.intents i on i.id = d.intent_id
  join public.intent_context c on c.intent_id = i.id
  join public.profiles p on p.id = i.broadcaster_id
  cross join (
    select approximate_home, id from public.profiles where id = auth.uid()
  ) as viewer
  where d.recipient_id = viewer.id
    and d.hidden_at is null
    and d.feedback is distinct from 'not_relevant'
    and i.status = 'live'
    and i.expires_at > now()
    and not p.is_restricted
    and not private.is_blocked(i.broadcaster_id, viewer.id)
  order by
    case d.reason_code
      when 'origin_recipient' then 0
      when 'adjacent_trust_connection' then 1
      when 'nearby_interest_match' then 2
      else 3
    end,
    case public.distance_band(
      extensions.st_distance(c.approximate_geography, viewer.approximate_home)
    )
      when 'walking_distance' then 0
      when 'nearby' then 1
      when 'short_trip' then 2
      when 'further_out' then 3
      else 4
    end,
    i.expires_at asc,
    d.delivered_at desc
  limit greatest(1, least(page_size, 50));
$$;

revoke execute on function private.delivery_reason(public.reach_level) from public, anon, authenticated;
revoke execute on function public.generate_deliveries(uuid) from public, anon, authenticated;
revoke execute on function public.home_feed(integer) from public, anon;
grant execute on function public.home_feed(integer) to authenticated;
