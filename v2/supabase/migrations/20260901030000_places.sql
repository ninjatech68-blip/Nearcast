-- ===============================================================
-- The venue: a cast has a place, and the place is earned.
-- ===============================================================
--
-- A cast now carries where the thing actually is, plus a radius
-- measured from there. The feed says "approx 3 km away". Acceptance
-- reveals the point and the place name.
--
-- The reason this is not simply a column on casts:
--
-- "X km away" is a distance from a known point to an unknown one,
-- which puts the venue on a circle. Three distances fix it exactly,
-- and measurements are free -- person_areas are self-declared and
-- unlimited, so one account can plant three areas across the city and
-- read three distances straight off the feed. Without a defence, the
-- venue is recoverable to within metres by someone who was never
-- accepted, which defeats the entire gate.
--
-- So the venue is stored twice:
--   casts.match_point    coarsened to ~1 km. Drives matching and the
--                        distance shown. Trilaterating it recovers the
--                        cell, not the café.
--   cast_places.point    exact, plus the place name, behind RLS that
--                        only the caster and accepted participants pass.
--
-- The place NAME sits in the gated table with the point. "Third Wave
-- Coffee, 100ft Road" is the venue; a text column is not a lesser
-- disclosure than two floats, and putting it on casts "for the card"
-- is exactly how this leaks.
--
-- What cannot be fixed: receiving a cast at all tells you you are
-- within its radius. That is inherent to location-based delivery. The
-- question was only ever precision.
-- ===============================================================

-- --------------------------------------------------------------
-- 1. coarsening
-- --------------------------------------------------------------
-- Two decimal places. 0.01 degrees is ~1.11 km of latitude, and of
-- longitude ~1.08 km at Bangalore's latitude. Ungranted: a client that
-- could ask the server to coarsen arbitrary points could binary-search
-- the grid, which is a smaller leak than the venue but still a free one.
create or replace function private.coarse_point(lat double precision, lng double precision)
returns extensions.geography language sql immutable set search_path = '' as $$
  select extensions.ST_Point(
    round(lng::numeric, 2)::double precision,
    round(lat::numeric, 2)::double precision
  )::extensions.geography;
$$;

-- --------------------------------------------------------------
-- 2. the cast carries a coarse point; area_name goes
-- --------------------------------------------------------------
-- area_name was my fix for "a nearby cast had no origin". The cast now
-- has a real origin of its own, so the composite FK stops meaning
-- anything. It did quietly prevent one account blanketing a city from
-- places it has no connection to; restriction and reporting carry that
-- now, the way every events product handles it.
alter table public.casts drop constraint if exists casts_area_is_casters;
alter table public.casts drop column if exists area_name;
alter table public.casts add column match_point extensions.geography(point, 4326);
create index casts_match_point_idx on public.casts using gist (match_point);

create table public.cast_places (
  cast_id uuid primary key references public.casts(id) on delete cascade,
  point extensions.geography(point, 4326) not null,
  place_name text not null check (char_length(btrim(place_name)) between 1 and 120),
  created_at timestamptz not null default now()
);

-- A 500 m radius against a 1 km cell is noise. The floor rises to 2 km,
-- which is a real capability removed and a deliberate trade.
alter table public.cast_reach drop constraint if exists cast_reach_radius_m_check;
alter table public.cast_reach
  add constraint cast_reach_radius_m_check
  check (radius_m is null or radius_m between 2000 and 20000);

-- --------------------------------------------------------------
-- 3. who may see a venue
-- --------------------------------------------------------------
-- Caller-scoped, per the corollary: it takes a cast and answers only
-- about auth.uid(). Nobody can ask whether someone else was accepted.
create or replace function private.may_see_place(c uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.casts where id = c and caster_id = auth.uid())
      or exists (select 1 from public.join_requests
                  where cast_id = c and person_id = auth.uid() and state = 'accepted');
$$;

alter table public.cast_places enable row level security;
create policy cast_places_read_gated on public.cast_places for select to authenticated
using (private.may_see_place(cast_id));

-- --------------------------------------------------------------
-- 4. matching measures from the coarse point
-- --------------------------------------------------------------
create or replace function private.cast_origin(target uuid)
returns extensions.geography language sql stable security definer set search_path = '' as $$
  select match_point from public.casts where id = target;
$$;

-- --------------------------------------------------------------
-- 5. publishing
-- --------------------------------------------------------------
drop function if exists public.publish_cast(
  public.cast_category, text, integer, timestamptz, public.reach_kind, text, integer, uuid[]
);

create or replace function public.publish_cast(
  in_category public.cast_category,
  in_statement text,
  in_slots integer,
  in_happens_at timestamptz,
  in_reach public.reach_kind,
  in_lat double precision,
  in_lng double precision,
  in_place_name text,
  in_radius_m integer default null,
  in_circles uuid[] default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := private.assert_actor();
        new_id uuid;
        radius integer := case when in_reach = 'nearby' then coalesce(in_radius_m, 3000) end;
begin
  if in_happens_at <= now() then
    raise exception 'happens_in_the_past' using errcode = '23514';
  end if;
  if in_slots is null or in_slots < 1 or in_slots > 20 then
    raise exception 'slots_out_of_range' using errcode = '23514';
  end if;
  if in_lat is null or in_lng is null
     or in_lat not between -90 and 90 or in_lng not between -180 and 180 then
    raise exception 'bad_place' using errcode = '23514';
  end if;
  if coalesce(btrim(in_place_name), '') = '' then
    raise exception 'no_place_name' using errcode = '23514';
  end if;
  if in_reach = 'nearby' and radius not between 2000 and 20000 then
    raise exception 'radius_out_of_range' using errcode = '23514';
  end if;
  if in_reach = 'circles' and coalesce(array_length(in_circles, 1), 0) = 0 then
    raise exception 'no_circle_selected' using errcode = '23514';
  end if;
  if in_reach = 'circles' and exists (
    select 1 from unnest(in_circles) cid
     where not exists (select 1 from public.circles c where c.id = cid and c.owner_id = me)
  ) then
    raise exception 'not_your_circle' using errcode = '42501';
  end if;

  insert into public.casts (caster_id, category, statement, slots, match_point,
                            happens_at, expires_at, state, published_at)
  values (me, in_category, btrim(in_statement), in_slots::smallint,
          private.coarse_point(in_lat, in_lng),
          in_happens_at, in_happens_at + interval '3 hours', 'live', now())
  returning id into new_id;

  -- the real thing, in the gated table, never on the cast row
  insert into public.cast_places (cast_id, point, place_name)
  values (new_id,
          extensions.ST_Point(in_lng, in_lat)::extensions.geography,
          btrim(in_place_name));

  insert into public.cast_reach (cast_id, kind, radius_m) values (new_id, in_reach, radius);
  if in_reach = 'circles' then
    insert into public.cast_reach_circles (cast_id, circle_id)
    select new_id, cid from unnest(in_circles) cid;
  end if;

  insert into public.cast_events (cast_id, actor_id, event) values (new_id, me, 'published');
  insert into public.analytics_outbox (event, actor_id, properties)
  values ('cast_published', me, jsonb_build_object('category', in_category, 'reach', in_reach));

  perform private.generate_deliveries(new_id);
  return new_id;
end;
$$;

-- --------------------------------------------------------------
-- 6. the feed says how far, and nothing else
-- --------------------------------------------------------------
-- distance_m is measured from the COARSE point to the reader's nearest
-- area, then rounded to 500 m. Both steps matter: the first bounds what
-- trilateration can recover, the second stops the rounding of the
-- distance itself carrying sub-cell precision.
drop function if exists public.my_feed(timestamptz, integer);

create or replace function public.my_feed(before timestamptz default null, page_size integer default 20)
returns table (
  cast_id uuid,
  caster_name text,
  category public.cast_category,
  statement text,
  slots smallint,
  taken bigint,
  happens_at timestamptz,
  expires_at timestamptz,
  reason_text text,
  distance_m integer,
  delivered_at timestamptz
) language sql stable security definer set search_path = '' as $$
  select c.id, p.display_name, c.category, c.statement, c.slots,
         (select count(*) from public.join_requests r
           where r.cast_id = c.id and r.state = 'accepted'),
         c.happens_at, c.expires_at, d.reason_text,
         (select (round(min(extensions.ST_Distance(a.centroid, c.match_point)) / 500.0) * 500)::integer
            from public.person_areas a where a.person_id = auth.uid()),
         d.delivered_at
    from public.cast_deliveries d
    join public.casts c on c.id = d.cast_id
    join public.people p on p.id = c.caster_id
   where d.person_id = auth.uid()
     and d.hidden_at is null
     and c.state = 'live'
     and c.expires_at > now()
     and not private.is_blocked(c.caster_id, auth.uid())
     and (before is null or d.delivered_at < before)
   order by d.delivered_at desc
   limit least(greatest(page_size, 1), 50);
$$;

-- --------------------------------------------------------------
-- 7. grants
-- --------------------------------------------------------------
grant select on public.cast_places to authenticated;
revoke insert, update, delete, truncate, references
  on public.cast_places from authenticated, anon;

grant execute on function
  public.publish_cast(public.cast_category, text, integer, timestamptz, public.reach_kind,
                      double precision, double precision, text, integer, uuid[]),
  public.my_feed(timestamptz, integer)
  to authenticated;

-- may_see_place is caller-scoped, so RLS may call it
grant execute on function private.may_see_place(uuid) to authenticated;

-- coarse_point is not for clients: a coarsening oracle lets someone
-- binary-search the grid boundaries for free.
revoke execute on function private.coarse_point(double precision, double precision)
  from public, anon, authenticated;
