-- The detail view for an intent that reached you.
--
-- The Home feed hands over a card; opening one needs the same intent in more
-- detail, and needs it to be the intent the caller was actually delivered. That
-- authorisation is the whole reason this is a function rather than a table read:
-- membership of `intent_deliveries` is the permission, so a fabricated id in a
-- deep link returns no rows instead of content.
--
-- What it deliberately does not return: any column of `intent_private`. Exact
-- place, address, contact and coordination notes stay behind acceptance and a
-- separate disclosure action. A caller cannot ask for what is not in the return
-- type.
--
-- Two filters from `home_feed` are deliberately absent here.
--
-- Lifecycle and expiry: the feed hides a closed intent because a closed intent
-- is not an opportunity. The detail screen has the opposite need — someone who
-- tapped a card a moment before it expired deserves "this closed" rather than
-- "not available", so the status and expiry come back and the screen explains
-- them. Nothing new is disclosed: this person could already read the card.
--
-- Hidden and not-relevant: hiding is a statement about the feed, not a
-- withdrawal of access. A row already open on screen still reloads. But
-- `submit_response` does treat a hidden delivery as ineligible, so `is_hidden`
-- comes back with the row: the screen has to stop offering an action the server
-- would refuse, and the honest way to do that is to say why.
--
-- Restriction and blocks are enforced, because those are real access changes.

create or replace function public.delivered_intent(target_intent uuid)
returns table (
  delivery_id uuid,
  intent_id uuid,
  primitive public.intent_primitive,
  statement text,
  response_action text,
  status public.intent_status,
  expires_at timestamptz,
  published_at timestamptz,
  starts_at timestamptz,
  deadline_at timestamptz,
  quantity numeric,
  price_minor bigint,
  currency char(3),
  requirements jsonb,
  approximate_place text,
  distance_band text,
  broadcaster_first_name text,
  confirmation_count bigint,
  viewer_has_confirmed boolean,
  reason_code text,
  reason_text text,
  is_saved boolean,
  is_hidden boolean,
  my_response_status public.response_status
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
    i.status,
    i.expires_at,
    i.published_at,
    c.starts_at,
    c.deadline_at,
    c.quantity,
    c.price_minor,
    c.currency,
    c.requirements,
    c.approximate_place,
    -- A band, never a distance in metres and never the point it came from.
    public.distance_band(
      extensions.st_distance(c.approximate_geography, viewer.approximate_home)
    ),
    case
      when r.show_broadcaster_first_name then split_part(p.display_name, ' ', 1)
    end,
    (select count(*) from public.intent_confirmations ic where ic.intent_id = i.id),
    -- Both halves of the confirmation sentence, so the detail can reuse the
    -- share screen's wording instead of growing a second, divergent version.
    exists (
      select 1 from public.intent_confirmations ic
      where ic.intent_id = i.id and ic.confirmer_id = viewer.id
    ),
    d.reason_code,
    d.reason_text,
    d.saved_at is not null,
    d.hidden_at is not null,
    -- The caller's own response only. A respondent never learns that anyone
    -- else replied, so this is scoped to the viewer rather than aggregated.
    (
      select s.status
      from public.responses s
      where s.intent_id = i.id and s.respondent_id = viewer.id
    )
  from public.intent_deliveries d
  join public.intents i on i.id = d.intent_id
  join public.intent_context c on c.intent_id = i.id
  join public.intent_reach r on r.intent_id = i.id
  join public.profiles p on p.id = i.broadcaster_id
  cross join (
    select approximate_home, id from public.profiles where id = auth.uid()
  ) as viewer
  where d.intent_id = target_intent
    and d.recipient_id = viewer.id
    and not p.is_restricted
    and not private.is_blocked(i.broadcaster_id, viewer.id);
$$;

-- Honour the broadcaster's first-name choice on the feed too.
--
-- `intent_reach.show_broadcaster_first_name` exists so a broadcaster can stay
-- unnamed. `get_public_intent` has always respected it; `home_feed` did not, so
-- an intent published with the flag off still showed a first name on every card
-- delivered by discovery — the one surface where most people would see it. The
-- detail function above has to agree with the card it was opened from, and the
-- version that agrees is the one that honours the flag.

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
    case
      when r.show_broadcaster_first_name then split_part(p.display_name, ' ', 1)
    end,
    d.reason_code,
    d.reason_text,
    d.saved_at is not null
  from public.intent_deliveries d
  join public.intents i on i.id = d.intent_id
  join public.intent_context c on c.intent_id = i.id
  join public.intent_reach r on r.intent_id = i.id
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

revoke execute on function public.delivered_intent(uuid) from public, anon;
grant execute on function public.delivered_intent(uuid) to authenticated;
