-- TrueGoing foundation (P0 subset of docs/truegoing/05).
-- Plans are discoverable; people are not. No table stores a user's location.
-- Clients write only drafts and their own settings; every other change is an RPC
-- added in later tasks (docs/truegoing/07).

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Enums (all of 05 §3, so later migrations only add tables)
-- ---------------------------------------------------------------------------
create type public.plan_type as enum ('plan', 'ask', 'offer');
create type public.plan_status as enum ('draft', 'live', 'full', 'started', 'ended', 'cancelled', 'restricted');
create type public.reach_level as enum ('friends', 'friends_of_friends', 'nearby', 'city');
create type public.member_status as enum ('going', 'left', 'removed');
create type public.request_status as enum ('pending', 'accepted', 'declined', 'withdrawn');
create type public.delivery_reason as enum (
  'friend_going', 'friend_vouched', 'friend_hosting', 'friends_of_friends',
  'nearby_interest', 'nearby', 'heading_to', 'venue_nearby', 'widened');
create type public.spot_visibility as enum ('on_unlock', 'immediate');
create type public.message_kind as enum ('text', 'photo', 'poll', 'system', 'spot_share');
create type public.notification_type as enum (
  'member_joined', 'request_received', 'request_accepted', 'plan_starting', 'spot_unlocked',
  'plan_nearby', 'vouch_received', 'showed_up_confirmed', 'connection_request',
  'connection_accepted', 'plan_cancelled', 'plan_edited', 'showed_up_prompt');
create type public.connection_status as enum ('pending', 'accepted', 'declined', 'removed');
create type public.report_subject as enum ('plan', 'profile', 'message');
create type public.report_reason as enum ('spam_scam', 'inappropriate', 'safety', 'fake_misleading', 'other');
create type public.report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');
create type public.gender as enum ('woman', 'man', 'non_binary', 'undisclosed');
create type public.verification_status as enum ('none', 'pending', 'verified', 'failed');

-- ---------------------------------------------------------------------------
-- Identity and profile
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  first_name text generated always as (split_part(btrim(display_name), ' ', 1)) stored,
  avatar_path text,
  bio text check (char_length(bio) <= 150),
  area_name text check (char_length(area_name) <= 80),
  city text check (char_length(city) <= 80),
  show_interests boolean not null default true,
  show_past_plans boolean not null default false,
  verified_at timestamptz,
  is_restricted boolean not null default false,
  age_visible_from timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_private (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  birth_date date not null check (birth_date > '1900-01-01'),
  gender public.gender not null default 'undisclosed',
  phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  home_cell text check (home_cell ~ '^[0-9b-hjkmnp-z]{6}$'),
  trusted_contact_name text check (char_length(trusted_contact_name) <= 60),
  trusted_contact_phone text check (trusted_contact_phone ~ '^\+[1-9][0-9]{6,14}$'),
  contact_matching_opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.profile_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  appearance text not null default 'system' check (appearance in ('system', 'light', 'dark')),
  language text not null default 'en-IN' check (char_length(language) between 2 and 10),
  distance_unit text not null default 'km' check (distance_unit in ('km', 'mi')),
  push_enabled boolean not null default true,
  alert_nearby_radius_km int not null default 5 check (alert_nearby_radius_km between 2 and 25),
  alert_friends_plans boolean not null default true,
  alert_asks_nearby boolean not null default true,
  quiet_from time,
  quiet_to time,
  updated_at timestamptz not null default now()
);

create table public.interests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  label text not null check (char_length(label) between 1 and 40),
  emoji text not null check (char_length(emoji) between 1 and 8),
  "group" text not null check (char_length("group") between 1 and 40),
  sort_order int not null default 0
);

create table public.profile_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, interest_id)
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  push_token text not null unique check (char_length(push_token) between 1 and 512),
  last_seen_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

-- One row per pair, a_id < b_id. Empty in P0; fan-out and visibility already use it.
create table public.connections (
  a_id uuid not null references public.profiles(id) on delete cascade,
  b_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('shared_plan', 'mutual_request', 'contacts')),
  created_at timestamptz not null default now(),
  primary key (a_id, b_id),
  check (a_id < b_id)
);
create index connections_b_idx on public.connections (b_id);

-- ---------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  type public.plan_type not null,
  status public.plan_status not null default 'draft',
  text text not null check (char_length(btrim(text)) between 1 and 500),
  emoji text not null check (char_length(emoji) between 1 and 8),
  category_id uuid references public.interests(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  repeat_weekly boolean not null default false,
  series_id uuid,
  capacity int check (capacity between 1 and 200),
  women_only boolean not null default false,
  verified_only boolean not null default false,
  connections_only boolean not null default false,
  reach_level public.reach_level not null default 'nearby',
  reach_widened_at timestamptz,
  area_name text not null check (char_length(btrim(area_name)) between 1 and 80),
  city text not null check (char_length(btrim(city)) between 1 and 80),
  -- Public place: ~300 m grid, set from plan_private.exact_point by trigger.
  snapped_point extensions.geography(point, 4326),
  cell text check (cell ~ '^[0-9b-hjkmnp-z]{6}$'),
  share_slug uuid not null unique default gen_random_uuid(),
  public_link_enabled boolean not null default true,
  version int not null default 1 check (version > 0),
  published_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text check (char_length(cancel_reason) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (not women_only or verified_only),
  check (type = 'plan' or capacity = 1),
  check (status = 'draft' or (snapped_point is not null and cell is not null))
);
create index plans_snapped_point_idx on public.plans using gist (snapped_point);
create index plans_cell_idx on public.plans (cell);
create index plans_status_starts_idx on public.plans (status, starts_at);
create index plans_host_idx on public.plans (host_id);
create index plans_series_idx on public.plans (series_id);

create table public.plan_private (
  plan_id uuid primary key references public.plans(id) on delete cascade,
  exact_point extensions.geography(point, 4326) not null,
  exact_address text check (char_length(exact_address) <= 200),
  spot_visibility public.spot_visibility not null default 'on_unlock',
  spot_shared_at timestamptz,
  spot_shared_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.plan_members (
  plan_id uuid not null references public.plans(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.member_status not null default 'going',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  removed_by uuid references public.profiles(id) on delete set null,
  primary key (plan_id, profile_id)
);
create index plan_members_profile_idx on public.plan_members (profile_id);

create table public.plan_requests (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  note text check (char_length(note) <= 300),
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (plan_id, profile_id)
);
create index plan_requests_profile_idx on public.plan_requests (profile_id);

-- The feed. Every row carries a stored, human-readable reason.
create table public.plan_deliveries (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reason_code public.delivery_reason not null,
  reason_text text not null check (char_length(btrim(reason_text)) between 1 and 120),
  reach_level_at_delivery public.reach_level,
  delivered_at timestamptz not null default now(),
  hidden_at timestamptz,
  not_for_me_at timestamptz,
  unique (plan_id, profile_id)
);
create index plan_deliveries_profile_idx on public.plan_deliveries (profile_id, delivered_at desc);

create table public.plan_events (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (char_length(event_type) between 1 and 60),
  from_status public.plan_status,
  to_status public.plan_status,
  metadata jsonb not null default '{}'::jsonb
    check (not (metadata ?| array['text', 'exact_point', 'exact_address', 'phone', 'body', 'note'])),
  created_at timestamptz not null default now()
);
create index plan_events_plan_idx on public.plan_events (plan_id, created_at);

-- ---------------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null unique references public.plans(id) on delete cascade,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- A private thread per accepted ask/offer request, so requesters never see each other.
create table public.conversation_threads (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  request_id uuid not null unique references public.plan_requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.conversation_members (
  conversation_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  muted boolean not null default false,
  last_read_at timestamptz,
  primary key (conversation_id, profile_id)
);
create index conversation_members_profile_idx on public.conversation_members (profile_id);

-- conversation_id refers to either a plan conversation or a request thread.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  sender_id uuid references public.profiles(id) on delete set null,
  kind public.message_kind not null,
  body text check (char_length(body) <= 2000),
  media_path text,
  poll_id uuid,
  created_at timestamptz not null default now(),
  check (kind <> 'text' or char_length(btrim(body)) >= 1),
  check (kind = 'system' or kind = 'spot_share' or sender_id is not null)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Notifications, moderation, analytics (service role only)
-- ---------------------------------------------------------------------------
create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  payload jsonb not null
    check (jsonb_typeof(payload) = 'object'
           and payload - array['type', 'plan_id', 'chat_id', 'user_id', 'reason_code'] = '{}'::jsonb),
  idempotency_key text not null unique,
  available_at timestamptz not null default now(),
  attempts int not null default 0,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index notification_jobs_pending_idx on public.notification_jobs (available_at) where processed_at is null;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  subject_type public.report_subject not null,
  subject_id uuid not null,
  reason public.report_reason not null,
  note text check (char_length(note) <= 500),
  also_blocked boolean not null default false,
  status public.report_status not null default 'open',
  reviewer_id uuid,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('restrict', 'unrestrict', 'remove_plan', 'warn')),
  report_id uuid references public.reports(id) on delete set null,
  actor_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table public.analytics_outbox (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  event text not null check (event ~ '^[a-z_]+\.[a-z_]+$'),
  properties jsonb not null default '{}'::jsonb
    check (not (properties ?| array['text', 'body', 'exact_point', 'exact_address', 'phone',
                                     'display_name', 'first_name', 'note', 'lat', 'lng'])),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers (private schema; security definer; callable by authenticated only)
-- ---------------------------------------------------------------------------
create function private.reach_rank(level public.reach_level) returns int
language sql immutable set search_path = '' as $$
  select case level
    when 'friends' then 1 when 'friends_of_friends' then 2 when 'nearby' then 3 when 'city' then 4 end
$$;

create function private.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

create function private.are_connected(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.connections where a_id = least(a, b) and b_id = greatest(a, b))
$$;

create function private.is_friend_of_friend(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  with fa as (
    select case when a_id = a then b_id else a_id end as friend
    from public.connections where a_id = a or b_id = a)
  select a <> b and exists (
    select 1 from fa join public.connections c
      on (c.a_id = fa.friend and c.b_id = b) or (c.b_id = fa.friend and c.a_id = b))
$$;

create function private.is_verified_woman(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles pr join public.profile_private pp on pp.profile_id = pr.id
    where pr.id = p and pr.verified_at is not null and pp.gender = 'woman')
$$;

-- Who can read a plan (05 §6.1).
create function private.can_see_plan(p_plan uuid, p_viewer uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.plans pl
    join public.profiles host on host.id = pl.host_id
    left join public.profiles viewer on viewer.id = p_viewer
    left join public.profile_private vp on vp.profile_id = p_viewer
    where pl.id = p_plan
      and p_viewer is not null
      and (
        pl.host_id = p_viewer
        or (
          -- Members keep access while the plan runs and for 24 h after it ends.
          exists (select 1 from public.plan_members m
                  where m.plan_id = pl.id and m.profile_id = p_viewer and m.status = 'going')
          and (pl.status in ('live', 'full', 'started')
               or (pl.status in ('ended', 'cancelled') and pl.ends_at > now() - interval '24 hours'))
          and not private.is_blocked(pl.host_id, p_viewer)
        )
        or (
          pl.status in ('live', 'full', 'started')
          and pl.ends_at > now()
          and not host.is_restricted
          and not private.is_blocked(pl.host_id, p_viewer)
          and (not pl.women_only or private.is_verified_woman(p_viewer))
          and (not pl.verified_only or viewer.verified_at is not null)
          and (not pl.connections_only
               or private.are_connected(pl.host_id, p_viewer)
               or private.is_friend_of_friend(pl.host_id, p_viewer))
          and (
            exists (select 1 from public.plan_deliveries d
                    where d.plan_id = pl.id and d.profile_id = p_viewer and d.hidden_at is null)
            or exists (select 1 from public.plan_requests r
                       where r.plan_id = pl.id and r.profile_id = p_viewer
                         and r.status in ('pending', 'accepted'))
            or private.are_connected(pl.host_id, p_viewer)
            or (private.reach_rank(pl.reach_level) >= 2 and private.is_friend_of_friend(pl.host_id, p_viewer))
            or (pl.reach_level = 'city' and viewer.city is not null and viewer.city = pl.city)
            or (private.reach_rank(pl.reach_level) >= 3 and vp.home_cell is not null
                and extensions.st_dwithin(
                      pl.snapped_point,
                      extensions.st_pointfromgeohash(vp.home_cell)::extensions.geography,
                      25000))
          )
        )
      ))
$$;

-- Profiles are readable only where a real relationship exists (05 §5).
create function private.has_relationship(p_viewer uuid, p_other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_viewer is not null and (
    p_viewer = p_other
    or (
      not private.is_blocked(p_viewer, p_other)
      and (
        exists (select 1 from public.plan_members m1 join public.plan_members m2 on m2.plan_id = m1.plan_id
                where m1.profile_id = p_viewer and m2.profile_id = p_other
                  and m1.status = 'going' and m2.status = 'going')
        or exists (select 1 from public.plans p join public.plan_members m on m.plan_id = p.id
                   where m.status = 'going'
                     and ((p.host_id = p_viewer and m.profile_id = p_other)
                       or (p.host_id = p_other and m.profile_id = p_viewer)))
        or exists (select 1 from public.plans p join public.plan_requests r on r.plan_id = p.id
                   where (p.host_id = p_viewer and r.profile_id = p_other)
                      or (p.host_id = p_other and r.profile_id = p_viewer))
        or exists (select 1 from public.conversation_members c1
                   join public.conversation_members c2 on c2.conversation_id = c1.conversation_id
                   where c1.profile_id = p_viewer and c2.profile_id = p_other
                     and c1.left_at is null and c2.left_at is null)
        or private.are_connected(p_viewer, p_other)
        or exists (select 1 from public.plans p
                   where p.host_id = p_other and private.can_see_plan(p.id, p_viewer))
      )
    ))
$$;

create function private.is_conversation_member(p_conversation uuid, p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_members
                 where conversation_id = p_conversation and profile_id = p_profile and left_at is null)
$$;

create function private.is_plan_host(p_plan uuid, p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.plans where id = p_plan and host_id = p_profile)
$$;

create function private.is_plan_draft_of(p_plan uuid, p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.plans where id = p_plan and host_id = p_profile and status = 'draft')
$$;

create function private.is_plan_member(p_plan uuid, p_profile uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.plan_members
                 where plan_id = p_plan and profile_id = p_profile and status = 'going')
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger profile_private_updated_at before update on public.profile_private
  for each row execute function private.set_updated_at();
create trigger profile_settings_updated_at before update on public.profile_settings
  for each row execute function private.set_updated_at();
create trigger plans_updated_at before update on public.plans
  for each row execute function private.set_updated_at();
create trigger plan_private_updated_at before update on public.plan_private
  for each row execute function private.set_updated_at();

-- Reach only widens (05 P4).
create function private.enforce_reach_monotonic() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.reach_rank(new.reach_level) < private.reach_rank(old.reach_level) then
    raise exception 'cannot_narrow' using errcode = 'P0001';
  end if;
  if new.reach_level <> old.reach_level then
    new.reach_widened_at = now();
  end if;
  return new;
end;
$$;
create trigger plans_reach_monotonic before update of reach_level on public.plans
  for each row execute function private.enforce_reach_monotonic();

-- Women-only plans may be set only by verified women (locked decision, 2026-09-23).
create function private.enforce_women_only_host() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.women_only and not private.is_verified_woman(new.host_id) then
    raise exception 'women_only_not_allowed' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger plans_women_only_host before insert or update of women_only, host_id on public.plans
  for each row execute function private.enforce_women_only_host();

-- The public place is derived from the exact spot: ~300 m grid + geohash-6 (05 §6.6).
create function private.snap_plan_place() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  snapped extensions.geography;
begin
  snapped := extensions.st_snaptogrid(new.exact_point::extensions.geometry, 0.0027)::extensions.geography;
  update public.plans
     set snapped_point = snapped,
         cell = extensions.st_geohash(snapped::extensions.geometry, 6)
   where id = new.plan_id;
  return new;
end;
$$;
create trigger plan_private_snap after insert or update of exact_point on public.plan_private
  for each row execute function private.snap_plan_place();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.profile_settings enable row level security;
alter table public.interests enable row level security;
alter table public.profile_interests enable row level security;
alter table public.devices enable row level security;
alter table public.blocks enable row level security;
alter table public.connections enable row level security;
alter table public.plans enable row level security;
alter table public.plan_private enable row level security;
alter table public.plan_members enable row level security;
alter table public.plan_requests enable row level security;
alter table public.plan_deliveries enable row level security;
alter table public.plan_events enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_threads enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.analytics_outbox enable row level security;

create policy profiles_read on public.profiles for select to authenticated
  using (private.has_relationship((select auth.uid()), id));
create policy profiles_insert_self on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy profile_private_self_read on public.profile_private for select to authenticated
  using (profile_id = (select auth.uid()));
create policy profile_private_self_update on public.profile_private for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy profile_settings_self on public.profile_settings for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy interests_read on public.interests for select to authenticated using (true);

create policy profile_interests_read on public.profile_interests for select to authenticated
  using (profile_id = (select auth.uid())
         or (private.has_relationship((select auth.uid()), profile_id)
             and exists (select 1 from public.profiles p where p.id = profile_id and p.show_interests)));
create policy profile_interests_insert_self on public.profile_interests for insert to authenticated
  with check (profile_id = (select auth.uid()));
create policy profile_interests_delete_self on public.profile_interests for delete to authenticated
  using (profile_id = (select auth.uid()));

create policy devices_self on public.devices for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy blocks_read_blocker on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy blocks_insert_blocker on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy blocks_delete_blocker on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

create policy connections_read_party on public.connections for select to authenticated
  using ((select auth.uid()) in (a_id, b_id));

create policy plans_read on public.plans for select to authenticated
  using (host_id = (select auth.uid()) or private.can_see_plan(id, (select auth.uid())));
create policy plans_insert_draft on public.plans for insert to authenticated
  with check (host_id = (select auth.uid()) and status = 'draft');
create policy plans_update_draft on public.plans for update to authenticated
  using (host_id = (select auth.uid()) and status = 'draft')
  with check (host_id = (select auth.uid()) and status = 'draft');
create policy plans_delete_draft on public.plans for delete to authenticated
  using (host_id = (select auth.uid()) and status = 'draft');

create policy plan_private_host_read on public.plan_private for select to authenticated
  using (private.is_plan_host(plan_id, (select auth.uid())));
create policy plan_private_host_insert on public.plan_private for insert to authenticated
  with check (private.is_plan_draft_of(plan_id, (select auth.uid())));
create policy plan_private_host_update on public.plan_private for update to authenticated
  using (private.is_plan_draft_of(plan_id, (select auth.uid())))
  with check (private.is_plan_draft_of(plan_id, (select auth.uid())));

create policy plan_members_read on public.plan_members for select to authenticated
  using (private.is_plan_host(plan_id, (select auth.uid()))
         or private.is_plan_member(plan_id, (select auth.uid())));

create policy plan_requests_read on public.plan_requests for select to authenticated
  using (profile_id = (select auth.uid()) or private.is_plan_host(plan_id, (select auth.uid())));

create policy plan_deliveries_read on public.plan_deliveries for select to authenticated
  using (profile_id = (select auth.uid()) or private.is_plan_host(plan_id, (select auth.uid())));

create policy plan_events_host_read on public.plan_events for select to authenticated
  using (private.is_plan_host(plan_id, (select auth.uid())));

create policy conversations_member_read on public.conversations for select to authenticated
  using (private.is_conversation_member(id, (select auth.uid())));
create policy conversation_threads_member_read on public.conversation_threads for select to authenticated
  using (private.is_conversation_member(id, (select auth.uid())));

create policy conversation_members_read on public.conversation_members for select to authenticated
  using (private.is_conversation_member(conversation_id, (select auth.uid())));
create policy conversation_members_update_self on public.conversation_members for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy messages_member_read on public.messages for select to authenticated
  using (private.is_conversation_member(conversation_id, (select auth.uid())));
create policy messages_member_insert on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and kind in ('text', 'photo')
    and private.is_conversation_member(conversation_id, (select auth.uid()))
    and not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_restricted)
    and not exists (select 1 from public.conversations c where c.id = conversation_id and c.closed_at is not null)
    and not exists (select 1 from public.conversation_threads t where t.id = conversation_id and t.closed_at is not null)
  );

create policy reports_insert_self on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy reports_read_self on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Grants. Supabase grants ALL on new public tables by default, so revoke first
-- and grant exactly what the RLS matrix allows (05 §5). Column lists pin what
-- clients may write; everything else is RPC-only.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.profiles to authenticated;
grant insert (id, display_name, avatar_path, bio, area_name, city, show_interests, show_past_plans)
  on public.profiles to authenticated;
grant update (display_name, avatar_path, bio, area_name, city, show_interests, show_past_plans)
  on public.profiles to authenticated;

grant select on public.profile_private to authenticated;
grant update (gender, phone_e164, trusted_contact_name, trusted_contact_phone, contact_matching_opt_in)
  on public.profile_private to authenticated;

grant select on public.profile_settings to authenticated;
grant insert (profile_id, appearance, language, distance_unit, push_enabled, alert_nearby_radius_km,
              alert_friends_plans, alert_asks_nearby, quiet_from, quiet_to)
  on public.profile_settings to authenticated;
grant update (appearance, language, distance_unit, push_enabled, alert_nearby_radius_km,
              alert_friends_plans, alert_asks_nearby, quiet_from, quiet_to)
  on public.profile_settings to authenticated;

grant select on public.interests to authenticated;
grant select, insert, delete on public.profile_interests to authenticated;

grant select, delete on public.devices to authenticated;
grant insert (profile_id, platform, push_token) on public.devices to authenticated;
grant update (platform, push_token, last_seen_at) on public.devices to authenticated;

grant select, insert, delete on public.blocks to authenticated;
grant select on public.connections to authenticated;

grant select, delete on public.plans to authenticated;
grant insert (host_id, type, text, emoji, category_id, starts_at, ends_at, repeat_weekly, capacity,
              women_only, verified_only, connections_only, area_name, city, public_link_enabled)
  on public.plans to authenticated;
grant update (type, text, emoji, category_id, starts_at, ends_at, repeat_weekly, capacity,
              women_only, verified_only, connections_only, area_name, city, public_link_enabled)
  on public.plans to authenticated;

grant select on public.plan_private to authenticated;
grant insert (plan_id, exact_point, exact_address, spot_visibility) on public.plan_private to authenticated;
grant update (exact_point, exact_address, spot_visibility) on public.plan_private to authenticated;

grant select on public.plan_members, public.plan_requests, public.plan_deliveries, public.plan_events
  to authenticated;
grant select on public.conversations, public.conversation_threads, public.conversation_members
  to authenticated;
grant update (muted, last_read_at) on public.conversation_members to authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, kind, body, media_path) on public.messages to authenticated;
grant select on public.reports to authenticated;
grant insert (reporter_id, subject_type, subject_id, reason, note, also_blocked) on public.reports to authenticated;

-- notification_jobs, moderation_actions, analytics_outbox: no client grants (service role only).

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public, anon;
grant execute on function
  private.reach_rank(public.reach_level),
  private.is_blocked(uuid, uuid),
  private.are_connected(uuid, uuid),
  private.is_friend_of_friend(uuid, uuid),
  private.is_verified_woman(uuid),
  private.can_see_plan(uuid, uuid),
  private.has_relationship(uuid, uuid),
  private.is_conversation_member(uuid, uuid),
  private.is_plan_host(uuid, uuid),
  private.is_plan_draft_of(uuid, uuid),
  private.is_plan_member(uuid, uuid)
to authenticated;
revoke execute on function
  private.set_updated_at(), private.enforce_reach_monotonic(),
  private.enforce_women_only_host(), private.snap_plan_place()
from authenticated;
