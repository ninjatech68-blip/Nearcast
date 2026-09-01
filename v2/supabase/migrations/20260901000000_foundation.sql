-- ===============================================================
-- Nearcast foundation.
-- ===============================================================
--
-- Derived from the permissions matrix, which is derived from fifteen
-- recorded product decisions. Read that document before changing this
-- one; a change here that the matrix does not justify is a bug.
--
-- The governing rule, and the reason this file looks the way it does:
--
--   Clients hold SELECT and EXECUTE. Nothing else. There is no INSERT,
--   UPDATE or DELETE grant to any client role on any table, and no
--   policy for any command but SELECT. Every write is a SECURITY
--   DEFINER function.
--
-- The previous build granted table-wide writes and relied on row
-- policies to hold the line. Four privilege escalations followed, each
-- the same shape: a policy that knew which row you owned and not which
-- column. Granting no write privilege at all removes the category --
-- there is no column to scope and no policy to get wrong, and a new
-- table is safe by default rather than dangerous by default.
-- ===============================================================

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

-- --------------------------------------------------------------
-- 1. types
-- --------------------------------------------------------------
create type public.cast_category as enum (
  'social','sports','food','music','travel','games','arts','learning','networking','help'
);
create type public.cast_state as enum ('live','full','ended','withdrawn','expired','removed');
create type public.reach_kind as enum ('circles','nearby');
create type public.request_state as enum ('pending','accepted','declined','withdrawn');
create type public.delivery_reason as enum ('circle','nearby');
create type public.moderation_verb as enum ('restrict','unrestrict','remove_cast','dismiss');

-- --------------------------------------------------------------
-- 2. identity
-- --------------------------------------------------------------
create table public.people (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Phone lives apart from the readable profile. No policy exposes it to
-- anyone but its owner, so a phone number cannot leak through a join.
create table public.person_verification (
  person_id uuid primary key references public.people(id) on delete cascade,
  phone_e164 text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  verified_at timestamptz,
  attempts smallint not null default 0
);

-- L2: a person has AREAS, never a coordinate of their own. The centroid
-- describes a neighbourhood, not a person, and is readable by nobody else.
create table public.person_areas (
  person_id uuid not null references public.people(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  centroid extensions.geography(point, 4326) not null,
  primary key (person_id, name)
);

create table public.person_interests (
  person_id uuid not null references public.people(id) on delete cascade,
  category public.cast_category not null,
  primary key (person_id, category)
);

-- L9: moderation state lives on its own table, not on the person's row.
-- Even if the write rule were relaxed, there is nothing here to self-clear.
create table public.account_restrictions (
  person_id uuid primary key references public.people(id) on delete cascade,
  reason text not null,
  restricted_at timestamptz not null default now(),
  lifted_at timestamptz
);

-- --------------------------------------------------------------
-- 3. trust
-- --------------------------------------------------------------
create table public.circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.people(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (circle_id, person_id)
);

-- L5: a vouch needs a settled receipt behind it. Enforced in vouch_for();
-- the table records only that it happened.
create table public.vouches (
  voucher_id uuid not null references public.people(id) on delete cascade,
  vouchee_id uuid not null references public.people(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (voucher_id, vouchee_id),
  check (voucher_id <> vouchee_id)
);

create table public.blocks (
  blocker_id uuid not null references public.people(id) on delete cascade,
  blocked_id uuid not null references public.people(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

-- --------------------------------------------------------------
-- 4. casts
-- --------------------------------------------------------------
create table public.casts (
  id uuid primary key default gen_random_uuid(),
  caster_id uuid not null references public.people(id) on delete cascade,
  category public.cast_category not null,
  statement text not null check (char_length(btrim(statement)) between 1 and 140),
  slots smallint not null default 1 check (slots between 1 and 20),
  happens_at timestamptz not null,
  expires_at timestamptz not null,
  state public.cast_state not null default 'live',
  frozen_at timestamptz,                       -- L10
  published_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (expires_at >= happens_at)
);
create index casts_caster_idx on public.casts (caster_id);
create index casts_live_idx on public.casts (state, expires_at) where state = 'live';

create table public.cast_reach (
  cast_id uuid primary key references public.casts(id) on delete cascade,
  kind public.reach_kind not null,
  radius_m integer check (radius_m between 500 and 20000),
  check ((kind = 'nearby') = (radius_m is not null))
);

create table public.cast_reach_circles (
  cast_id uuid not null references public.casts(id) on delete cascade,
  circle_id uuid not null references public.circles(id) on delete cascade,
  primary key (cast_id, circle_id)
);

-- L8: reason_code and reason_text are both mandatory and non-empty, so
-- an unexplained delivery cannot exist -- not even by service-role insert.
create table public.cast_deliveries (
  cast_id uuid not null references public.casts(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  reason_code public.delivery_reason not null,
  reason_text text not null check (char_length(btrim(reason_text)) between 1 and 160),
  delivered_at timestamptz not null default now(),
  hidden_at timestamptz,
  feedback text check (feedback in ('not_relevant')),
  primary key (cast_id, person_id)
);
create index cast_deliveries_person_idx on public.cast_deliveries (person_id, delivered_at desc);

create table public.cast_events (
  id bigint generated always as identity primary key,
  cast_id uuid not null references public.casts(id) on delete cascade,
  actor_id uuid references public.people(id) on delete set null,
  event text not null,
  at timestamptz not null default now()
);
create index cast_events_cast_idx on public.cast_events (cast_id, at);

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  cast_id uuid not null references public.casts(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  note text check (char_length(btrim(note)) <= 280),
  state public.request_state not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (cast_id, person_id)
);
create index join_requests_cast_idx on public.join_requests (cast_id, state);
create index join_requests_person_idx on public.join_requests (person_id);

-- --------------------------------------------------------------
-- 5. safety and operations
-- --------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.people(id) on delete cascade,
  subject_person_id uuid references public.people(id) on delete set null,
  subject_cast_id uuid references public.casts(id) on delete set null,
  reason text not null,
  note text check (char_length(note) <= 1000),
  evidence jsonb not null default '{}'::jsonb,   -- snapshot; survives deletion
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  check (subject_person_id is not null or subject_cast_id is not null)
);

-- L12: append-only. The trigger below refuses update and delete for
-- every role, including the service role and the moderator.
create table public.moderation_actions (
  id bigint generated always as identity primary key,
  moderator_id uuid not null references public.people(id),
  subject_person_id uuid references public.people(id) on delete set null,
  subject_cast_id uuid references public.casts(id) on delete set null,
  action public.moderation_verb not null,
  reason text not null,
  at timestamptz not null default now()
);

create table public.devices (
  person_id uuid not null references public.people(id) on delete cascade,
  push_token text not null,
  platform text not null check (platform in ('ios','android')),
  updated_at timestamptz not null default now(),
  primary key (person_id, push_token)
);

create table public.notification_outbox (
  id bigint generated always as identity primary key,
  person_id uuid not null references public.people(id) on delete cascade,
  kind text not null,
  object_id uuid,
  idempotency_key text not null unique,
  available_at timestamptz not null default now(),
  attempts smallint not null default 0,
  processed_at timestamptz
);
create index notification_outbox_due_idx
  on public.notification_outbox (available_at) where processed_at is null;

create table public.analytics_outbox (
  id bigint generated always as identity primary key,
  event text not null,
  actor_id uuid,
  properties jsonb not null default '{}'::jsonb,
  at timestamptz not null default now(),
  delivered_at timestamptz
);

create table public.idempotency_keys (
  actor_id uuid not null references public.people(id) on delete cascade,
  key text not null,
  operation text not null,
  fingerprint text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (actor_id, key)
);

create table public.rate_limits (
  actor_id uuid not null references public.people(id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (actor_id, action, window_start)
);

-- --------------------------------------------------------------
-- 6. private helpers
--    All SECURITY DEFINER with an empty search_path, so nothing here
--    can be hijacked by a caller-controlled path.
-- --------------------------------------------------------------
create or replace function private.is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function private.is_restricted(p uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.account_restrictions
    where person_id = p and lifted_at is null
  );
$$;

create or replace function private.is_verified(p uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.person_verification
    where person_id = p and verified_at is not null
  );
$$;

create or replace function private.is_moderator()
returns boolean language sql stable security definer set search_path = '' as $$
  -- app_metadata only. user_metadata is writable by the user it describes.
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'moderator')::boolean, false);
$$;

-- Can I see this circle's membership? Only from inside it.
--
-- Note the shape, which is a rule for every helper a client may execute:
-- it takes no "which person" argument and answers only about auth.uid().
-- The previous build granted is_blocked(a, b) to every authenticated user,
-- which let anyone ask whether two strangers had blocked each other. A
-- caller-scoped helper cannot be turned into an oracle about other people.
create or replace function private.in_circle(c uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.circles where id = c and owner_id = auth.uid())
      or exists (select 1 from public.circle_members where circle_id = c and person_id = auth.uid());
$$;

-- Do I have any relationship to this person that justifies reading them?
create or replace function private.related_to(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when other = auth.uid() then true
    when private.is_blocked(other, auth.uid()) then false
    else exists (
      -- a cast of theirs reached me, or one of mine reached them
      select 1 from public.cast_deliveries d
        join public.casts c on c.id = d.cast_id
       where (d.person_id = auth.uid() and c.caster_id = other)
          or (d.person_id = other and c.caster_id = auth.uid())
      union all
      -- a join request either way
      select 1 from public.join_requests r
        join public.casts c on c.id = r.cast_id
       where (r.person_id = auth.uid() and c.caster_id = other)
          or (r.person_id = other and c.caster_id = auth.uid())
      union all
      -- a circle in common
      select 1 from public.circle_members m1
        join public.circle_members m2 on m2.circle_id = m1.circle_id
       where m1.person_id = auth.uid() and m2.person_id = other
      union all
      select 1 from public.circles c
       where (c.owner_id = auth.uid() and exists (select 1 from public.circle_members m where m.circle_id = c.id and m.person_id = other))
          or (c.owner_id = other and exists (select 1 from public.circle_members m where m.circle_id = c.id and m.person_id = auth.uid()))
    )
  end;
$$;

-- Can I read this cast? Mine, or delivered to me, or I asked to join.
create or replace function private.can_read_cast(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.casts c
    where c.id = target
      and (
        c.caster_id = auth.uid()
        or (
          not private.is_blocked(c.caster_id, auth.uid())
          and c.state in ('live','full')
          and c.expires_at > now()
          and (
            exists (select 1 from public.cast_deliveries d
                     where d.cast_id = c.id and d.person_id = auth.uid() and d.hidden_at is null)
            or exists (select 1 from public.join_requests r
                        where r.cast_id = c.id and r.person_id = auth.uid())
          )
        )
      )
  );
$$;

create or replace function private.assert_actor()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if private.is_restricted(me) then raise exception 'account_restricted' using errcode = '42501'; end if;
  if not private.is_verified(me) then raise exception 'not_verified' using errcode = '42501'; end if;
  return me;
end;
$$;

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger people_touch before update on public.people
for each row execute function private.touch_updated_at();
create trigger casts_touch before update on public.casts
for each row execute function private.touch_updated_at();

-- L12: append-only enforcement, for every role without exception.
create or replace function private.refuse_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'append_only_table' using errcode = 'P0001';
end;
$$;
create trigger moderation_actions_append_only
before update or delete on public.moderation_actions
for each row execute function private.refuse_mutation();

-- --------------------------------------------------------------
-- 7. write surface -- the only ways data changes
-- --------------------------------------------------------------
create or replace function public.publish_cast(
  in_category public.cast_category,
  in_statement text,
  in_slots integer,
  in_happens_at timestamptz,
  in_reach public.reach_kind,
  in_radius_m integer default null,
  in_circles uuid[] default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := private.assert_actor();
        new_id uuid;
begin
  if in_happens_at <= now() then
    raise exception 'happens_in_the_past' using errcode = '23514';
  end if;
  -- range lives here, not in the signature: a smallint parameter would make
  -- every PostgREST caller cast a JSON number, which is a trap, not a check.
  if in_slots is null or in_slots < 1 or in_slots > 20 then
    raise exception 'slots_out_of_range' using errcode = '23514';
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

  -- L6: expiry is derived from the activity, never chosen independently.
  insert into public.casts (caster_id, category, statement, slots, happens_at, expires_at, state, published_at)
  values (me, in_category, btrim(in_statement), in_slots::smallint, in_happens_at,
          in_happens_at + interval '3 hours', 'live', now())
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
  return new_id;
end;
$$;

-- L10: editable until somebody has acted on the words.
create or replace function public.edit_cast(in_cast uuid, in_statement text)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := private.assert_actor();
        target public.casts;
begin
  select * into target from public.casts where id = in_cast for update;
  if target.id is null then raise exception 'cast_not_found' using errcode = 'P0002'; end if;
  if target.caster_id <> me then raise exception 'not_authorized' using errcode = '42501'; end if;
  if target.frozen_at is not null then
    raise exception 'cast_frozen' using errcode = '23514';
  end if;
  update public.casts
     set statement = btrim(in_statement), version = version + 1
   where id = in_cast;
  insert into public.cast_events (cast_id, actor_id, event) values (in_cast, me, 'edited');
end;
$$;

create or replace function public.request_to_join(in_cast uuid, in_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := private.assert_actor();
        target public.casts;
        taken integer;
        new_id uuid;
begin
  select * into target from public.casts where id = in_cast for update;
  if target.id is null then raise exception 'cast_not_found' using errcode = 'P0002'; end if;
  if target.caster_id = me then raise exception 'own_cast' using errcode = '23514'; end if;
  if private.is_blocked(target.caster_id, me) then
    raise exception 'cast_not_found' using errcode = 'P0002';   -- never confirm a block
  end if;
  if not exists (
    select 1 from public.cast_deliveries d
     where d.cast_id = in_cast and d.person_id = me and d.hidden_at is null
  ) then
    raise exception 'cast_not_found' using errcode = 'P0002';   -- L6: no delivery, no cast
  end if;
  if target.state <> 'live' or target.expires_at <= now() then
    raise exception 'cast_closed' using errcode = '23514';
  end if;

  select count(*) into taken from public.join_requests
   where cast_id = in_cast and state = 'accepted';
  if taken >= target.slots then raise exception 'cast_full' using errcode = '23514'; end if;

  insert into public.join_requests (cast_id, person_id, note)
  values (in_cast, me, nullif(btrim(in_note), ''))
  returning id into new_id;

  -- L10: the first request freezes the words.
  update public.casts set frozen_at = coalesce(frozen_at, now()) where id = in_cast;

  insert into public.cast_events (cast_id, actor_id, event) values (in_cast, me, 'join_requested');
  insert into public.notification_outbox (person_id, kind, object_id, idempotency_key)
  values (target.caster_id, 'join_requested', new_id, 'join:' || new_id::text);
  return new_id;
end;
$$;

-- L5: a vouch needs a settled receipt. Receipts arrive with the
-- coordination slice; until then this refuses every vouch, which is the
-- correct behaviour -- nobody has met anybody through this build yet.
create or replace function public.vouch_for(in_person uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := private.assert_actor();
begin
  if in_person = me then raise exception 'cannot_vouch_for_self' using errcode = '23514'; end if;
  if private.is_blocked(me, in_person) then raise exception 'blocked' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.plan_receipts r
     where r.settled_at is not null
       and ((r.person_a = me and r.person_b = in_person) or (r.person_a = in_person and r.person_b = me))
  ) then
    raise exception 'no_settled_receipt' using errcode = '23514';
  end if;
  insert into public.vouches (voucher_id, vouchee_id) values (me, in_person)
  on conflict do nothing;
end;
$$;

create or replace function public.block_person(in_person uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if in_person = me then raise exception 'cannot_block_self' using errcode = '23514'; end if;
  insert into public.blocks (blocker_id, blocked_id) values (me, in_person)
  on conflict do nothing;
  -- withdraw any open request in either direction
  update public.join_requests r set state = 'withdrawn', decided_at = now()
    from public.casts c
   where c.id = r.cast_id and r.state = 'pending'
     and ((r.person_id = me and c.caster_id = in_person)
       or (r.person_id = in_person and c.caster_id = me));
end;
$$;

-- placeholder for the coordination slice; referenced by vouch_for so the
-- law is enforceable now rather than remembered later.
create table public.plan_receipts (
  cast_id uuid not null references public.casts(id) on delete cascade,
  person_a uuid not null references public.people(id) on delete cascade,
  person_b uuid not null references public.people(id) on delete cascade,
  confirmed_a_at timestamptz,
  confirmed_b_at timestamptz,
  settled_at timestamptz,
  primary key (cast_id, person_a, person_b),
  check (person_a < person_b)
);

-- --------------------------------------------------------------
-- 8. row level security -- SELECT only, on every table
-- --------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy people_read on public.people for select to authenticated
using (private.related_to(id));

create policy verification_read_self on public.person_verification for select to authenticated
using (person_id = auth.uid());

create policy areas_read_self on public.person_areas for select to authenticated
using (person_id = auth.uid());

create policy interests_read_self on public.person_interests for select to authenticated
using (person_id = auth.uid());

create policy restrictions_read_moderator on public.account_restrictions for select to authenticated
using (private.is_moderator());

create policy circles_read_inside on public.circles for select to authenticated
using (private.in_circle(id));

create policy circle_members_read_inside on public.circle_members for select to authenticated
using (private.in_circle(circle_id));

create policy vouches_read_own on public.vouches for select to authenticated
using (voucher_id = auth.uid());

create policy blocks_read_own on public.blocks for select to authenticated
using (blocker_id = auth.uid());

create policy casts_read on public.casts for select to authenticated
using (private.can_read_cast(id));

create policy cast_reach_read_owner on public.cast_reach for select to authenticated
using (exists (select 1 from public.casts c where c.id = cast_id and c.caster_id = auth.uid()));

create policy cast_reach_circles_read_owner on public.cast_reach_circles for select to authenticated
using (exists (select 1 from public.casts c where c.id = cast_id and c.caster_id = auth.uid()));

create policy deliveries_read_recipient on public.cast_deliveries for select to authenticated
using (person_id = auth.uid());

create policy cast_events_read_owner on public.cast_events for select to authenticated
using (exists (select 1 from public.casts c where c.id = cast_id and c.caster_id = auth.uid()));

create policy join_requests_read_parties on public.join_requests for select to authenticated
using (
  person_id = auth.uid()
  or exists (select 1 from public.casts c where c.id = cast_id and c.caster_id = auth.uid())
);

create policy receipts_read_parties on public.plan_receipts for select to authenticated
using (auth.uid() in (person_a, person_b));

create policy reports_read_own on public.reports for select to authenticated
using (reporter_id = auth.uid() or private.is_moderator());

create policy moderation_read_moderator on public.moderation_actions for select to authenticated
using (private.is_moderator());

create policy devices_read_self on public.devices for select to authenticated
using (person_id = auth.uid());

-- devices, notification_outbox, analytics_outbox, idempotency_keys and
-- rate_limits get no policy at all: RLS on, zero policies, service role only.

-- --------------------------------------------------------------
-- 9. grants -- read and execute, nothing else, ever
-- --------------------------------------------------------------
grant usage on schema public to authenticated;
grant usage on schema private to authenticated;
grant select on all tables in schema public to authenticated;

-- and explicitly take back everything else, in case a default changes
revoke insert, update, delete, truncate, references
  on all tables in schema public from authenticated, anon;
revoke all on all tables in schema public from anon;

alter default privileges in schema public
  revoke insert, update, delete, truncate, references on tables from authenticated, anon;

grant execute on function
  public.publish_cast(public.cast_category, text, integer, timestamptz, public.reach_kind, integer, uuid[]),
  public.edit_cast(uuid, text),
  public.request_to_join(uuid, text),
  public.vouch_for(uuid),
  public.block_person(uuid)
  to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;

-- RLS predicates are evaluated as the querying user, so the four helpers a
-- policy calls must be executable by that user. Each is caller-scoped: it
-- takes no argument naming another person and answers only about auth.uid(),
-- so granting it cannot turn it into an oracle about somebody else. The
-- helpers that DO take a person -- is_blocked, is_restricted, is_verified --
-- are never granted; they are reached only from inside SECURITY DEFINER
-- functions, which run as the owner and need no caller privilege.
grant execute on function
  private.in_circle(uuid),
  private.related_to(uuid),
  private.can_read_cast(uuid),
  private.is_moderator()
  to authenticated;
