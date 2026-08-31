-- Bring the schema in line with the shipped product.
--
-- The foundation migration was written against an earlier model. Four
-- things have changed in the app since, and the schema has to follow
-- or the client cannot be wired to it:
--
--   1. VERBS BECAME CATEGORIES. `intent_primitive` (request/offer/plan)
--      and `response_action` were the verb era. A cast now carries
--      exactly one category, which is also what delivery matches on.
--
--   2. ONE MATCH BECAME SLOTS. `matches` had unique(intent_id), so an
--      intent could pair with exactly one person. A cast now says how
--      many joiners it wants and fills slots until it is full.
--
--   3. ATTENDANCE IS REAL. Receipts and flakes were a single
--      completed/disputed boolean. The shipped rules are richer:
--      withdrawn before cutoff, receipt on mutual confirm, flake only
--      on unanimous absence after the window, ties to no-penalty,
--      silence never creating a fact.
--
--   4. THE TRUST GRAPH IS REAL. Circles, membership and vouching had
--      no tables at all. They are the raw material every delivery
--      decision runs on, so they cannot stay client-side. Vouching
--      depends on attendance, which is why it comes after it here.
--
-- And one thing was REMOVED from the product: the exact meeting spot.
-- Coordination happens in chat, in messages people write themselves,
-- so the tables that existed only to hold and release a private
-- address are dropped rather than left as an attractive nuisance.

-- ---------------------------------------------------------------
-- 1. categories replace primitives
-- ---------------------------------------------------------------

create type public.cast_category as enum (
  'social', 'sports', 'food', 'music', 'travel',
  'games', 'arts', 'learning', 'networking', 'help'
);

alter table public.intents
  add column category public.cast_category;

-- backfill anything already in flight, then make it required. the old
-- primitive carries no category information, so everything lands in
-- 'social' — this is a pre-launch schema with no real rows.
update public.intents set category = 'social' where category is null;

-- get_public_intent projects the columns we are about to drop, and its
-- return type changes, so it cannot be replaced in place.
drop function public.get_public_intent(uuid);

alter table public.intents
  alter column category set not null,
  drop column primitive,
  drop column response_action;

drop type public.intent_primitive;

-- ---------------------------------------------------------------
-- 2. slots: many joiners per cast
-- ---------------------------------------------------------------

alter table public.intents
  add column slots_wanted smallint not null default 2
    check (slots_wanted between 1 and 20);

-- a cast may now have several matches. the response is still
-- one-to-one with its match — one ask produces at most one seat.
alter table public.matches
  drop constraint matches_intent_id_key;

create index matches_intent_idx on public.matches (intent_id);

-- a person cannot hold two seats on the same cast.
create unique index matches_intent_participant_idx
  on public.matches (intent_id, participant_id);

-- withdrawal, so attendance can tell a notified cancel from a no-show
alter table public.matches
  add column cancelled_at timestamptz;

alter table public.intent_context
  add column cancel_cutoff_hours smallint not null default 2
    check (cancel_cutoff_hours between 0 and 48);

/**
 * Slots are a hard invariant, not a UI convenience: accepting past
 * the limit would put someone in a plan the caster never agreed to
 * make room for. Enforced in the database so no client path — or
 * future edge function — can route around it.
 */
create or replace function private.enforce_slot_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  wanted smallint;
  taken integer;
begin
  select slots_wanted into wanted from public.intents where id = new.intent_id;
  select count(*) into taken
  from public.matches
  where intent_id = new.intent_id and closed_at is null;

  if taken >= wanted then
    raise exception 'cast_is_full' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger matches_enforce_slot_limit
before insert on public.matches
for each row execute function private.enforce_slot_limit();

-- ---------------------------------------------------------------
-- 3. attendance: receipts and flakes as facts, not ratings
-- ---------------------------------------------------------------

create type public.presence_report as enum ('showed', 'no_show');

create type public.attendance_result as enum (
  'receipt', 'flake', 'withdrawn', 'disputed', 'unverified'
);

/**
 * One row per (plan, reporter, subject). Reporters stay opaque to the
 * person reported on: no policy ever lets a subject read the rows
 * about themselves, because "who called me a no-show" turns an
 * attendance record into a grudge.
 */
create table public.presence_reports (
  intent_id uuid not null references public.intents(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.profiles(id) on delete cascade,
  report public.presence_report not null,
  created_at timestamptz not null default now(),
  primary key (intent_id, reporter_id, subject_id),
  check (reporter_id <> subject_id)
);

create index presence_reports_subject_idx on public.presence_reports (intent_id, subject_id);

/**
 * The attendance rules, restated in SQL. This mirrors
 * src/features/casts/domain/attendance.ts exactly — the client
 * computes it for immediate feedback, the database is the authority.
 *
 *   cancel before cutoff               -> withdrawn (never a flake)
 *   unanimous 'showed'                 -> receipt
 *   unanimous 'no_show', window closed -> flake
 *   conflicting reports                -> disputed (ties go to no-penalty)
 *   nobody reported                    -> unverified (silence is never a fact)
 */
create or replace function public.attendance_outcome(
  target_intent uuid,
  target_profile uuid,
  as_of timestamptz default now()
)
returns public.attendance_result
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  starts timestamptz;
  cutoff_hours smallint;
  cancelled timestamptz;
  showed_count integer;
  no_show_count integer;
  window_closed boolean;
begin
  select c.starts_at, c.cancel_cutoff_hours
    into starts, cutoff_hours
  from public.intent_context c
  where c.intent_id = target_intent;

  if starts is null then
    return 'unverified';
  end if;

  select m.cancelled_at into cancelled
  from public.matches m
  where m.intent_id = target_intent and m.participant_id = target_profile;

  -- backing out with notice is allowed behaviour, not a penalty
  if cancelled is not null
     and cancelled <= starts - make_interval(hours => cutoff_hours) then
    return 'withdrawn';
  end if;

  select
    count(*) filter (where r.report = 'showed'),
    count(*) filter (where r.report = 'no_show')
    into showed_count, no_show_count
  from public.presence_reports r
  where r.intent_id = target_intent and r.subject_id = target_profile;

  if showed_count + no_show_count = 0 then
    return 'unverified';
  end if;

  if showed_count > 0 and no_show_count > 0 then
    return 'disputed';
  end if;

  window_closed := as_of > starts + interval '24 hours';

  if no_show_count > 0 then
    return case when window_closed then 'flake' else 'unverified' end;
  end if;

  return 'receipt';
end;
$$;

-- interaction_outcomes was the thin earlier version of all of this
drop table public.interaction_outcomes;

-- ---------------------------------------------------------------
-- 4. circles and vouching — the trust graph
-- ---------------------------------------------------------------

/**
 * A circle is a named group of people ONE person owns and curates.
 * There is no shared ownership: the owner is the only reader of the
 * membership list, and members are never told which circle they are
 * in, or that they were added at all.
 */
create table public.circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create index circles_owner_idx on public.circles (owner_id);

create table public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (circle_id, member_id)
);

create index circle_members_member_idx on public.circle_members (member_id);

/**
 * Vouching requires evidence you actually know the person: at least
 * one plan you were both in that resolved to a receipt for both of
 * you. Without this a caster sheet is a follow button, and the trust
 * graph stops meaning anything.
 *
 * Checked here as well as in the client because it is the single
 * assumption every delivery decision rests on.
 */
create or replace function private.has_receipt_with(left_profile uuid, right_profile uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  with shared as (
    -- plans where both people took part, whether as caster or joiner
    select i.id as intent_id
    from public.intents i
    where (
        i.broadcaster_id = left_profile
        or exists (select 1 from public.matches m
                   where m.intent_id = i.id and m.participant_id = left_profile)
      )
      and (
        i.broadcaster_id = right_profile
        or exists (select 1 from public.matches m
                   where m.intent_id = i.id and m.participant_id = right_profile)
      )
  )
  select exists (
    select 1 from shared
    where public.attendance_outcome(shared.intent_id, left_profile) = 'receipt'
      and public.attendance_outcome(shared.intent_id, right_profile) = 'receipt'
  );
$$;

-- ---------------------------------------------------------------
-- 5. chat windows
-- ---------------------------------------------------------------

create type public.conversation_mode as enum ('day', 'week', 'always', 'ended');

alter table public.conversations
  add column mode public.conversation_mode not null default 'day',
  add column expires_at timestamptz;

-- an ended conversation is read-only and never reopens
alter table public.conversations
  add constraint conversations_ended_has_closed_at
  check ((mode = 'ended') = (closed_at is not null));

-- ---------------------------------------------------------------
-- 6. remove the exact meeting spot
-- ---------------------------------------------------------------
--
-- These existed only to hold a private address and stage its release.
-- The product no longer has that concept: a cast shows the area, and
-- coordination happens in chat. Keeping the columns would leave a
-- place for exact locations to accumulate with nothing reading them.

drop table public.match_disclosures;
drop table public.intent_private;

-- ---------------------------------------------------------------
-- 7. accepting a join, with slots
-- ---------------------------------------------------------------
--
-- The earlier version flipped the intent to 'matched' on the first
-- acceptance, which was correct when a cast had exactly one seat. Now
-- a cast stays LIVE while seats remain and only becomes 'matched'
-- once it is full — otherwise accepting one person would take the
-- cast out of everyone else's feed.

-- the parameter keeps its original name so this is a true replacement
-- rather than a second overload sitting beside the old one.
create or replace function public.accept_response(
  response_to_accept uuid,
  expected_intent_status public.intent_status
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_response public.responses;
  selected_intent public.intents;
  accepted_match public.matches;
  seats_taken integer;
begin
  select * into selected_response
  from public.responses
  where id = response_to_accept
  for update;

  if selected_response.id is null then
    raise exception 'response_not_found' using errcode = 'P0002';
  end if;

  select * into selected_intent
  from public.intents
  where id = selected_response.intent_id
  for update;

  if selected_intent.broadcaster_id <> auth.uid() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  -- idempotent: accepting twice returns the seat already given
  select * into accepted_match
  from public.matches
  where response_id = selected_response.id;

  if accepted_match.id is not null then
    return accepted_match;
  end if;

  if selected_intent.status <> expected_intent_status or selected_intent.status <> 'live' then
    raise exception 'stale_intent_state' using errcode = '40001';
  end if;

  if selected_response.status <> 'pending' then
    raise exception 'response_not_pending' using errcode = '23514';
  end if;

  if private.is_blocked(selected_intent.broadcaster_id, selected_response.respondent_id) then
    raise exception 'blocked_relationship' using errcode = '42501';
  end if;

  -- the trigger enforces the ceiling too; checking here produces a
  -- named error the client can act on instead of a raw trigger fault.
  select count(*) into seats_taken
  from public.matches
  where intent_id = selected_intent.id and closed_at is null;

  if seats_taken >= selected_intent.slots_wanted then
    raise exception 'cast_is_full' using errcode = '23514';
  end if;

  insert into public.matches (
    intent_id, response_id, broadcaster_id, participant_id
  ) values (
    selected_intent.id, selected_response.id, selected_intent.broadcaster_id, selected_response.respondent_id
  ) returning * into accepted_match;

  update public.responses set status = 'accepted'
  where id = selected_response.id;

  -- only the seat that fills the cast closes it
  if seats_taken + 1 >= selected_intent.slots_wanted then
    update public.intents set status = 'matched', version = version + 1
    where id = selected_intent.id;
  end if;

  insert into public.conversations (match_id) values (accepted_match.id);
  insert into public.intent_events (
    intent_id, actor_id, event_type, from_status, to_status, metadata
  ) values (
    selected_intent.id, auth.uid(), 'response_accepted', 'live',
    case when seats_taken + 1 >= selected_intent.slots_wanted then 'matched'::public.intent_status else 'live'::public.intent_status end,
    jsonb_build_object('seats_taken', seats_taken + 1, 'slots_wanted', selected_intent.slots_wanted)
  );

  return accepted_match;
end;
$$;

-- ---------------------------------------------------------------
-- 8. the public share projection, without the verb-era columns
-- ---------------------------------------------------------------

create or replace function public.get_public_intent(requested_share_slug uuid)
returns table (
  id uuid,
  share_slug uuid,
  category public.cast_category,
  statement text,
  slots_wanted smallint,
  seats_taken bigint,
  expires_at timestamptz,
  published_at timestamptz,
  starts_at timestamptz,
  deadline_at timestamptz,
  quantity numeric,
  price_minor bigint,
  currency char(3),
  approximate_place text,
  broadcaster_first_name text,
  confirmation_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.id,
    i.share_slug,
    i.category,
    i.statement,
    i.slots_wanted,
    (select count(*) from public.matches m where m.intent_id = i.id and m.closed_at is null),
    i.expires_at,
    i.published_at,
    c.starts_at,
    c.deadline_at,
    c.quantity,
    c.price_minor,
    c.currency,
    c.approximate_place,
    case when r.show_broadcaster_first_name then split_part(p.display_name, ' ', 1) else null end,
    (select count(*) from public.intent_confirmations ic where ic.intent_id = i.id)
  from public.intents i
  join public.intent_context c on c.intent_id = i.id
  join public.intent_reach r on r.intent_id = i.id
  join public.profiles p on p.id = i.broadcaster_id
  where i.share_slug = requested_share_slug
    and i.status in ('live', 'matched')
    and i.expires_at > now()
    and r.public_link_enabled;
$$;

-- ---------------------------------------------------------------
-- 9. row level security on everything new
-- ---------------------------------------------------------------

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.presence_reports enable row level security;

-- circles: the owner is the ONLY reader. membership is never visible
-- to a member, and never to anyone else.
create policy circles_owner_all on public.circles for all to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy circle_members_owner_read on public.circle_members for select to authenticated
using (exists (select 1 from public.circles c where c.id = circle_id and c.owner_id = auth.uid()));

/**
 * Adding someone to a circle is vouching for them, and vouching needs
 * a shared receipt. The policy enforces it, so a raw client insert
 * cannot manufacture trust.
 */
create policy circle_members_owner_insert on public.circle_members for insert to authenticated
with check (
  exists (select 1 from public.circles c where c.id = circle_id and c.owner_id = auth.uid())
  and member_id <> auth.uid()
  and not private.is_blocked(member_id, auth.uid())
  and private.has_receipt_with(auth.uid(), member_id)
);

create policy circle_members_owner_delete on public.circle_members for delete to authenticated
using (exists (select 1 from public.circles c where c.id = circle_id and c.owner_id = auth.uid()));

/**
 * Presence reports: you may read and write only your OWN reports.
 * Critically there is no policy letting a subject read rows about
 * themselves — the outcome is available through
 * public.attendance_outcome(), the individual reporters never are.
 */
create policy presence_reports_reporter_read on public.presence_reports for select to authenticated
using (reporter_id = auth.uid());

create policy presence_reports_reporter_insert on public.presence_reports for insert to authenticated
with check (
  reporter_id = auth.uid()
  -- you can only report on a plan you were actually in
  and (
    exists (select 1 from public.matches m where m.intent_id = presence_reports.intent_id and m.participant_id = auth.uid())
    or exists (select 1 from public.intents i where i.id = presence_reports.intent_id and i.broadcaster_id = auth.uid())
  )
  -- and only about someone who was also in it
  and (
    exists (select 1 from public.matches m where m.intent_id = presence_reports.intent_id and m.participant_id = presence_reports.subject_id)
    or exists (select 1 from public.intents i where i.id = presence_reports.intent_id and i.broadcaster_id = presence_reports.subject_id)
  )
);

create policy presence_reports_reporter_update on public.presence_reports for update to authenticated
using (reporter_id = auth.uid()) with check (reporter_id = auth.uid());

-- ---------------------------------------------------------------
-- 10. grants
-- ---------------------------------------------------------------

grant select, insert, update, delete on public.circles, public.circle_members,
  public.presence_reports to authenticated;

revoke execute on function public.attendance_outcome(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.attendance_outcome(uuid, uuid, timestamptz) to authenticated;
revoke execute on function private.has_receipt_with(uuid, uuid) from public, anon;
grant execute on function private.has_receipt_with(uuid, uuid) to authenticated;
revoke execute on function private.enforce_slot_limit() from public, anon, authenticated;
grant execute on function public.get_public_intent(uuid) to anon, authenticated;
