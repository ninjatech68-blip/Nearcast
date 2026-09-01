-- ===============================================================
-- Delivery: how a cast reaches people.
-- ===============================================================
--
-- Two things happen here.
--
-- First, a correction to the foundation. cast_reach carried a radius
-- with nothing to measure from -- a cast had no origin. Building this
-- slice is what surfaced it, which is the argument for building in
-- slices.
--
-- The fix keeps L2 intact. A cast is broadcast FROM one of the caster's
-- own approved areas, by composite foreign key, so:
--   - no new coordinate enters the schema; the centroid already existed
--   - a person cannot cast from somewhere they have not claimed
--   - the point still describes a neighbourhood, never a person
--
-- Second, generate_deliveries(). Service role only: eligibility is not
-- a thing a client gets to evaluate, and the reason each person was
-- reached is written at delivery time (L8) rather than computed when a
-- screen renders it. The reason shown is therefore the reason that
-- actually applied.
-- ===============================================================

-- --------------------------------------------------------------
-- 1. a cast has an origin, and it is one of the caster's areas
-- --------------------------------------------------------------
-- Not null, deliberately. A nullable composite FK is MATCH SIMPLE: a row
-- with a null in either column skips the check entirely. A cast without an
-- origin is also a cast a 'nearby' radius cannot be measured from, so the
-- column carries the invariant rather than a later check constraint.
alter table public.casts
  add column area_name text not null;

-- Composite FK: the area must belong to this cast's caster.
alter table public.casts
  add constraint casts_area_is_casters
  foreign key (caster_id, area_name)
  references public.person_areas (person_id, name)
  on delete restrict;

-- --------------------------------------------------------------
-- 2. eligibility, as one readable predicate per rule
-- --------------------------------------------------------------
--
-- Order matters and mirrors the matrix: lifecycle, reach, area,
-- interest, block, restriction, self, already-delivered. Each is a
-- separate clause so a failing test names the rule that broke.

create or replace function private.cast_origin(target uuid)
returns extensions.geography language sql stable security definer set search_path = '' as $$
  select a.centroid
    from public.casts c
    join public.person_areas a
      on a.person_id = c.caster_id and a.name = c.area_name
   where c.id = target;
$$;

-- Who should this cast reach, and why. Returns the eligible set with the
-- reason already decided -- so the generator cannot insert a row without
-- one, and the reason is a fact about the delivery rather than a render.
create or replace function private.eligible_for(target uuid)
returns table (person_id uuid, reason_code public.delivery_reason, reason_text text)
language sql stable security definer set search_path = '' as $$
  with c as (
    select cc.*, r.kind, r.radius_m
      from public.casts cc
      join public.cast_reach r on r.cast_id = cc.id
     where cc.id = target
       and cc.state = 'live'                      -- lifecycle
       and cc.expires_at > now()
  ),
  -- reach: circles
  by_circle as (
    select m.person_id,
           'circle'::public.delivery_reason,
           -- names the relationship, never the circle (L3)
           'you are in a circle of theirs'::text
      from c
      join public.cast_reach_circles rc on rc.cast_id = c.id
      join public.circle_members m on m.circle_id = rc.circle_id
     where c.kind = 'circles'
  ),
  -- reach: nearby -- an approved area of theirs within the radius,
  -- and the category among their interests
  by_nearby as (
    select distinct a.person_id,
           'nearby'::public.delivery_reason,
           ('near you, and you are into ' || c.category::text)::text
      from c
      join public.person_areas a
        on extensions.ST_DWithin(a.centroid, private.cast_origin(c.id), c.radius_m)
      join public.person_interests i
        on i.person_id = a.person_id and i.category = c.category
     where c.kind = 'nearby'
  ),
  candidates as (
    select * from by_circle union all select * from by_nearby
  )
  select k.person_id, k.reason_code, k.reason_text
    from candidates k(person_id, reason_code, reason_text)
    join c on true
   where k.person_id <> c.caster_id                          -- not self
     and not private.is_blocked(c.caster_id, k.person_id)    -- either direction
     and not private.is_restricted(k.person_id)              -- L9
     and private.is_verified(k.person_id)
     and not exists (                                        -- idempotent
       select 1 from public.cast_deliveries d
        where d.cast_id = c.id and d.person_id = k.person_id
     );
$$;

-- --------------------------------------------------------------
-- 3. the generator
-- --------------------------------------------------------------
-- Service role only. Re-running is a no-op: the eligible set already
-- excludes anyone delivered, and the primary key is the backstop.
create or replace function private.generate_deliveries(target uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare written integer;
begin
  insert into public.cast_deliveries (cast_id, person_id, reason_code, reason_text)
  select target, e.person_id, e.reason_code, e.reason_text
    from private.eligible_for(target) e
  on conflict (cast_id, person_id) do nothing;
  get diagnostics written = row_count;

  insert into public.cast_events (cast_id, event)
  values (target, 'delivered:' || written::text);
  return written;
end;
$$;

-- --------------------------------------------------------------
-- 4. the feed
-- --------------------------------------------------------------
-- A person's own deliveries, newest first, still live.
--
-- SECURITY DEFINER because it calls private.is_blocked, which takes a
-- person and is therefore never granted to a client (see the corollary in
-- the README). That means RLS does not apply here, so the where clause
-- carries the whole restriction: d.person_id = auth.uid() is the first
-- condition and there is no path around it. The function widens nothing --
-- every row it returns, RLS would have allowed anyway.
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
  delivered_at timestamptz
) language sql stable security definer set search_path = '' as $$
  select c.id, p.display_name, c.category, c.statement, c.slots,
         (select count(*) from public.join_requests r
           where r.cast_id = c.id and r.state = 'accepted'),
         c.happens_at, c.expires_at, d.reason_text, d.delivered_at
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

create or replace function public.hide_cast(in_cast uuid, in_not_relevant boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  update public.cast_deliveries
     set hidden_at = now(),
         feedback = case when in_not_relevant then 'not_relevant' end
   where cast_id = in_cast and person_id = me;
  if not found then raise exception 'not_delivered' using errcode = 'P0002'; end if;
end;
$$;

-- --------------------------------------------------------------
-- 5. publish now generates, and requires an area
-- --------------------------------------------------------------
create or replace function public.publish_cast(
  in_category public.cast_category,
  in_statement text,
  in_slots integer,
  in_happens_at timestamptz,
  in_reach public.reach_kind,
  in_area_name text,
  in_radius_m integer default null,
  in_circles uuid[] default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := private.assert_actor();
        new_id uuid;
begin
  if in_happens_at <= now() then
    raise exception 'happens_in_the_past' using errcode = '23514';
  end if;
  if in_slots is null or in_slots < 1 or in_slots > 20 then
    raise exception 'slots_out_of_range' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.person_areas
     where person_id = me and name = in_area_name
  ) then
    raise exception 'not_your_area' using errcode = '42501';
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

  insert into public.casts (caster_id, category, statement, slots, area_name,
                            happens_at, expires_at, state, published_at)
  values (me, in_category, btrim(in_statement), in_slots::smallint, in_area_name,
          in_happens_at, in_happens_at + interval '3 hours', 'live', now())
  returning id into new_id;

  insert into public.cast_reach (cast_id, kind, radius_m)
  values (new_id, in_reach, case when in_reach = 'nearby' then coalesce(in_radius_m, 3000) end);

  if in_reach = 'circles' then
    insert into public.cast_reach_circles (cast_id, circle_id)
    select new_id, cid from unnest(in_circles) cid;
  end if;

  insert into public.cast_events (cast_id, actor_id, event) values (new_id, me, 'published');
  insert into public.analytics_outbox (event, actor_id, properties)
  values ('cast_published', me, jsonb_build_object('category', in_category, 'reach', in_reach));

  -- L6: deliveries are generated once, here, from the reach that was
  -- chosen at publish. Nothing widens them afterwards.
  perform private.generate_deliveries(new_id);
  return new_id;
end;
$$;

drop function if exists public.publish_cast(
  public.cast_category, text, integer, timestamptz, public.reach_kind, integer, uuid[]
);

-- --------------------------------------------------------------
-- 6. grants
-- --------------------------------------------------------------
grant execute on function
  public.publish_cast(public.cast_category, text, integer, timestamptz,
                      public.reach_kind, text, integer, uuid[]),
  public.my_feed(timestamptz, integer),
  public.hide_cast(uuid, boolean)
  to authenticated;

-- generate_deliveries, eligible_for and cast_origin stay in private and
-- ungranted: eligibility is the server's judgement, and cast_origin
-- returns a point.
revoke execute on function
  private.generate_deliveries(uuid),
  private.eligible_for(uuid),
  private.cast_origin(uuid)
  from public, anon, authenticated;
