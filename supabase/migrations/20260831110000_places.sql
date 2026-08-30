-- Places.
--
-- Discovery needs an approximate point, and the composer collects a place name.
-- Something has to turn one into the other.
--
-- A third-party geocoding API would do it, at the cost of telling that provider
-- where every Nearcast user is asking about, on every publish. For a closed
-- alpha in one city a curated table of neighbourhood centroids answers the same
-- question with no external dependency, no API key, no rate limit, and nothing
-- leaving the database. It is also coarse by construction: a neighbourhood
-- centroid is approximate in a way a geocoded street address is not.
--
-- The client sends a place id and never handles a coordinate at all, so there
-- is no latitude in the app, in a draft on disk, or in a request body.

create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 80),
  region text not null check (char_length(btrim(region)) between 1 and 80),
  -- The approximate centre of the named area, never a precise address.
  centre extensions.geography(point, 4326) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index places_centre_idx on public.places using gist (centre);
create index places_active_name_idx on public.places (name) where is_active;

alter table public.places enable row level security;

-- Places are reference data: readable by any signed-in member, writable by
-- nobody through the API.
create policy places_read_authenticated on public.places for select to authenticated
using (is_active);

grant select on public.places to authenticated;

-- Approximate centres for the closed-alpha city. Neighbourhood centroids, not
-- addresses; precision beyond this would defeat the point of an approximate
-- location.
insert into public.places (name, region, centre) values
  ('Indiranagar',   'Bengaluru', extensions.st_point(77.6408, 12.9784)::extensions.geography),
  ('Koramangala',   'Bengaluru', extensions.st_point(77.6245, 12.9352)::extensions.geography),
  ('Jayanagar',     'Bengaluru', extensions.st_point(77.5833, 12.9250)::extensions.geography),
  ('Malleshwaram',  'Bengaluru', extensions.st_point(77.5700, 13.0035)::extensions.geography),
  ('Whitefield',    'Bengaluru', extensions.st_point(77.7500, 12.9698)::extensions.geography),
  ('HSR Layout',    'Bengaluru', extensions.st_point(77.6446, 12.9116)::extensions.geography),
  ('Basavanagudi',  'Bengaluru', extensions.st_point(77.5730, 12.9420)::extensions.geography),
  ('Rajajinagar',   'Bengaluru', extensions.st_point(77.5560, 12.9910)::extensions.geography),
  ('Hebbal',        'Bengaluru', extensions.st_point(77.5910, 13.0358)::extensions.geography),
  ('Bellandur',     'Bengaluru', extensions.st_point(77.6780, 12.9260)::extensions.geography);

-- Setting a member's approximate home from a place, rather than from a device
-- coordinate. The member names an area they are willing to be found near; the
-- app never learns or sends where they actually are.
create or replace function public.set_home_place(target_place uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  chosen public.places;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into chosen from public.places where id = target_place and is_active;

  if chosen.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  update public.profiles
  set approximate_home = chosen.centre, city = chosen.name, updated_at = now()
  where id = actor;

  if not found then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return chosen.name;
end;
$$;

revoke execute on function public.set_home_place(uuid) from public, anon;
grant execute on function public.set_home_place(uuid) to authenticated;

-- Publishing from a place.
--
-- Replaces the latitude/longitude pair added a moment ago. The client sends a
-- place id and the server resolves both the displayed name and the point, so a
-- coordinate never exists in the app, in a draft on disk, or in a request body.
-- Resolving server-side also means the name shown and the point measured
-- against can never disagree.

drop function if exists public.publish_intent(
  public.intent_primitive, text, text, timestamptz, public.reach_level, boolean,
  boolean, timestamptz, timestamptz, numeric, bigint, char(3), text,
  double precision, double precision, jsonb, text, text, text, uuid
);

create or replace function public.publish_intent(
  intent_primitive public.intent_primitive,
  intent_statement text,
  intent_response_action text,
  intent_expires_at timestamptz,
  reach public.reach_level default 'origin_only',
  link_enabled boolean default true,
  show_first_name boolean default true,
  context_starts_at timestamptz default null,
  context_deadline_at timestamptz default null,
  context_quantity numeric default null,
  context_price_minor bigint default null,
  context_currency char(3) default null,
  context_place uuid default null,
  context_requirements jsonb default '[]'::jsonb,
  private_exact_address text default null,
  private_contact text default null,
  private_coordination_notes text default null,
  request_key uuid default null
)
returns table (
  intent_id uuid,
  intent_share_slug uuid,
  intent_status public.intent_status,
  intent_version integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  trimmed_statement text := btrim(intent_statement);
  trimmed_action text := btrim(intent_response_action);
  place public.places;
  request_fingerprint text;
  stored public.request_idempotency;
  created public.intents;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = actor) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if char_length(trimmed_statement) < 1 or char_length(trimmed_statement) > 500 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if char_length(trimmed_action) < 1 or char_length(trimmed_action) > 40 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if intent_expires_at <= now() then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if (context_price_minor is null) <> (context_currency is null) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if context_place is not null then
    select * into place from public.places where id = context_place and is_active;

    if place.id is null then
      raise exception 'invalid_input' using errcode = '22023';
    end if;
  end if;

  request_fingerprint := encode(
    extensions.digest(
      trimmed_statement || ':' || trimmed_action || ':' ||
      intent_primitive::text || ':' || intent_expires_at::text || ':' || reach::text,
      'sha256'
    ),
    'hex'
  );

  if request_key is not null then
    select * into stored
    from public.request_idempotency i
    where i.actor_id = actor
      and i.operation = 'publish-intent'
      and i.request_key = publish_intent.request_key;

    if stored.actor_id is not null then
      if stored.fingerprint <> request_fingerprint then
        raise exception 'conflict' using errcode = '23505';
      end if;

      select * into created from public.intents
      where id = (stored.result ->> 'intent_id')::uuid;

      return query select created.id, created.share_slug, created.status, created.version;
      return;
    end if;
  end if;

  insert into public.intents (
    broadcaster_id, primitive, statement, status, response_action,
    expires_at, published_at
  ) values (
    actor, intent_primitive, trimmed_statement, 'live', trimmed_action,
    intent_expires_at, now()
  ) returning * into created;

  insert into public.intent_context (
    intent_id, starts_at, deadline_at, quantity, price_minor, currency,
    approximate_place, approximate_geography, requirements
  ) values (
    created.id, context_starts_at, context_deadline_at, context_quantity,
    context_price_minor, context_currency, place.name, place.centre,
    coalesce(context_requirements, '[]'::jsonb)
  );

  insert into public.intent_private (
    intent_id, exact_address, private_contact, coordination_notes
  ) values (
    created.id,
    nullif(btrim(private_exact_address), ''),
    nullif(btrim(private_contact), ''),
    nullif(btrim(private_coordination_notes), '')
  );

  insert into public.intent_reach (
    intent_id, level, public_link_enabled, show_broadcaster_first_name
  ) values (created.id, reach, link_enabled, show_first_name);

  insert into public.intent_events (
    intent_id, actor_id, event_type, from_status, to_status
  ) values (created.id, actor, 'intent_published', 'draft', 'live');

  insert into public.analytics_outbox (event_name, actor_id, object_id, properties)
  values (
    'intent_published', actor, created.id,
    jsonb_build_object(
      'primitive', intent_primitive::text,
      'reach_level', reach::text,
      'has_approximate_place', place.id is not null,
      'has_private_details',
        nullif(btrim(private_exact_address), '') is not null
        or nullif(btrim(private_contact), '') is not null
        or nullif(btrim(private_coordination_notes), '') is not null
    )
  );

  if request_key is not null then
    insert into public.request_idempotency (
      actor_id, operation, request_key, fingerprint, result
    ) values (
      actor, 'publish-intent', publish_intent.request_key, request_fingerprint,
      jsonb_build_object('intent_id', created.id, 'share_slug', created.share_slug)
    );
  end if;

  perform public.generate_deliveries(created.id);

  return query select created.id, created.share_slug, created.status, created.version;
end;
$$;

revoke execute on function public.publish_intent(
  public.intent_primitive, text, text, timestamptz, public.reach_level, boolean,
  boolean, timestamptz, timestamptz, numeric, bigint, char(3), uuid, jsonb,
  text, text, text, uuid
) from public, anon;

grant execute on function public.publish_intent(
  public.intent_primitive, text, text, timestamptz, public.reach_level, boolean,
  boolean, timestamptz, timestamptz, numeric, bigint, char(3), uuid, jsonb,
  text, text, text, uuid
) to authenticated;
